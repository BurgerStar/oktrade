create table if not exists public.investment_legacy_earn_backup (
  user_id uuid primary key,
  earn_payload jsonb not null,
  captured_at timestamptz not null default now()
);

alter table public.investment_legacy_earn_backup enable row level security;
revoke all on public.investment_legacy_earn_backup from public, anon, authenticated;

insert into public.investment_legacy_earn_backup (user_id, earn_payload)
select s.user_id, s.state -> 'earn'
from public.account_states s
where jsonb_typeof(s.state -> 'earn') = 'array'
  and jsonb_array_length(s.state -> 'earn') > 0
on conflict (user_id) do nothing;

create or replace function public.prevent_system_investment_plan_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.id like 'system:%' or new.id like 'system:%' then
    raise exception 'System investment plans cannot be changed through admin controls'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_system_investment_plans on public.investment_plans;
create trigger protect_system_investment_plans
before update on public.investment_plans
for each row execute function public.prevent_system_investment_plan_updates();

create or replace function public.validate_investment_insert_duration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.duration_days not between 1 and 365
    and (
      tg_table_name = 'investment_positions'
      or pg_catalog.to_jsonb(new) ->> 'request_type' = 'subscribe'
    ) then
    raise exception 'Investment duration must be between 1 and 365 days'
      using errcode = '22023';
  end if;
  if tg_table_name = 'investment_requests'
    and pg_catalog.to_jsonb(new) ->> 'request_type' = 'redeem'
    and new.duration_days = 0 then
    new.review_note := coalesce(
      new.review_note,
      'Legacy zero-day position requires manual review before approval'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists investment_requests_duration_guard
  on public.investment_requests;
create trigger investment_requests_duration_guard
before insert on public.investment_requests
for each row execute function public.validate_investment_insert_duration();

drop trigger if exists investment_positions_duration_guard
  on public.investment_positions;
create trigger investment_positions_duration_guard
before insert on public.investment_positions
for each row execute function public.validate_investment_insert_duration();

create or replace function public.prevent_approving_zero_duration_investment_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.duration_days not between 1 and 365 then
    raise exception 'A zero-day legacy investment request requires manual review before approval'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists investment_requests_positive_duration_approval
  on public.investment_requests;
create trigger investment_requests_positive_duration_approval
before update of status on public.investment_requests
for each row execute function public.prevent_approving_zero_duration_investment_request();

update public.investment_requests
set review_note = coalesce(
  nullif(pg_catalog.btrim(review_note), ''),
  'Legacy zero-day request requires manual review before approval'
)
where status = 'pending'
  and duration_days = 0;

alter function public.investment_accrued_return(
  numeric, numeric, integer, timestamptz, timestamptz
) set search_path = '';
alter function public.public_investment_plans() set search_path = '';
alter function public.admin_list_investment_plans() set search_path = '';
alter function public.admin_create_investment_plan(
  text, numeric, integer, numeric, numeric, text, boolean, boolean, text
) set search_path = '';
alter function public.admin_update_investment_plan(
  text, text, numeric, integer, numeric, numeric, text, boolean, boolean, text
) set search_path = '';
alter function public.admin_archive_investment_plan(text, text) set search_path = '';
alter function public.get_my_investment_portfolio() set search_path = '';
alter function public.get_my_investment_requests(integer) set search_path = '';
alter function public.request_investment_subscription(text, numeric) set search_path = '';
alter function public.request_investment_redemption(uuid) set search_path = '';
alter function public.request_investment_jumpstart(text, text, numeric) set search_path = '';
alter function public.admin_list_investment_requests(integer) set search_path = '';
alter function public.admin_list_user_investments(integer) set search_path = '';
alter function public.admin_list_user_investment_page(
  integer, timestamptz, uuid
) set search_path = '';
alter function public.admin_review_investment_request(uuid, boolean, text)
  set search_path = '';
alter function public.get_my_transaction_history(integer) set search_path = '';

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
    select r.id, r.user_id, coalesce(investor.email, ''),
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
    left join auth.users investor on investor.id = r.user_id
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

revoke all on function public.admin_list_investment_requests(integer) from public, anon;
grant execute on function public.admin_list_investment_requests(integer) to authenticated;

notify pgrst, 'reload schema';
