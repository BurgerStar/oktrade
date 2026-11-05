create table if not exists public.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_transaction_requests (
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

create index if not exists account_transaction_requests_user_created_idx
  on public.account_transaction_requests (user_id, created_at desc);
create index if not exists account_transaction_requests_status_created_idx
  on public.account_transaction_requests (status, created_at desc);
create unique index if not exists account_transaction_requests_one_pending_per_user_idx
  on public.account_transaction_requests (user_id) where status = 'pending';

alter table public.account_states enable row level security;
alter table public.account_transaction_requests enable row level security;
revoke all on public.account_states from anon, authenticated;
revoke all on public.account_transaction_requests from anon, authenticated;

drop function if exists public.get_my_account_state();

create function public.get_my_account_state()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  state_row public.account_states%rowtype;
  auth_user auth.users%rowtype;
  initial_state jsonb;
  initial_balances jsonb;
  deposit_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into auth_user
  from auth.users
  where id = auth.uid();

  if not found then
    raise exception 'Authenticated user not found' using errcode = 'P0002';
  end if;

  select
    coalesce(
      jsonb_object_agg(
        b.asset,
        jsonb_build_object('available', b.available, 'frozen', 0)
      ),
      '{"USDT":{"available":0,"frozen":0}}'::jsonb
    ),
    coalesce(jsonb_object_agg(b.asset, b.available), '{}'::jsonb)
  into initial_balances, deposit_snapshot
  from public.approved_deposit_balances b
  where b.user_id = auth.uid();

  initial_state := jsonb_build_object(
    'user', jsonb_build_object(
      'uid', auth.uid()::text,
      'email', auth_user.email,
      'nickname', coalesce(auth_user.raw_user_meta_data ->> 'nickname', split_part(auth_user.email, '@', 1)),
      'createdAt', extract(epoch from auth_user.created_at) * 1000,
      'verified', false,
      'twoFA', false,
      'antiPhishing', '',
      'passwordHash', ''
    ),
    'balances', initial_balances,
    'orders', '[]'::jsonb,
    'positions', '[]'::jsonb,
    'closedPositions', '[]'::jsonb,
    'activity', '[]'::jsonb,
    'earn', '[]'::jsonb,
    'copy', '[]'::jsonb,
    'bots', '[]'::jsonb,
    'loans', '[]'::jsonb,
    'favorites', '["BTC-USDT","ETH-USDT","SOL-USDT"]'::jsonb,
    'notifications', '[]'::jsonb,
    'claimedRewards', '[]'::jsonb,
    'approvedDepositSnapshot', deposit_snapshot
  );

  insert into public.account_states (user_id, version, state)
  values (auth.uid(), 0, initial_state)
  on conflict (user_id) do nothing;

  select * into state_row
  from public.account_states
  where user_id = auth.uid();

  if not found then
    return null;
  end if;

  return jsonb_build_object('version', state_row.version, 'state', state_row.state);
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
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  normalized_type text := trim(_transaction_type);
  normalized_summary text := trim(_summary);
  account_row public.account_states%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _expected_version is null or _expected_version < 0 then
    raise exception 'Account version is invalid; refresh and try again' using errcode = '22023';
  end if;
  if normalized_type is null or length(normalized_type) not between 1 and 64 then
    raise exception 'Transaction type is invalid' using errcode = '22023';
  end if;
  if normalized_summary is null or length(normalized_summary) not between 1 and 300 then
    raise exception 'Transaction summary is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(_details) is distinct from 'object'
    or jsonb_typeof(_proposed_state) is distinct from 'object'
    or pg_column_size(_details) > 65536
    or pg_column_size(_proposed_state) > 1048576 then
    raise exception 'Transaction data is invalid or too large' using errcode = '22023';
  end if;
  if _proposed_state #>> '{user,uid}' is distinct from auth.uid()::text then
    raise exception 'Account does not match the signed-in user' using errcode = '42501';
  end if;
  if jsonb_typeof(_proposed_state -> 'balances') is distinct from 'object'
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
    select 1 from public.account_transaction_requests
    where user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'A transaction is already awaiting administrator approval' using errcode = '55000';
  end if;

  insert into public.account_transaction_requests (
    user_id, expected_version, transaction_type, summary, details, proposed_state
  )
  values (
    auth.uid(), _expected_version, normalized_type, normalized_summary, _details, _proposed_state
  )
  returning id into request_id;

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
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    select r.id, r.transaction_type, r.summary, r.status, r.review_note, r.created_at, r.reviewed_at
    from public.account_transaction_requests r
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
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select r.id, r.user_id, p.email, r.transaction_type, r.summary,
      jsonb_build_object(
        'user_submitted', r.details,
        'server_balance_changes', coalesce((
          select jsonb_object_agg(
            coalesce(prior_balance.key, requested_balance.key),
            jsonb_build_object('before', prior_balance.value, 'after', requested_balance.value)
          )
          from jsonb_each(coalesce(a.state -> 'balances', '{}'::jsonb)) as prior_balance(key, value)
          full join jsonb_each(coalesce(r.proposed_state -> 'balances', '{}'::jsonb))
            as requested_balance(key, value)
            on requested_balance.key = prior_balance.key
          where prior_balance.value is distinct from requested_balance.value
        ), '{}'::jsonb),
        'server_record_counts', jsonb_build_object(
          'orders', jsonb_build_array(
            jsonb_array_length(coalesce(a.state -> 'orders', '[]'::jsonb)),
            jsonb_array_length(coalesce(r.proposed_state -> 'orders', '[]'::jsonb))
          ),
          'positions', jsonb_build_array(
            jsonb_array_length(coalesce(a.state -> 'positions', '[]'::jsonb)),
            jsonb_array_length(coalesce(r.proposed_state -> 'positions', '[]'::jsonb))
          ),
          'activity', jsonb_build_array(
            jsonb_array_length(coalesce(a.state -> 'activity', '[]'::jsonb)),
            jsonb_array_length(coalesce(r.proposed_state -> 'activity', '[]'::jsonb))
          )
        )
      ) as details,
      r.status, r.review_note, r.created_at, r.reviewed_at
    from public.account_transaction_requests r
    left join public.profiles p on p.id = r.user_id
    left join public.account_states a on a.user_id = r.user_id
    where r.status = 'pending'
      or r.id in (
        select reviewed.id
        from public.account_transaction_requests reviewed
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
set search_path = public, pg_temp
as $$
declare
  request_row public.account_transaction_requests%rowtype;
  account_row public.account_states%rowtype;
  next_status text;
begin
  perform public.assert_admin();

  select * into request_row
  from public.account_transaction_requests
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
      raise exception 'Account state changed; request cannot be approved. Ask the user to resubmit.' using errcode = '40001';
    end if;

    update public.account_states
    set state = request_row.proposed_state,
        version = version + 1,
        updated_at = now()
    where user_id = request_row.user_id;
  end if;

  update public.account_transaction_requests
  set status = next_status,
      review_note = left(nullif(trim(_note), ''), 500),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _request_id;

  perform public.write_audit(
    case when _approve then 'account_transaction_approved' else 'account_transaction_rejected' end,
    jsonb_build_object(
      'type', request_row.transaction_type,
      'summary', request_row.summary,
      'note', nullif(trim(_note), '')
    ),
    'account_transaction_requests'::text,
    _request_id::text
  );
end;
$$;

revoke all on function public.get_my_account_state() from public, anon;
revoke all on function public.submit_account_transaction(bigint, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.get_my_account_transaction_requests() from public, anon;
revoke all on function public.admin_list_account_transaction_requests() from public, anon;
revoke all on function public.admin_review_account_transaction(uuid, boolean, text) from public, anon;

grant execute on function public.get_my_account_state() to authenticated;
grant execute on function public.submit_account_transaction(bigint, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.get_my_account_transaction_requests() to authenticated;
grant execute on function public.admin_list_account_transaction_requests() to authenticated;
grant execute on function public.admin_review_account_transaction(uuid, boolean, text) to authenticated;
