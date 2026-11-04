create table if not exists public.investment_plans (
  id text primary key,
  name text not null,
  daily_rate numeric(8, 4) not null check (daily_rate >= 0 and daily_rate <= 100),
  duration_days integer not null check (duration_days between 1 and 365),
  minimum_amount numeric(38, 18) not null check (minimum_amount >= 0),
  maximum_amount numeric(38, 18) not null check (maximum_amount >= minimum_amount),
  bonus_label text not null default '',
  featured boolean not null default false,
  enabled boolean not null default true,
  display_order integer not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.investment_plans enable row level security;
revoke all on public.investment_plans from anon, authenticated;

insert into public.investment_plans
  (id, name, daily_rate, duration_days, minimum_amount, maximum_amount, bonus_label, featured, display_order)
values
  ('basic', 'Basic plan', 2, 5, 100, 4999, '10% bonus', false, 1),
  ('advanced', 'Advanced plan', 2.5, 5, 5000, 9999, '10% bonus', false, 2),
  ('gold', 'Gold plan', 3, 5, 10000, 19000, '10% bonus', true, 3),
  ('diamond', 'Diamond plan', 4, 5, 20000, 49999, 'Unlimited 10% bonus', false, 4)
on conflict (id) do nothing;

create or replace function public.public_investment_plans()
returns table (
  id text,
  name text,
  daily_rate numeric,
  duration_days integer,
  minimum_amount numeric,
  maximum_amount numeric,
  bonus_label text,
  featured boolean,
  display_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.daily_rate, p.duration_days, p.minimum_amount,
    p.maximum_amount, p.bonus_label, p.featured, p.display_order
  from public.investment_plans p
  where p.enabled
  order by p.display_order, p.id;
$$;

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
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();
  return query
    select p.id, p.name, p.daily_rate, p.duration_days, p.minimum_amount,
      p.maximum_amount, p.bonus_label, p.featured, p.enabled, p.display_order, p.updated_at
    from public.investment_plans p
    order by p.display_order, p.id;
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

revoke all on function public.public_investment_plans() from public;
revoke all on function public.admin_list_investment_plans() from public, anon;
revoke all on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) from public, anon;

grant execute on function public.public_investment_plans() to anon, authenticated;
grant execute on function public.admin_list_investment_plans() to authenticated;
grant execute on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) to authenticated;

notify pgrst, 'reload schema';
