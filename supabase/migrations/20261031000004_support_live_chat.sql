create or replace function public.create_support_ticket(
  _subject text,
  _category text,
  _body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ticket_id uuid;
  user_email text;
  normalized_subject text := trim(_subject);
  normalized_body text := trim(_body);
  normalized_category text := lower(trim(_category));
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(normalized_subject) not between 5 and 160 then
    raise exception 'Subject must be between 5 and 160 characters' using errcode = '22023';
  end if;
  if length(normalized_body) not between 3 and 5000 then
    raise exception 'Message must be between 3 and 5000 characters' using errcode = '22023';
  end if;
  if normalized_category not in ('account', 'deposit', 'trading', 'investment', 'other') then
    raise exception 'Choose a supported support category' using errcode = '22023';
  end if;

  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    raise exception 'Authenticated user not found' using errcode = 'P0002';
  end if;

  insert into public.support_tickets (user_id, email, subject, category, priority, status)
  values (auth.uid(), user_email, normalized_subject, normalized_category, 'normal', 'open')
  returning id into ticket_id;

  insert into public.ticket_messages (ticket_id, author_id, body, is_staff)
  values (ticket_id, auth.uid(), normalized_body, false);

  return ticket_id;
end;
$$;

create or replace function public.get_my_support_tickets()
returns table (
  id uuid,
  subject text,
  category text,
  priority text,
  status text,
  message_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    select t.id, t.subject, t.category, t.priority, t.status,
      count(m.id), t.created_at, t.updated_at
    from public.support_tickets t
    left join public.ticket_messages m on m.ticket_id = t.id
    where t.user_id = auth.uid()
    group by t.id
    order by t.updated_at desc;
end;
$$;

create or replace function public.get_my_support_messages(_ticket_id uuid)
returns table (
  id uuid,
  author_id uuid,
  body text,
  is_staff boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.support_tickets t
    where t.id = _ticket_id and t.user_id = auth.uid()
  ) then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;

  return query
    select m.id, m.author_id, m.body, m.is_staff, m.created_at
    from public.ticket_messages m
    where m.ticket_id = _ticket_id
    order by m.created_at, m.id;
end;
$$;

create or replace function public.reply_to_my_support_ticket(_ticket_id uuid, _body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  message_id uuid;
  ticket_status text;
  normalized_body text := trim(_body);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(normalized_body) not between 1 and 5000 then
    raise exception 'Message must be between 1 and 5000 characters' using errcode = '22023';
  end if;

  select t.status into ticket_status
  from public.support_tickets t
  where t.id = _ticket_id and t.user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;
  if ticket_status = 'closed' then
    raise exception 'This conversation is closed' using errcode = '55000';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, body, is_staff)
  values (_ticket_id, auth.uid(), normalized_body, false)
  returning id into message_id;

  update public.support_tickets set status = 'open', updated_at = now() where id = _ticket_id;
  return message_id;
end;
$$;

create or replace function public.admin_get_support_messages(_ticket_id uuid)
returns table (
  id uuid,
  author_id uuid,
  body text,
  is_staff boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();
  if not exists (select 1 from public.support_tickets where id = _ticket_id) then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;

  return query
    select m.id, m.author_id, m.body, m.is_staff, m.created_at
    from public.ticket_messages m
    where m.ticket_id = _ticket_id
    order by m.created_at, m.id;
end;
$$;

create or replace function public.admin_reply_support_ticket(_ticket_id uuid, _body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  message_id uuid;
  normalized_body text := trim(_body);
begin
  perform public.assert_admin();
  if length(normalized_body) not between 1 and 5000 then
    raise exception 'Message must be between 1 and 5000 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.support_tickets where id = _ticket_id for update) then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, body, is_staff)
  values (_ticket_id, auth.uid(), normalized_body, true)
  returning id into message_id;

  update public.support_tickets set status = 'open', updated_at = now() where id = _ticket_id;
  perform public.write_audit(
    'support_reply_sent',
    jsonb_build_object('ticket_id', _ticket_id),
    'support_tickets',
    _ticket_id::text
  );
  return message_id;
end;
$$;

create or replace function public.admin_set_ticket_status(_ticket_id uuid, _status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_status text := lower(trim(_status));
begin
  perform public.assert_admin();
  if normalized_status not in ('open', 'pending', 'closed') then
    raise exception 'Unsupported ticket status' using errcode = '22023';
  end if;

  update public.support_tickets
  set status = normalized_status, updated_at = now()
  where id = _ticket_id;
  if not found then
    raise exception 'Ticket not found' using errcode = 'P0002';
  end if;

  perform public.write_audit(
    'support_status_changed',
    jsonb_build_object('status', normalized_status),
    'support_tickets',
    _ticket_id::text
  );
end;
$$;

revoke all on function public.create_support_ticket(text, text, text) from public, anon;
revoke all on function public.get_my_support_tickets() from public, anon;
revoke all on function public.get_my_support_messages(uuid) from public, anon;
revoke all on function public.reply_to_my_support_ticket(uuid, text) from public, anon;
revoke all on function public.admin_get_support_messages(uuid) from public, anon;
revoke all on function public.admin_reply_support_ticket(uuid, text) from public, anon;
revoke all on function public.admin_set_ticket_status(uuid, text) from public, anon;

grant execute on function public.create_support_ticket(text, text, text) to authenticated;
grant execute on function public.get_my_support_tickets() to authenticated;
grant execute on function public.get_my_support_messages(uuid) to authenticated;
grant execute on function public.reply_to_my_support_ticket(uuid, text) to authenticated;
grant execute on function public.admin_get_support_messages(uuid) to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid, text) to authenticated;
grant execute on function public.admin_set_ticket_status(uuid, text) to authenticated;
