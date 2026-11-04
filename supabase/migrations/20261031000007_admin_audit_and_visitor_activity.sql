create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_at_idx
  on public.admin_audit (created_at desc);
create index if not exists admin_audit_entity_created_at_idx
  on public.admin_audit (entity, created_at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create or replace function public.write_audit(
  _action text,
  _details jsonb,
  _entity text,
  _entity_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  if nullif(trim(_action), '') is null
    or nullif(trim(_entity), '') is null
    or nullif(trim(_entity_id), '') is null
    or jsonb_typeof(coalesce(_details, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'Audit event is invalid' using errcode = '22023';
  end if;

  insert into public.admin_audit (actor_id, action, entity, entity_id, details)
  values (auth.uid(), trim(_action), trim(_entity), trim(_entity_id), coalesce(_details, '{}'::jsonb));
end;
$$;

create or replace function public.admin_list_audit(
  _entity text default 'all',
  _limit integer default 50
)
returns table (
  id uuid,
  action text,
  actor_email text,
  created_at timestamptz,
  details jsonb,
  entity text,
  entity_id text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select a.id, a.action, coalesce(u.email, ''), a.created_at, a.details, a.entity, a.entity_id
    from public.admin_audit a
    left join auth.users u on u.id = a.actor_id
    where coalesce(nullif(trim(_entity), ''), 'all') = 'all'
      or a.entity = trim(_entity)
    order by a.created_at desc
    limit greatest(1, least(coalesce(_limit, 50), 200));
end;
$$;

create table if not exists public.account_page_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null check (length(route_id) between 1 and 200),
  country_of_residence text,
  visited_at timestamptz not null default now()
);

create index if not exists account_page_visits_visited_at_idx
  on public.account_page_visits (visited_at desc);
create index if not exists account_page_visits_user_visited_at_idx
  on public.account_page_visits (user_id, visited_at desc);

alter table public.account_page_visits enable row level security;
revoke all on public.account_page_visits from anon, authenticated;

create or replace function public.record_my_page_visit(_route_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _route_id is null
    or length(_route_id) > 200
    or _route_id !~ '^/[[:alnum:]_/$.,{}-]*$' then
    raise exception 'Page activity is invalid' using errcode = '22023';
  end if;

  insert into public.account_page_visits (user_id, route_id, country_of_residence)
  select auth.uid(),
    _route_id,
    nullif(trim(u.raw_user_meta_data ->> 'country_of_residence'), '')
  from auth.users u
  where u.id = auth.uid();

  if not found then
    raise exception 'Authenticated user not found' using errcode = 'P0002';
  end if;

  delete from public.account_page_visits v
  where v.user_id = auth.uid()
    and v.id in (
      select old_visit.id
      from public.account_page_visits old_visit
      where old_visit.user_id = auth.uid()
      order by old_visit.visited_at desc, old_visit.id desc
      offset 500
    );
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
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select v.id, coalesce(p.email, u.email, ''), coalesce(p.display_name, ''),
      v.country_of_residence, v.route_id, v.visited_at
    from public.account_page_visits v
    join auth.users u on u.id = v.user_id
    left join public.profiles p on p.id = v.user_id
    order by v.visited_at desc, v.id desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

revoke all on function public.write_audit(text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_audit(text, integer) from public, anon;
revoke all on function public.record_my_page_visit(text) from public, anon;
revoke all on function public.admin_list_visitor_activity(integer) from public, anon;

grant execute on function public.admin_list_audit(text, integer) to authenticated;
grant execute on function public.record_my_page_visit(text) to authenticated;
grant execute on function public.admin_list_visitor_activity(integer) to authenticated;
