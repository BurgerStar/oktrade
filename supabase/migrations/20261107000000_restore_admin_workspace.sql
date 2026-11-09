create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (length(btrim(role)) > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  subject text not null check (length(trim(subject)) between 5 and 160),
  category text not null check (category in ('account', 'deposit', 'trading', 'investment', 'other')),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_updated_idx
  on public.support_tickets (user_id, updated_at desc);
create index if not exists support_tickets_status_updated_idx
  on public.support_tickets (status, updated_at desc);
create index if not exists ticket_messages_ticket_created_idx
  on public.ticket_messages (ticket_id, created_at, id);

create table if not exists public.account_state_transaction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expected_version bigint not null check (expected_version >= 0),
  transaction_type text not null check (length(trim(transaction_type)) between 1 and 64),
  summary text not null check (length(trim(summary)) between 1 and 300),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  proposed_state jsonb not null check (jsonb_typeof(proposed_state) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists account_state_transaction_requests_user_created_idx
  on public.account_state_transaction_requests (user_id, created_at desc);
create index if not exists account_state_transaction_requests_status_created_idx
  on public.account_state_transaction_requests (status, created_at desc);
create unique index if not exists account_state_transaction_requests_one_pending_per_user_idx
  on public.account_state_transaction_requests (user_id) where status = 'pending';

alter table public.account_state_transaction_requests enable row level security;
revoke all on public.account_state_transaction_requests from public, anon, authenticated;

alter table public.user_roles enable row level security;
revoke all on public.user_roles from public, anon, authenticated;

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
revoke all on public.support_tickets from public, anon, authenticated;
revoke all on public.ticket_messages from public, anon, authenticated;

create or replace function public.assert_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  ) then
    raise exception 'Access denied: Admin privileges required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.has_role(_role text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and _user_id = auth.uid()
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = _role
    );
$$;

revoke all on function public.assert_admin() from public, anon, authenticated;
revoke all on function public.has_role(text, uuid) from public, anon;
grant execute on function public.has_role(text, uuid) to authenticated;

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'active_users', (
      select count(*) from auth.users u
      where u.banned_until is null or u.banned_until <= now()
    ),
    'pending_deposits', (
      select count(*) from public.deposit_requests d where d.status = 'pending'
    ),
    'pending_transactions', (
      select count(*) from public.account_state_transaction_requests r where r.status = 'pending'
    ),
    'pending_investments', (
      select count(*) from public.investment_requests r where r.status = 'pending'
    ),
    'open_support_tickets', (
      select count(*) from public.support_tickets t where t.status <> 'closed'
    )
  );
end;
$$;

create or replace function public.admin_list_users(
  _search text default null,
  _status text default null,
  _role text default null,
  _limit integer default 25,
  _offset integer default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  is_admin boolean,
  last_active timestamptz,
  open_tickets bigint,
  order_count bigint,
  status text,
  status_reason text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  search_term text := nullif(pg_catalog.btrim(_search), '');
  status_filter text := nullif(pg_catalog.btrim(_status), '');
  role_filter text := nullif(pg_catalog.btrim(_role), '');
begin
  perform public.assert_admin();
  if status_filter not in ('active', 'suspended') and status_filter is not null then
    raise exception 'Unsupported user status filter' using errcode = '22023';
  end if;
  if role_filter not in ('user', 'admin') and role_filter is not null then
    raise exception 'Unsupported user role filter' using errcode = '22023';
  end if;

  return query
    with users as (
      select u.id,
        coalesce(u.email::text, '') as email,
        coalesce(nullif(u.raw_user_meta_data ->> 'nickname', ''),
          nullif(u.raw_user_meta_data ->> 'display_name', ''),
          u.email::text, '') as display_name,
        u.created_at,
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = u.id and ur.role = 'admin'
        ) as is_admin,
        coalesce(u.last_sign_in_at, u.created_at) as last_active,
        (u.banned_until is not null and u.banned_until > now()) as is_suspended,
        coalesce((select count(*) from public.support_tickets t
          where t.user_id = u.id and t.status <> 'closed'), 0)::bigint as open_tickets,
        coalesce((select case when jsonb_typeof(s.state -> 'orders') = 'array'
          then jsonb_array_length(s.state -> 'orders') else 0 end
          from public.account_states s where s.user_id = u.id), 0)::bigint as order_count
      from auth.users u
    ),
    filtered as (
      select u.*,
        case when u.is_suspended then 'suspended' else 'active' end as account_status
      from users u
      where (
        search_term is null
        or u.email ilike '%' || search_term || '%'
        or u.display_name ilike '%' || search_term || '%'
      )
      and (status_filter is null
        or (status_filter = 'suspended' and u.is_suspended)
        or (status_filter = 'active' and not u.is_suspended))
      and (role_filter is null
        or (role_filter = 'admin' and u.is_admin)
        or (role_filter = 'user' and not u.is_admin))
    )
    select f.id, f.email, f.display_name, f.created_at, f.is_admin, f.last_active,
      f.open_tickets, f.order_count, f.account_status, ''::text,
      count(*) over ()
    from filtered f
    order by f.created_at desc, f.id
    limit greatest(1, least(coalesce(_limit, 25), 100))
    offset greatest(0, coalesce(_offset, 0));
end;
$$;

create or replace function public.admin_set_user_status(_user uuid, _status text, _reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_status text := lower(pg_catalog.btrim(_status));
begin
  perform public.assert_admin();
  if _user is null or not exists (select 1 from auth.users where id = _user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if _user = auth.uid() and normalized_status = 'suspended' then
    raise exception 'You cannot suspend your own administrator account' using errcode = '42501';
  end if;
  if normalized_status is null or normalized_status not in ('active', 'suspended') then
    raise exception 'Unsupported user status' using errcode = '22023';
  end if;

  update auth.users
  set banned_until = case when normalized_status = 'suspended' then 'infinity'::timestamptz else null end
  where id = _user;

  perform public.write_audit(
    'user_status_changed',
    jsonb_build_object(
      'status', normalized_status,
      'reason', left(nullif(pg_catalog.btrim(_reason), ''), 500)
    ),
    'users',
    _user::text
  );
end;
$$;

create or replace function public.admin_set_admin(_user uuid, _make boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if _user is null or _make is null or not exists (select 1 from auth.users where id = _user) then
    raise exception 'User or role setting is invalid' using errcode = '22023';
  end if;
  if _user = auth.uid() and not _make then
    raise exception 'You cannot remove your own administrator role' using errcode = '42501';
  end if;
  if not _make
    and exists (select 1 from public.user_roles where user_id = _user and role = 'admin')
    and exists (
    select 1
    from public.user_roles ur
    join auth.users u on u.id = ur.user_id
    where ur.role = 'admin'
      and (u.banned_until is null or u.banned_until <= now())
    group by ur.role
    having count(*) <= 1
  ) then
    raise exception 'The last active administrator cannot be removed' using errcode = '55000';
  end if;

  if _make then
    insert into public.user_roles (user_id, role)
    values (_user, 'admin')
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = _user and role = 'admin';
  end if;

  perform public.write_audit(
    'admin_role_changed',
    jsonb_build_object('is_admin', _make),
    'users',
    _user::text
  );
end;
$$;

create or replace function public.admin_list_deposit_requests()
returns table (
  id uuid,
  user_id uuid,
  email text,
  asset text,
  network text,
  amount numeric,
  tx_hash text,
  status text,
  review_note text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select d.id, d.user_id, coalesce(u.email::text, ''), d.asset, d.network, d.amount,
      d.tx_hash, d.status, d.review_note, d.created_at, d.reviewed_at
    from public.deposit_requests d
    left join auth.users u on u.id = d.user_id
    order by (d.status = 'pending') desc, d.created_at desc;
end;
$$;

create or replace function public.admin_list_visitor_activity(_limit integer default 100)
returns table (
  id uuid,
  email text,
  display_name text,
  country_of_residence text,
  route_id text,
  visited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select v.id, coalesce(u.email::text, ''),
      coalesce(nullif(u.raw_user_meta_data ->> 'nickname', ''),
        nullif(u.raw_user_meta_data ->> 'display_name', ''), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'country_of_residence'), ''),
      v.route_id, v.visited_at
    from public.account_page_visits v
    join auth.users u on u.id = v.user_id
    order by v.visited_at desc, v.id desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

create or replace function public.admin_list_tickets(
  _search text default null,
  _status text default null
)
returns table (
  id uuid,
  category text,
  created_at timestamptz,
  email text,
  last_from_staff boolean,
  message_count bigint,
  priority text,
  status text,
  subject text,
  updated_at timestamptz,
  user_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  search_term text := nullif(pg_catalog.btrim(_search), '');
  status_filter text := nullif(pg_catalog.btrim(_status), '');
begin
  perform public.assert_admin();
  if status_filter not in ('open', 'pending', 'closed') and status_filter is not null then
    raise exception 'Unsupported support ticket status' using errcode = '22023';
  end if;
  return query
    select t.id, t.category, t.created_at, coalesce(nullif(t.email, ''), u.email::text, ''),
      coalesce(last_message.is_staff, false), count(m.id), t.priority, t.status, t.subject,
      t.updated_at, t.user_id
    from public.support_tickets t
    left join auth.users u on u.id = t.user_id
    left join public.ticket_messages m on m.ticket_id = t.id
    left join lateral (
      select tm.is_staff
      from public.ticket_messages tm
      where tm.ticket_id = t.id
      order by tm.created_at desc, tm.id desc
      limit 1
    ) last_message on true
    where (search_term is null or t.subject ilike '%' || search_term || '%'
      or coalesce(nullif(t.email, ''), u.email::text, '') ilike '%' || search_term || '%')
      and (status_filter is null or t.status = status_filter)
    group by t.id, u.email, last_message.is_staff
    order by t.updated_at desc, t.id
    limit 200;
end;
$$;

create or replace function public.admin_list_investment_positions_for_user(
  _user_id uuid,
  _limit integer default 500,
  _before_created_at timestamptz default null,
  _before_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  plan_name text,
  asset text,
  principal numeric,
  accrued_return numeric,
  daily_rate numeric,
  duration_days integer,
  status text,
  started_at timestamptz,
  redeemable_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if _user_id is null then
    raise exception 'Select a user to view investment positions' using errcode = '22023';
  end if;
  if (_before_created_at is null) <> (_before_id is null) then
    raise exception 'Both investment pagination cursor values are required'
      using errcode = '22023';
  end if;

  return query
    select p.id, p.user_id, coalesce(u.email::text, ''), p.plan_name, p.asset, p.principal,
      case when p.status = 'redeemed' then 0::numeric
        else public.investment_accrued_return(
          p.principal, p.daily_rate, p.duration_days, p.started_at, now()
        )
      end,
      p.daily_rate, p.duration_days, p.status, p.started_at,
      case when p.duration_days > 0
        then p.started_at + pg_catalog.make_interval(days => p.duration_days)
        else p.started_at
      end,
      p.created_at
    from public.investment_positions p
    left join auth.users u on u.id = p.user_id
    where p.user_id = _user_id
      and (
        (_before_created_at is null and _before_id is null)
        or (p.created_at, p.id) < (_before_created_at, _before_id)
      )
    order by p.created_at desc, p.id desc
    limit greatest(1, least(coalesce(_limit, 500), 1000));
end;
$$;

create or replace function public.submit_account_transaction(
  _expected_version bigint,
  _transaction_type text,
  _summary text,
  _details jsonb,
  _proposed_state jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id uuid;
  normalized_type text := pg_catalog.btrim(_transaction_type);
  normalized_summary text := pg_catalog.btrim(_summary);
  account_row public.account_states%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _expected_version is null or _expected_version < 0 then
    raise exception 'Account version is invalid; refresh and try again' using errcode = '22023';
  end if;
  if normalized_type is null or length(normalized_type) not between 1 and 64
    or normalized_summary is null or length(normalized_summary) not between 1 and 300 then
    raise exception 'Transaction details are invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(_details) is distinct from 'object'
    or jsonb_typeof(_proposed_state) is distinct from 'object'
    or pg_column_size(_details) > 65536
    or pg_column_size(_proposed_state) > 1048576 then
    raise exception 'Transaction data is invalid or too large' using errcode = '22023';
  end if;
  if _proposed_state #>> '{user,uid}' is distinct from auth.uid()::text
    or jsonb_typeof(_proposed_state -> 'balances') is distinct from 'object'
    or jsonb_typeof(_proposed_state -> 'orders') is distinct from 'array'
    or jsonb_typeof(_proposed_state -> 'positions') is distinct from 'array'
    or jsonb_typeof(_proposed_state -> 'activity') is distinct from 'array' then
    raise exception 'Proposed account state is malformed' using errcode = '22023';
  end if;

  perform public.get_my_account_state();
  select * into account_row
  from public.account_states
  where user_id = auth.uid()
  for update;
  if account_row.version <> _expected_version then
    raise exception 'Account state changed. Refresh your account and try again.' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.account_state_transaction_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'A transaction is already awaiting administrator approval' using errcode = '55000';
  end if;

  insert into public.account_state_transaction_requests (
    user_id, expected_version, transaction_type, summary, details, proposed_state
  ) values (
    auth.uid(), _expected_version, normalized_type, normalized_summary, _details, _proposed_state
  ) returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.get_my_account_transaction_requests()
returns table (
  id uuid,
  transaction_type text,
  summary text,
  status text,
  review_note text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return query
    select r.id, r.transaction_type, r.summary, r.status, r.review_note,
      r.created_at, r.reviewed_at
    from public.account_state_transaction_requests r
    where r.user_id = auth.uid()
    order by r.created_at desc
    limit 100;
end;
$$;

create or replace function public.admin_list_account_transaction_requests()
returns table (
  id uuid,
  user_id uuid,
  email text,
  transaction_type text,
  summary text,
  details jsonb,
  status text,
  review_note text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select r.id, r.user_id, coalesce(u.email::text, ''), r.transaction_type, r.summary,
      r.details, r.status, r.review_note, r.created_at, r.reviewed_at
    from public.account_state_transaction_requests r
    left join auth.users u on u.id = r.user_id
    where r.status = 'pending'
      or r.id in (
        select reviewed.id
        from public.account_state_transaction_requests reviewed
        where reviewed.status <> 'pending'
        order by reviewed.reviewed_at desc
        limit 100
      )
    order by (r.status = 'pending') desc, r.created_at desc;
end;
$$;

create or replace function public.admin_review_account_transaction(
  _request_id uuid,
  _approve boolean,
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.account_state_transaction_requests%rowtype;
  account_row public.account_states%rowtype;
  next_status text;
begin
  perform public.assert_admin();
  if _approve is null then
    raise exception 'Choose whether to approve or reject this request' using errcode = '22023';
  end if;
  select * into request_row
  from public.account_state_transaction_requests
  where id = _request_id
  for update;
  if not found then
    raise exception 'Transaction request not found' using errcode = 'P0002';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Transaction request has already been reviewed' using errcode = '55000';
  end if;

  next_status := case when _approve then 'approved' else 'rejected' end;
  if _approve then
    select * into account_row
    from public.account_states
    where user_id = request_row.user_id
    for update;
    if not found or account_row.version <> request_row.expected_version then
      raise exception 'Account state changed; request cannot be approved. Ask the user to resubmit.'
        using errcode = '40001';
    end if;
    update public.account_states
    set state = request_row.proposed_state, version = version + 1, updated_at = now()
    where user_id = request_row.user_id;
  end if;

  update public.account_state_transaction_requests
  set status = next_status, review_note = left(nullif(pg_catalog.btrim(_note), ''), 500),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = _request_id;
  perform public.write_audit(
    case when _approve then 'account_transaction_approved' else 'account_transaction_rejected' end,
    jsonb_build_object(
      'type', request_row.transaction_type,
      'summary', request_row.summary,
      'note', nullif(pg_catalog.btrim(_note), '')
    ),
    'account_state_transaction_requests',
    _request_id::text
  );
end;
$$;

create or replace function public.get_my_transaction_history(_limit integer default 200)
returns table (
  id uuid,
  reference text,
  transaction_type text,
  summary text,
  status text,
  details jsonb,
  created_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return query
    with history as (
      select old_request.id,
        'TX-' || upper(replace(old_request.id::text, '-', '')) as reference,
        old_request.transaction_type,
        coalesce(old_request.details ->> 'summary',
          old_request.transaction_type || ' ' || old_request.amount::text) as summary,
        old_request.status, old_request.details, old_request.created_at,
        null::timestamptz as reviewed_at, null::text as review_note
      from public.account_transaction_requests old_request
      where old_request.user_id = auth.uid()
      union all
      select r.id, 'TX-' || upper(replace(r.id::text, '-', '')), r.transaction_type,
        r.summary, r.status, r.details, r.created_at, r.reviewed_at, r.review_note
      from public.account_state_transaction_requests r
      where r.user_id = auth.uid()
      union all
      select d.id, 'DP-' || upper(replace(d.id::text, '-', '')),
        'deposit'::text, d.asset || ' deposit · ' || d.network, d.status,
        jsonb_build_object(
          'asset', d.asset, 'network', d.network, 'amount', d.amount, 'tx_hash', d.tx_hash
        ),
        d.created_at, d.reviewed_at, d.review_note
      from public.deposit_requests d
      where d.user_id = auth.uid()
    )
    select h.id, h.reference, h.transaction_type, h.summary, h.status, h.details,
      h.created_at, h.reviewed_at, h.review_note
    from history h
    order by h.created_at desc, h.id desc
    limit greatest(1, least(coalesce(_limit, 200), 500));
end;
$$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon;
revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke all on function public.admin_list_deposit_requests() from public, anon;
revoke all on function public.admin_list_visitor_activity(integer) from public, anon;
revoke all on function public.admin_list_tickets(text, text) from public, anon;
revoke all on function public.admin_list_investment_positions_for_user(uuid, integer, timestamptz, uuid)
  from public, anon;
revoke all on function public.submit_account_transaction(bigint, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.get_my_account_transaction_requests() from public, anon;
revoke all on function public.admin_list_account_transaction_requests() from public, anon;
revoke all on function public.admin_review_account_transaction(uuid, boolean, text) from public, anon;
revoke all on function public.get_my_transaction_history(integer) from public, anon;

grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_list_deposit_requests() to authenticated;
grant execute on function public.admin_list_visitor_activity(integer) to authenticated;
grant execute on function public.admin_list_tickets(text, text) to authenticated;
grant execute on function public.admin_list_investment_positions_for_user(uuid, integer, timestamptz, uuid)
  to authenticated;
grant execute on function public.submit_account_transaction(bigint, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.get_my_account_transaction_requests() to authenticated;
grant execute on function public.admin_list_account_transaction_requests() to authenticated;
grant execute on function public.admin_review_account_transaction(uuid, boolean, text) to authenticated;
grant execute on function public.get_my_transaction_history(integer) to authenticated;
grant execute on function public.create_support_ticket(text, text, text) to authenticated;
grant execute on function public.get_my_support_tickets() to authenticated;
grant execute on function public.get_my_support_messages(uuid) to authenticated;
grant execute on function public.reply_to_my_support_ticket(uuid, text) to authenticated;
grant execute on function public.admin_get_support_messages(uuid) to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid, text) to authenticated;
grant execute on function public.admin_set_ticket_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
