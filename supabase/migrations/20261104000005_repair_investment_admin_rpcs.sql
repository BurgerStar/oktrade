alter table public.investment_plans
  add column if not exists archived_at timestamptz;

create index if not exists investment_positions_created_id_idx
  on public.investment_positions (created_at desc, id desc);

create or replace function public.admin_list_investment_plans()
returns table (
  id text,
  name text,
  daily_rate numeric,
  duration_days integer,
  minimum_amount numeric,
  maximum_amount numeric,
  bonus_label text,
  featured boolean,
  enabled boolean,
  display_order integer,
  updated_at timestamptz,
  archived_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select p.id, p.name, p.daily_rate, p.duration_days, p.minimum_amount,
      p.maximum_amount, p.bonus_label, p.featured, p.enabled, p.display_order,
      p.updated_at, p.archived_at
    from public.investment_plans p
    where p.id not like 'system:%'
    order by (p.archived_at is not null), p.display_order, p.id;
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
    select p.id, p.user_id, coalesce(investor.email, ''), p.plan_name, p.asset,
      p.principal,
      case when p.status = 'redeemed' then 0::numeric
        else public.investment_accrued_return(
          p.principal, p.daily_rate, p.duration_days, p.started_at, pg_catalog.now()
        )
      end,
      p.daily_rate, p.duration_days, p.status, p.started_at,
      case when p.duration_days > 0
        then p.started_at + pg_catalog.make_interval(days => p.duration_days)
        else p.started_at
      end
    from public.investment_positions p
    left join auth.users investor on investor.id = p.user_id
    order by p.created_at desc, p.id desc
    limit greatest(1, least(coalesce(_limit, 200), 1000));
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
    select p.id, p.user_id, coalesce(investor.email, ''), p.plan_name, p.asset,
      p.principal,
      case when p.status = 'redeemed' then 0::numeric
        else public.investment_accrued_return(
          p.principal, p.daily_rate, p.duration_days, p.started_at, pg_catalog.now()
        )
      end,
      p.daily_rate, p.duration_days, p.status, p.started_at,
      case when p.duration_days > 0
        then p.started_at + pg_catalog.make_interval(days => p.duration_days)
        else p.started_at
      end,
      p.created_at
    from public.investment_positions p
    left join auth.users investor on investor.id = p.user_id
    where (_before_created_at is null and _before_id is null)
      or (p.created_at, p.id) < (_before_created_at, _before_id)
    order by p.created_at desc, p.id desc
    limit greatest(1, least(coalesce(_limit, 500), 1000));
end;
$$;

revoke all on function public.admin_list_investment_plans() from public, anon;
revoke all on function public.admin_list_user_investments(integer) from public, anon;
revoke all on function public.admin_list_user_investment_page(integer, timestamptz, uuid)
  from public, anon;
grant execute on function public.admin_list_investment_plans() to authenticated;
grant execute on function public.admin_list_user_investments(integer) to authenticated;
grant execute on function public.admin_list_user_investment_page(integer, timestamptz, uuid)
  to authenticated;

notify pgrst, 'reload schema';
