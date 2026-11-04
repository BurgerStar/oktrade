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
  values (
    auth.uid(),
    trim(_action),
    trim(_entity),
    trim(_entity_id),
    coalesce(_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.write_audit(text, jsonb, text, text) from public, anon, authenticated;

create or replace function public.submit_deposit_request(
  _asset text,
  _network text,
  _amount numeric,
  _tx_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  violated_constraint text;
  normalized_asset text := upper(trim(_asset));
  normalized_network text := trim(_network);
  normalized_hash text := trim(_tx_hash);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;
  if normalized_hash is null or length(normalized_hash) not between 16 and 160 then
    raise exception 'Enter a valid transaction ID' using errcode = '22023';
  end if;
  if not (
    (normalized_asset = 'BTC' and normalized_network = 'Bitcoin')
    or (normalized_asset = 'ETH' and normalized_network = 'Ethereum')
    or (normalized_asset = 'USDT' and normalized_network in ('ERC20', 'TRC20', 'BNB Smart Chain'))
    or (normalized_asset = 'TRX' and normalized_network = 'TRON')
    or (normalized_asset = 'SOL' and normalized_network = 'Solana')
    or (normalized_asset = 'XRP' and normalized_network = 'XRP Ledger')
    or (normalized_asset = 'DOGE' and normalized_network = 'Dogecoin')
  ) then
    raise exception 'Unsupported asset and network combination' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.deposit_requests d
    where d.network = normalized_network
      and lower(d.tx_hash) = lower(normalized_hash)
  ) then
    raise exception 'This transaction ID has already been submitted for this network.'
      using errcode = '23505';
  end if;

  begin
    insert into public.deposit_requests (user_id, asset, network, amount, tx_hash)
    values (auth.uid(), normalized_asset, normalized_network, _amount, normalized_hash)
    returning id into request_id;
  exception when unique_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint = 'deposit_requests_network_tx_hash_idx' then
      raise exception 'This transaction ID has already been submitted for this network.'
        using errcode = '23505';
    end if;
    raise;
  end;

  return request_id;
end;
$$;

create or replace function public.get_my_account_state()
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

create or replace function public.admin_review_deposit_request(
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
  request_row public.deposit_requests%rowtype;
  next_status text;
begin
  perform public.assert_admin();

  select * into request_row
  from public.deposit_requests
  where id = _request_id
  for update;

  if not found then
    raise exception 'Deposit request not found' using errcode = 'P0002';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Deposit request has already been reviewed' using errcode = '55000';
  end if;

  next_status := case when _approve then 'approved' else 'rejected' end;
  update public.deposit_requests
  set status = next_status,
      review_note = left(nullif(trim(_note), ''), 500),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = _request_id;

  if _approve then
    insert into public.approved_deposit_balances (user_id, asset, available, updated_at)
    values (request_row.user_id, request_row.asset, request_row.amount, now())
    on conflict (user_id, asset) do update
      set available = public.approved_deposit_balances.available + excluded.available,
          updated_at = now();
  end if;

  perform public.write_audit(
    case when _approve then 'deposit_approved' else 'deposit_rejected' end,
    jsonb_build_object(
      'asset', request_row.asset,
      'network', request_row.network,
      'amount', request_row.amount,
      'note', nullif(trim(_note), '')
    ),
    'deposit_requests'::text,
    _request_id::text
  );
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

revoke all on function public.submit_deposit_request(text, text, numeric, text) from public, anon;
revoke all on function public.get_my_account_state() from public, anon;
revoke all on function public.admin_review_deposit_request(uuid, boolean, text) from public, anon;
revoke all on function public.admin_review_account_transaction(uuid, boolean, text) from public, anon;

grant execute on function public.submit_deposit_request(text, text, numeric, text) to authenticated;
grant execute on function public.get_my_account_state() to authenticated;
grant execute on function public.admin_review_deposit_request(uuid, boolean, text) to authenticated;
grant execute on function public.admin_review_account_transaction(uuid, boolean, text) to authenticated;

do $$
begin
  if to_regprocedure('public.get_my_account_state()') is null then
    raise exception 'Required account RPC public.get_my_account_state() was not created';
  end if;
  if to_regprocedure('public.write_audit(text,jsonb,text,text)') is null then
    raise exception 'Required audit function public.write_audit(text,jsonb,text,text) was not created';
  end if;
end;
$$;

notify pgrst, 'reload schema';
