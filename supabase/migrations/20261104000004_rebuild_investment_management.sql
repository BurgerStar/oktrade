create table if not exists public.investment_plans (
  id text primary key,
  name text not null,
  daily_rate numeric(8, 4) not null check (daily_rate >= 0 and daily_rate <= 100),
  duration_days integer not null check (duration_days between 0 and 365),
  minimum_amount numeric(38, 18) not null check (minimum_amount >= 0),
  maximum_amount numeric(38, 18) not null check (maximum_amount >= minimum_amount),
  bonus_label text not null default '',
  featured boolean not null default false,
  enabled boolean not null default true,
  display_order integer not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.investment_plans
  add column if not exists archived_at timestamptz;
alter table public.investment_plans
  drop constraint if exists investment_plans_duration_days_check;
alter table public.investment_plans
  add constraint investment_plans_duration_days_check check (duration_days between 0 and 365);

create table if not exists public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.investment_plans(id) on delete restrict,
  legacy_source_id text,
  plan_name text not null,
  asset text not null default 'USDT',
  principal numeric(38, 18) not null check (principal > 0),
  daily_rate numeric(12, 8) not null check (daily_rate >= 0 and daily_rate <= 100),
  duration_days integer not null check (duration_days between 0 and 365),
  status text not null default 'active'
    check (status in ('active', 'redemption_pending', 'redeemed')),
  started_at timestamptz not null default now(),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'redeemed') = (redeemed_at is not null))
);

create unique index if not exists investment_positions_legacy_source_idx
  on public.investment_positions (user_id, legacy_source_id)
  where legacy_source_id is not null;
create index if not exists investment_positions_user_created_idx
  on public.investment_positions (user_id, created_at desc);
create index if not exists investment_positions_status_created_idx
  on public.investment_positions (status, created_at desc);

create table if not exists public.investment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('subscribe', 'redeem')),
  plan_id text not null references public.investment_plans(id) on delete restrict,
  position_id uuid references public.investment_positions(id) on delete restrict,
  plan_name text not null,
  asset text not null default 'USDT',
  amount numeric(38, 18) not null check (amount > 0),
  daily_rate numeric(12, 8) not null check (daily_rate >= 0 and daily_rate <= 100),
  duration_days integer not null check (duration_days between 0 and 365),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (
    (request_type = 'subscribe' and position_id is null)
    or (request_type = 'redeem' and position_id is not null)
  ),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists investment_requests_status_created_idx
  on public.investment_requests (status, created_at desc);
create index if not exists investment_requests_user_created_idx
  on public.investment_requests (user_id, created_at desc);

create table if not exists public.investment_system_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

alter table public.investment_plans enable row level security;
alter table public.investment_positions enable row level security;
alter table public.investment_requests enable row level security;
alter table public.investment_system_migrations enable row level security;
revoke all on public.investment_plans from public, anon, authenticated;
revoke all on public.investment_positions from public, anon, authenticated;
revoke all on public.investment_requests from public, anon, authenticated;
revoke all on public.investment_system_migrations from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from public.investment_system_migrations
    where version = '20261104000004'
  ) then
    insert into public.investment_plans (
      id, name, daily_rate, duration_days, minimum_amount, maximum_amount,
      bonus_label, featured, enabled, display_order, archived_at
    )
    select distinct
      'legacy-' || md5(concat_ws('|',
        coalesce(item ->> 'product', 'Legacy Earn'),
        coalesce(item ->> 'ccy', 'USDT'),
        coalesce(item ->> 'apr', '0'),
        coalesce(item ->> 'termDays', '0')
      )),
      left(coalesce(nullif(item ->> 'product', ''), 'Legacy Earn'), 80),
      least(100, greatest(0, ((item ->> 'apr')::numeric * 100 / 365))),
      least(365, greatest(0, coalesce((item ->> 'termDays')::integer, 0))),
      0,
      999999999999,
      'Migrated legacy position',
      false,
      false,
      -1,
      now()
    from public.account_states s
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.state -> 'earn') = 'array'
        then s.state -> 'earn'
        else '[]'::jsonb
      end
    ) item
    where jsonb_typeof(item) = 'object'
      and jsonb_typeof(item -> 'amount') = 'number'
      and jsonb_typeof(item -> 'apr') = 'number'
      and (item ->> 'amount')::numeric > 0
      and (item ->> 'apr')::numeric >= 0
    on conflict (id) do nothing;

    insert into public.investment_positions (
      user_id, plan_id, legacy_source_id, plan_name, asset, principal,
      daily_rate, duration_days, status, started_at
    )
    select
      s.user_id,
      'legacy-' || md5(concat_ws('|',
        coalesce(item ->> 'product', 'Legacy Earn'),
        coalesce(item ->> 'ccy', 'USDT'),
        coalesce(item ->> 'apr', '0'),
        coalesce(item ->> 'termDays', '0')
      )),
      coalesce(item ->> 'id', md5(item::text)),
      left(coalesce(nullif(item ->> 'product', ''), 'Legacy Earn'), 80),
      coalesce(nullif(upper(item ->> 'ccy'), ''), 'USDT'),
      (item ->> 'amount')::numeric,
      least(100, greatest(0, ((item ->> 'apr')::numeric * 100 / 365))),
      least(365, greatest(0, coalesce((item ->> 'termDays')::integer, 0))),
      'active',
      case
        when jsonb_typeof(item -> 'startedAt') = 'number'
          then to_timestamp((item ->> 'startedAt')::numeric / 1000)
        else now()
      end
    from public.account_states s
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.state -> 'earn') = 'array'
        then s.state -> 'earn'
        else '[]'::jsonb
      end
    ) item
    where jsonb_typeof(item) = 'object'
      and jsonb_typeof(item -> 'amount') = 'number'
      and jsonb_typeof(item -> 'apr') = 'number'
      and (item ->> 'amount')::numeric > 0
      and (item ->> 'apr')::numeric >= 0
    on conflict (user_id, legacy_source_id)
      where legacy_source_id is not null do nothing;

    update public.account_states s
    set state = jsonb_set(
      jsonb_set(
        s.state,
        '{earn}',
        '[]'::jsonb,
        true
      ),
      '{activity}',
      coalesce((
        select jsonb_agg(entry.value order by entry.ordinality)
        from jsonb_array_elements(
          case when jsonb_typeof(s.state -> 'activity') = 'array'
            then s.state -> 'activity'
            else '[]'::jsonb
          end
        ) with ordinality as entry(value, ordinality)
        where entry.value ->> 'type' is distinct from 'earn-subscribe'
          and entry.value ->> 'type' is distinct from 'earn-redeem'
      ), '[]'::jsonb),
      true
    ),
        version = version + 1,
        updated_at = now()
    where jsonb_typeof(s.state -> 'earn') = 'array'
      and (
        jsonb_array_length(s.state -> 'earn') > 0
        or exists (
          select 1
          from jsonb_array_elements(
            case when jsonb_typeof(s.state -> 'activity') = 'array'
              then s.state -> 'activity'
              else '[]'::jsonb
            end
          ) activity
          where activity ->> 'type' in ('earn-subscribe', 'earn-redeem')
        )
      );

    delete from public.account_transaction_requests
    where transaction_type in ('earn-subscribe', 'earn-redeem');

    delete from public.investment_plans
    where id not like 'legacy-%';

    insert into public.investment_plans (
      id, name, daily_rate, duration_days, minimum_amount, maximum_amount,
      bonus_label, featured, enabled, display_order
    )
    values
      ('basic', 'Basic plan', 2, 5, 100, 4999, '10% bonus', false, true, 1),
      ('advanced', 'Advanced plan', 2.5, 5, 5000, 9999, '10% bonus', false, true, 2),
      ('gold', 'Gold plan', 3, 5, 10000, 19000, '10% bonus', true, true, 3),
      ('diamond', 'Diamond plan', 4, 5, 20000, 49999, 'Unlimited 10% bonus', false, true, 4),
      ('system:jumpstart:usdt', 'Jumpstart stake · USDT', 0, 7, 0.00000001, 999999999999, 'Internal fixed-term stake', false, false, -2),
      ('system:jumpstart:okb', 'Jumpstart stake · OKB', 0, 7, 0.00000001, 999999999999, 'Internal fixed-term stake', false, false, -2)
    on conflict (id) do nothing;

    insert into public.investment_system_migrations (version)
    values ('20261104000004');
  end if;
end;
$$;

create or replace function public.investment_accrued_return(
  _principal numeric,
  _daily_rate numeric,
  _duration_days integer,
  _started_at timestamptz,
  _as_of timestamptz default now()
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select greatest(0, _principal)
    * greatest(0, _daily_rate)
    / 100
    * least(
      greatest(0, extract(epoch from (_as_of - _started_at)) / 86400),
      case when _duration_days > 0
        then _duration_days::numeric
        else greatest(0, extract(epoch from (_as_of - _started_at)) / 86400)
      end
    );
$$;

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
  where p.enabled and p.archived_at is null and p.id not like 'system:%'
  order by p.display_order, p.id;
$$;

drop function if exists public.admin_list_investment_plans();
create function public.admin_list_investment_plans()
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
set search_path = public, pg_temp
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

create or replace function public.admin_create_investment_plan(
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
returns text
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

  if normalized_name is null or length(normalized_name) not between 1 and 80 then
    raise exception 'Enter a plan name between 1 and 80 characters' using errcode = '22023';
  end if;
  if _daily_rate is null or _daily_rate < 0 or _daily_rate > 100 then
    raise exception 'Daily rate must be between 0 and 100 percent' using errcode = '22023';
  end if;
  if _duration_days is null or _duration_days not between 1 and 365 then
    raise exception 'Plan duration must be between 1 and 365 days' using errcode = '22023';
  end if;
  if _minimum_amount is null or _minimum_amount <= 0
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

  insert into public.investment_plans (
    id, name, daily_rate, duration_days, minimum_amount, maximum_amount,
    bonus_label, featured, enabled, display_order, updated_by, updated_at
  )
  values (
    gen_random_uuid()::text, normalized_name, _daily_rate, _duration_days,
    _minimum_amount, _maximum_amount, normalized_bonus, _featured, _enabled,
    coalesce((select max(p.display_order) + 1 from public.investment_plans p
      where p.archived_at is null), 1),
    auth.uid(), now()
  )
  returning * into plan_row;

  perform public.write_audit(
    'investment_plan_created',
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
  return plan_row.id;
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

  if _id is null or normalized_name is null or length(normalized_name) not between 1 and 80 then
    raise exception 'Enter a plan name between 1 and 80 characters' using errcode = '22023';
  end if;
  if _daily_rate is null or _daily_rate < 0 or _daily_rate > 100 then
    raise exception 'Daily rate must be between 0 and 100 percent' using errcode = '22023';
  end if;
  if _duration_days is null or _duration_days not between 1 and 365 then
    raise exception 'Plan duration must be between 1 and 365 days' using errcode = '22023';
  end if;
  if _minimum_amount is null or _minimum_amount <= 0
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
  where id = _id and archived_at is null
  returning * into plan_row;

  if not found then
    raise exception 'Investment plan not found or archived' using errcode = 'P0002';
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

create or replace function public.admin_archive_investment_plan(_id text, _reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.investment_plans%rowtype;
  normalized_reason text := trim(_reason);
begin
  perform public.assert_admin();
  if normalized_reason is null or length(normalized_reason) < 3 then
    raise exception 'Enter a reason for archiving this plan' using errcode = '22023';
  end if;

  update public.investment_plans
  set enabled = false,
      archived_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = _id and archived_at is null
  returning * into plan_row;

  if not found then
    raise exception 'Investment plan not found or already archived' using errcode = 'P0002';
  end if;

  perform public.write_audit(
    'investment_plan_archived',
    jsonb_build_object('name', plan_row.name, 'reason', left(normalized_reason, 500)),
    'investment_plans'::text,
    plan_row.id
  );
end;
$$;

create or replace function public.get_my_investment_portfolio()
returns table (
  id uuid,
  plan_id text,
  plan_name text,
  asset text,
  principal numeric,
  daily_rate numeric,
  duration_days integer,
  status text,
  started_at timestamptz,
  accrued_return numeric,
  redeemable_at timestamptz
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
    select p.id, p.plan_id, p.plan_name, p.asset, p.principal, p.daily_rate,
      p.duration_days, p.status, p.started_at,
      case when p.status = 'redeemed' then 0::numeric
        else public.investment_accrued_return(
          p.principal, p.daily_rate, p.duration_days, p.started_at, now()
        )
      end,
      case when p.duration_days > 0
        then p.started_at + make_interval(days => p.duration_days)
        else p.started_at
      end
    from public.investment_positions p
    where p.user_id = auth.uid()
    order by p.created_at desc
    limit 500;
end;
$$;

create or replace function public.get_my_investment_requests(_limit integer default 100)
returns table (
  id uuid,
  request_type text,
  plan_name text,
  amount numeric,
  asset text,
  status text,
  review_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reference text
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
    select r.id, r.request_type, r.plan_name, r.amount, r.asset, r.status,
      r.review_note, r.created_at, r.reviewed_at,
      'IV-' || upper(replace(r.id::text, '-', ''))
    from public.investment_requests r
    where r.user_id = auth.uid()
    order by r.created_at desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

create or replace function public.request_investment_subscription(_plan_id text, _amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_row public.investment_plans%rowtype;
  request_id uuid;
  available_balance numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Enter an amount greater than zero' using errcode = '22023';
  end if;

  select * into plan_row
  from public.investment_plans
  where id = _plan_id and enabled and archived_at is null;
  if not found then
    raise exception 'This investment plan is no longer available' using errcode = 'P0002';
  end if;
  if _amount < plan_row.minimum_amount or _amount > plan_row.maximum_amount then
    raise exception 'Amount is outside this plan’s published limits' using errcode = '22023';
  end if;

  perform public.get_my_account_state();
  select coalesce((state #>> '{balances,USDT,available}')::numeric, 0)
  into available_balance
  from public.account_states
  where user_id = auth.uid();
  if available_balance < _amount then
    raise exception 'Insufficient available USDT balance' using errcode = '22023';
  end if;

  insert into public.investment_requests (
    user_id, request_type, plan_id, plan_name, asset, amount, daily_rate, duration_days
  )
  values (
    auth.uid(), 'subscribe', plan_row.id, plan_row.name, 'USDT',
    _amount, plan_row.daily_rate, plan_row.duration_days
  )
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.request_investment_redemption(_position_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  position_row public.investment_positions%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into position_row
  from public.investment_positions
  where id = _position_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Investment position not found' using errcode = 'P0002';
  end if;
  if position_row.status <> 'active' then
    raise exception 'This investment already has a pending redemption or is closed' using errcode = '55000';
  end if;
  if position_row.duration_days > 0
    and now() < position_row.started_at + make_interval(days => position_row.duration_days) then
    raise exception 'This fixed-term investment has not matured yet' using errcode = '55000';
  end if;

  update public.investment_positions
  set status = 'redemption_pending'
  where id = position_row.id;

  insert into public.investment_requests (
    user_id, request_type, plan_id, position_id, plan_name, asset, amount,
    daily_rate, duration_days
  )
  values (
    auth.uid(), 'redeem', position_row.plan_id, position_row.id,
    position_row.plan_name, position_row.asset, position_row.principal,
    position_row.daily_rate, position_row.duration_days
  )
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.request_investment_jumpstart(
  _project_name text,
  _asset text,
  _amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_project text := trim(_project_name);
  normalized_asset text := upper(trim(_asset));
  available_balance numeric;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if normalized_project is null or length(normalized_project) not between 1 and 80 then
    raise exception 'Project name is invalid' using errcode = '22023';
  end if;
  if normalized_asset is null or normalized_asset not in ('USDT', 'OKB') then
    raise exception 'Unsupported Jumpstart staking asset' using errcode = '22023';
  end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Enter an amount greater than zero' using errcode = '22023';
  end if;

  perform public.get_my_account_state();
  select coalesce((state #>> array['balances', normalized_asset, 'available'])::numeric, 0)
  into available_balance
  from public.account_states
  where user_id = auth.uid();
  if available_balance < _amount then
    raise exception 'Insufficient available balance' using errcode = '22023';
  end if;

  insert into public.investment_requests (
    user_id, request_type, plan_id, plan_name, asset, amount, daily_rate, duration_days
  )
  values (
    auth.uid(),
    'subscribe',
    'system:jumpstart:' || lower(normalized_asset),
    'Jumpstart · ' || normalized_project,
    normalized_asset,
    _amount,
    0,
    7
  )
  returning id into request_id;

  return request_id;
end;
$$;

drop function if exists public.admin_list_investment_requests(integer);
create function public.admin_list_investment_requests(_limit integer default 100)
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
    select r.id, r.user_id, coalesce(p.email, ''),
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
            r.amount, r.daily_rate, r.duration_days,
            coalesce(pos.started_at, r.created_at), now()
          )
          else 0
        end
      ),
      r.status, r.review_note, r.created_at, r.reviewed_at
    from public.investment_requests r
    left join public.profiles p on p.id = r.user_id
    left join public.investment_positions pos on pos.id = r.position_id
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
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();
  return query
    select p.id, p.user_id, coalesce(profile.email, ''), p.plan_name, p.asset,
      p.principal,
      case when p.status = 'redeemed' then 0::numeric
        else public.investment_accrued_return(
          p.principal, p.daily_rate, p.duration_days, p.started_at, now()
        )
      end,
      p.daily_rate, p.duration_days, p.status, p.started_at,
      case when p.duration_days > 0
        then p.started_at + make_interval(days => p.duration_days)
        else p.started_at
      end
    from public.investment_positions p
    left join public.profiles profile on profile.id = p.user_id
    order by p.created_at desc
    limit greatest(1, least(coalesce(_limit, 200), 1000));
end;
$$;

create or replace function public.admin_review_investment_request(
  _request_id uuid,
  _approve boolean,
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.investment_requests%rowtype;
  position_row public.investment_positions%rowtype;
  account_row public.account_states%rowtype;
  available_balance numeric;
  frozen_balance numeric;
  accrued_return numeric;
  credited_amount numeric;
  next_status text;
  activity_entry jsonb;
begin
  perform public.assert_admin();
  if _approve is null then
    raise exception 'Choose whether to approve or reject this request' using errcode = '22023';
  end if;

  select * into request_row
  from public.investment_requests
  where id = _request_id
  for update;
  if not found then
    raise exception 'Investment request not found' using errcode = 'P0002';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Investment request has already been reviewed' using errcode = '55000';
  end if;

  next_status := case when _approve then 'approved' else 'rejected' end;

  if _approve and request_row.request_type = 'subscribe' then
    select * into account_row
    from public.account_states
    where user_id = request_row.user_id
    for update;
    if not found then
      raise exception 'Investor account state is unavailable; ask the user to sign in again' using errcode = 'P0002';
    end if;

    available_balance := coalesce((account_row.state #>> array['balances', request_row.asset, 'available'])::numeric, 0);
    frozen_balance := coalesce((account_row.state #>> array['balances', request_row.asset, 'frozen'])::numeric, 0);
    if available_balance < request_row.amount then
      raise exception 'Investor no longer has enough available funds to approve this subscription' using errcode = '55000';
    end if;

    insert into public.investment_positions (
      user_id, plan_id, plan_name, asset, principal, daily_rate, duration_days
    )
    values (
      request_row.user_id, request_row.plan_id, request_row.plan_name, request_row.asset,
      request_row.amount, request_row.daily_rate, request_row.duration_days
    );

    activity_entry := jsonb_build_object(
      'id', 'IV-' || upper(replace(request_row.id::text, '-', '')),
      'reference', 'IV-' || upper(replace(request_row.id::text, '-', '')),
      'type', 'earn-subscribe',
      'ccy', request_row.asset,
      'amount', request_row.amount,
      'detail', request_row.plan_name || ' subscription approved',
      'status', 'approved',
      'ts', extract(epoch from now()) * 1000
    );
    update public.account_states
    set state = jsonb_set(
          jsonb_set(
            account_row.state,
            array['balances', request_row.asset],
            jsonb_build_object(
              'available', available_balance - request_row.amount,
              'frozen', frozen_balance
            ),
            true
          ),
          '{activity}',
          coalesce(account_row.state -> 'activity', '[]'::jsonb) || jsonb_build_array(activity_entry),
          true
        ),
        version = version + 1,
        updated_at = now()
    where user_id = request_row.user_id;
  elsif _approve and request_row.request_type = 'redeem' then
    select * into position_row
    from public.investment_positions
    where id = request_row.position_id and user_id = request_row.user_id
    for update;
    if not found or position_row.status <> 'redemption_pending' then
      raise exception 'Investment is no longer awaiting redemption approval' using errcode = '55000';
    end if;

    select * into account_row
    from public.account_states
    where user_id = request_row.user_id
    for update;
    if not found then
      raise exception 'Investor account state is unavailable' using errcode = 'P0002';
    end if;

    available_balance := coalesce((account_row.state #>> array['balances', position_row.asset, 'available'])::numeric, 0);
    frozen_balance := coalesce((account_row.state #>> array['balances', position_row.asset, 'frozen'])::numeric, 0);
    accrued_return := public.investment_accrued_return(
      position_row.principal, position_row.daily_rate, position_row.duration_days,
      position_row.started_at, now()
    );
    credited_amount := position_row.principal + accrued_return;

    activity_entry := jsonb_build_object(
      'id', 'IV-' || upper(replace(request_row.id::text, '-', '')),
      'reference', 'IV-' || upper(replace(request_row.id::text, '-', '')),
      'type', 'earn-redeem',
      'ccy', position_row.asset,
      'amount', credited_amount,
      'detail', position_row.plan_name || ' redemption approved',
      'status', 'approved',
      'ts', extract(epoch from now()) * 1000
    );
    update public.account_states
    set state = jsonb_set(
          jsonb_set(
            account_row.state,
            array['balances', position_row.asset],
            jsonb_build_object(
              'available', available_balance + credited_amount,
              'frozen', frozen_balance
            ),
            true
          ),
          '{activity}',
          coalesce(account_row.state -> 'activity', '[]'::jsonb) || jsonb_build_array(activity_entry),
          true
        ),
        version = version + 1,
        updated_at = now()
    where user_id = request_row.user_id;

    update public.investment_positions
    set status = 'redeemed', redeemed_at = now()
    where id = position_row.id;
  elsif not _approve and request_row.request_type = 'redeem' then
    update public.investment_positions
    set status = 'active'
    where id = request_row.position_id
      and user_id = request_row.user_id
      and status = 'redemption_pending';
  end if;

  update public.investment_requests
  set status = next_status,
      review_note = left(nullif(trim(_note), ''), 500),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = request_row.id;

  perform public.write_audit(
    case
      when request_row.request_type = 'subscribe' and _approve then 'investment_subscription_approved'
      when request_row.request_type = 'subscribe' then 'investment_subscription_rejected'
      when _approve then 'investment_redemption_approved'
      else 'investment_redemption_rejected'
    end,
    jsonb_build_object(
      'request_type', request_row.request_type,
      'plan_name', request_row.plan_name,
      'asset', request_row.asset,
      'principal', request_row.amount,
      'credited_amount', case when _approve and request_row.request_type = 'redeem'
        then credited_amount
        else null
      end,
      'note', nullif(trim(_note), '')
    ),
    'investment_requests'::text,
    request_row.id::text
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

      union all

      select r.id,
        'IV-' || upper(replace(r.id::text, '-', '')),
        'earn-' || r.request_type,
        r.plan_name || case when r.request_type = 'subscribe'
          then ' subscription'
          else ' redemption'
        end,
        r.status,
        jsonb_build_object(
          'amount', r.amount,
          'asset', r.asset,
          'daily_rate', r.daily_rate,
          'duration_days', r.duration_days,
          'position_id', r.position_id
        ),
        r.created_at,
        r.reviewed_at,
        r.review_note
      from public.investment_requests r
      where r.user_id = auth.uid()
    )
    select h.id, h.reference, h.transaction_type, h.summary, h.status, h.details,
      h.created_at, h.reviewed_at, h.review_note
    from history h
    order by h.created_at desc, h.id desc
    limit greatest(1, least(coalesce(_limit, 200), 500));
end;
$$;

revoke all on function public.investment_accrued_return(numeric, numeric, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.public_investment_plans() from public;
revoke all on function public.admin_list_investment_plans() from public, anon;
revoke all on function public.admin_create_investment_plan(text, numeric, integer, numeric, numeric, text, boolean, boolean, text) from public, anon;
revoke all on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) from public, anon;
revoke all on function public.admin_archive_investment_plan(text, text) from public, anon;
revoke all on function public.get_my_investment_portfolio() from public, anon;
revoke all on function public.get_my_investment_requests(integer) from public, anon;
revoke all on function public.request_investment_subscription(text, numeric) from public, anon;
revoke all on function public.request_investment_redemption(uuid) from public, anon;
revoke all on function public.request_investment_jumpstart(text, text, numeric) from public, anon;
revoke all on function public.admin_list_investment_requests(integer) from public, anon;
revoke all on function public.admin_list_user_investments(integer) from public, anon;
revoke all on function public.admin_review_investment_request(uuid, boolean, text) from public, anon;
revoke all on function public.get_my_transaction_history(integer) from public, anon;

grant execute on function public.public_investment_plans() to anon, authenticated;
grant execute on function public.admin_list_investment_plans() to authenticated;
grant execute on function public.admin_create_investment_plan(text, numeric, integer, numeric, numeric, text, boolean, boolean, text) to authenticated;
grant execute on function public.admin_update_investment_plan(text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text) to authenticated;
grant execute on function public.admin_archive_investment_plan(text, text) to authenticated;
grant execute on function public.get_my_investment_portfolio() to authenticated;
grant execute on function public.get_my_investment_requests(integer) to authenticated;
grant execute on function public.request_investment_subscription(text, numeric) to authenticated;
grant execute on function public.request_investment_redemption(uuid) to authenticated;
grant execute on function public.request_investment_jumpstart(text, text, numeric) to authenticated;
grant execute on function public.admin_list_investment_requests(integer) to authenticated;
grant execute on function public.admin_list_user_investments(integer) to authenticated;
grant execute on function public.admin_review_investment_request(uuid, boolean, text) to authenticated;
grant execute on function public.get_my_transaction_history(integer) to authenticated;

notify pgrst, 'reload schema';
