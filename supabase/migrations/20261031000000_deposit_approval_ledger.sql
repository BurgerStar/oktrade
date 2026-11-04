create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null,
  network text not null,
  amount numeric(38, 18) not null check (amount > 0),
  tx_hash text not null check (length(trim(tx_hash)) between 16 and 160),
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

create unique index if not exists deposit_requests_network_tx_hash_idx
  on public.deposit_requests (network, lower(tx_hash));

create index if not exists deposit_requests_user_created_idx
  on public.deposit_requests (user_id, created_at desc);

create table if not exists public.approved_deposit_balances (
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null,
  available numeric(38, 18) not null default 0 check (available >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, asset)
);

alter table public.deposit_requests enable row level security;
alter table public.approved_deposit_balances enable row level security;

revoke all on public.deposit_requests from anon, authenticated;
revoke all on public.approved_deposit_balances from anon, authenticated;
grant select on public.deposit_requests to authenticated;
grant select on public.approved_deposit_balances to authenticated;

create policy "Users can read their own deposit requests"
  on public.deposit_requests
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can read their own approved deposit balances"
  on public.approved_deposit_balances
  for select
  to authenticated
  using (user_id = auth.uid());

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

  insert into public.deposit_requests (user_id, asset, network, amount, tx_hash)
  values (auth.uid(), normalized_asset, normalized_network, _amount, normalized_hash)
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.get_my_deposit_requests()
returns table (
  id uuid,
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
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
    select d.id, d.asset, d.network, d.amount, d.tx_hash, d.status, d.review_note, d.created_at, d.reviewed_at
    from public.deposit_requests d
    where d.user_id = auth.uid()
    order by d.created_at desc;
end;
$$;

create or replace function public.get_my_approved_deposit_balances()
returns table (
  asset text,
  available numeric,
  updated_at timestamptz
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
    select b.asset, b.available, b.updated_at
    from public.approved_deposit_balances b
    where b.user_id = auth.uid()
    order by b.asset;
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
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select d.id, d.user_id, p.email, d.asset, d.network, d.amount, d.tx_hash,
      d.status, d.review_note, d.created_at, d.reviewed_at
    from public.deposit_requests d
    left join public.profiles p on p.id = d.user_id
    order by (d.status = 'pending') desc, d.created_at desc;
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

revoke all on function public.submit_deposit_request(text, text, numeric, text) from public, anon;
revoke all on function public.get_my_deposit_requests() from public, anon;
revoke all on function public.get_my_approved_deposit_balances() from public, anon;
revoke all on function public.admin_list_deposit_requests() from public, anon;
revoke all on function public.admin_review_deposit_request(uuid, boolean, text) from public, anon;

grant execute on function public.submit_deposit_request(text, text, numeric, text) to authenticated;
grant execute on function public.get_my_deposit_requests() to authenticated;
grant execute on function public.get_my_approved_deposit_balances() to authenticated;
grant execute on function public.admin_list_deposit_requests() to authenticated;
grant execute on function public.admin_review_deposit_request(uuid, boolean, text) to authenticated;
