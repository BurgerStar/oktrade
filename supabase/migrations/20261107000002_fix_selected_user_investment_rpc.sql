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

revoke all on function public.admin_list_investment_positions_for_user(uuid, integer, timestamptz, uuid)
  from public, anon;
grant execute on function public.admin_list_investment_positions_for_user(uuid, integer, timestamptz, uuid)
  to authenticated;

notify pgrst, 'reload schema';
