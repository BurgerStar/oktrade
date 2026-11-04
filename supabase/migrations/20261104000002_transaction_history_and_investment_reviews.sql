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
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    with history as (
      select r.id,
        'TX-' || upper(replace(r.id::text, '-', '')) as reference,
        r.transaction_type,
        r.summary,
        r.status,
        r.details,
        r.created_at,
        r.reviewed_at,
        r.review_note
      from public.account_transaction_requests r
      where r.user_id = auth.uid()

      union all

      select d.id,
        'DP-' || upper(replace(d.id::text, '-', '')),
        'deposit'::text,
        d.asset || ' deposit · ' || d.network,
        d.status,
        jsonb_build_object(
          'asset', d.asset,
          'network', d.network,
          'amount', d.amount,
          'tx_hash', d.tx_hash
        ),
        d.created_at,
        d.reviewed_at,
        d.review_note
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
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select r.id, r.user_id, coalesce(p.email, ''), r.transaction_type, r.summary,
      r.details, r.status, r.review_note, r.created_at, r.reviewed_at
    from public.account_transaction_requests r
    left join public.profiles p on p.id = r.user_id
    where r.transaction_type in ('earn-subscribe', 'earn-redeem')
      and (
        r.status = 'pending'
        or r.id in (
          select reviewed.id
          from public.account_transaction_requests reviewed
          where reviewed.transaction_type in ('earn-subscribe', 'earn-redeem')
            and reviewed.status <> 'pending'
          order by reviewed.reviewed_at desc
          limit 100
        )
      )
    order by (r.status = 'pending') desc, r.created_at desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

create or replace function public.admin_update_investment_plan(
  _id text,
  _name text,
  _daily_rate numeric,
  _duration_days integer,
  _minimum_amount numeric,
  _maximum_amount numeric,
  _bonus_label text,
  _featured boolean,
  _enabled boolean,
  _reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.investment_plans%rowtype;
  normalized_name text := trim(_name);
  normalized_bonus text := trim(coalesce(_bonus_label, ''));
  normalized_reason text := trim(_reason);
begin
  perform public.assert_admin();

  if _id is null or nullif(normalized_name, '') is null or length(normalized_name) > 80 then
    raise exception 'Enter a plan name between 1 and 80 characters' using errcode = '22023';
  end if;
  if _daily_rate is null or _daily_rate < 0 or _daily_rate > 100 then
    raise exception 'Daily rate must be between 0 and 100 percent' using errcode = '22023';
  end if;
  if _duration_days is null or _duration_days not between 1 and 365 then
    raise exception 'Plan duration must be between 1 and 365 days' using errcode = '22023';
  end if;
  if _minimum_amount is null or _minimum_amount < 0
    or _maximum_amount is null or _maximum_amount < _minimum_amount then
    raise exception 'Plan amount range is invalid' using errcode = '22023';
  end if;
  if length(normalized_bonus) > 120 then
    raise exception 'Bonus label cannot exceed 120 characters' using errcode = '22023';
  end if;
  if _featured is null or _enabled is null then
    raise exception 'Plan publication settings are required' using errcode = '22023';
  end if;
  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception 'Enter a reason for this plan change' using errcode = '22023';
  end if;

  update public.investment_plans
  set name = normalized_name,
      daily_rate = _daily_rate,
      duration_days = _duration_days,
      minimum_amount = _minimum_amount,
      maximum_amount = _maximum_amount,
      bonus_label = normalized_bonus,
      featured = _featured,
      enabled = _enabled,
      updated_by = auth.uid(),
      updated_at = now()
  where id = _id
  returning * into plan_row;

  if not found then
    raise exception 'Investment plan not found' using errcode = 'P0002';
  end if;

  perform public.write_audit(
    'investment_plan_updated',
    jsonb_build_object(
      'name', plan_row.name,
      'daily_rate', plan_row.daily_rate,
      'duration_days', plan_row.duration_days,
      'minimum_amount', plan_row.minimum_amount,
      'maximum_amount', plan_row.maximum_amount,
      'bonus_label', plan_row.bonus_label,
      'featured', plan_row.featured,
      'enabled', plan_row.enabled,
      'reason', left(normalized_reason, 500)
    ),
    'investment_plans'::text,
    plan_row.id
  );
end;
$$;

revoke all on function public.get_my_transaction_history(integer) from public, anon;
revoke all on function public.admin_list_investment_requests(integer) from public, anon;
revoke all on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) from public, anon;
grant execute on function public.get_my_transaction_history(integer) to authenticated;
grant execute on function public.admin_list_investment_requests(integer) to authenticated;
grant execute on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) to authenticated;

notify pgrst, 'reload schema';
