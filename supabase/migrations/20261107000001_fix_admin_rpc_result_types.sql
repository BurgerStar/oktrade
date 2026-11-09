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
      f.open_tickets, f.order_count, f.account_status, ''::text, count(*) over ()
    from filtered f
    order by f.created_at desc, f.id
    limit greatest(1, least(coalesce(_limit, 25), 100))
    offset greatest(0, coalesce(_offset, 0));
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

create or replace function public.admin_list_user_investment_page(
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
    where (_before_created_at is null and _before_id is null)
      or (p.created_at, p.id) < (_before_created_at, _before_id)
    order by p.created_at desc, p.id desc
    limit greatest(1, least(coalesce(_limit, 500), 1000));
end;
$$;

create or replace function public.admin_list_user_investments(_limit integer default 200)
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
  redeemable_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
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
      end
    from public.investment_positions p
    left join auth.users u on u.id = p.user_id
    order by p.created_at desc, p.id desc
    limit greatest(1, least(coalesce(_limit, 200), 1000));
end;
$$;

create or replace function public.admin_list_investment_requests(_limit integer default 100)
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
    select r.id, r.user_id, coalesce(u.email::text, ''),
      'investment-' || r.request_type,
      r.plan_name || case when r.request_type = 'subscribe'
        then ' subscription request'
        else ' redemption request'
      end,
      jsonb_build_object(
        'request_type', r.request_type,
        'plan_name', r.plan_name,
        'amount', r.amount,
        'asset', r.asset,
        'daily_rate', r.daily_rate,
        'duration_days', r.duration_days,
        'position_id', r.position_id,
        'accrued_return', case when r.request_type = 'redeem' then
          public.investment_accrued_return(
            r.amount, r.daily_rate, r.duration_days, coalesce(p.started_at, r.created_at), now()
          )
          else 0
        end
      ),
      r.status, r.review_note, r.created_at, r.reviewed_at
    from public.investment_requests r
    left join auth.users u on u.id = r.user_id
    left join public.investment_positions p on p.id = r.position_id
    where r.status = 'pending'
      or r.id in (
        select reviewed.id
        from public.investment_requests reviewed
        where reviewed.status <> 'pending'
        order by reviewed.reviewed_at desc
        limit 100
      )
    order by (r.status = 'pending') desc, r.created_at desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
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
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select a.id, a.action, coalesce(u.email::text, ''), a.created_at, a.details,
      a.entity, a.entity_id
    from public.admin_audit a
    left join auth.users u on u.id = a.actor_id
    where coalesce(nullif(pg_catalog.btrim(_entity), ''), 'all') = 'all'
      or a.entity = pg_catalog.btrim(_entity)
    order by a.created_at desc
    limit greatest(1, least(coalesce(_limit, 50), 200));
end;
$$;

create or replace function public.admin_list_user_activity(_limit integer default 100)
returns table (
  id uuid,
  email text,
  display_name text,
  country_of_residence text,
  status text,
  created_at timestamptz,
  last_active timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select u.id, coalesce(u.email::text, ''),
      coalesce(nullif(u.raw_user_meta_data ->> 'nickname', ''),
        nullif(u.raw_user_meta_data ->> 'display_name', ''), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'country_of_residence'), ''),
      case when u.banned_until is not null and u.banned_until > now()
        then 'suspended' else 'active' end,
      u.created_at, coalesce(u.last_sign_in_at, u.created_at)
    from auth.users u
    order by u.last_sign_in_at desc nulls last, u.created_at desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon;
revoke all on function public.admin_list_deposit_requests() from public, anon;
revoke all on function public.admin_list_visitor_activity(integer) from public, anon;
revoke all on function public.admin_list_account_transaction_requests() from public, anon;
revoke all on function public.admin_list_user_investment_page(integer, timestamptz, uuid)
  from public, anon;
revoke all on function public.admin_list_user_investments(integer) from public, anon;
revoke all on function public.admin_list_investment_requests(integer) from public, anon;
revoke all on function public.admin_list_audit(text, integer) from public, anon;
revoke all on function public.admin_list_user_activity(integer) from public, anon;

grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_deposit_requests() to authenticated;
grant execute on function public.admin_list_visitor_activity(integer) to authenticated;
grant execute on function public.admin_list_account_transaction_requests() to authenticated;
grant execute on function public.admin_list_user_investment_page(integer, timestamptz, uuid)
  to authenticated;
grant execute on function public.admin_list_user_investments(integer) to authenticated;
grant execute on function public.admin_list_investment_requests(integer) to authenticated;
grant execute on function public.admin_list_audit(text, integer) to authenticated;
grant execute on function public.admin_list_user_activity(integer) to authenticated;

notify pgrst, 'reload schema';
