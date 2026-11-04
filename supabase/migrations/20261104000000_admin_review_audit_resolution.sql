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

do $$
begin
  if to_regprocedure('public.write_audit(text,jsonb,text,text)') is null then
    raise exception 'Required audit function public.write_audit(text,jsonb,text,text) was not created';
  end if;
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

revoke all on function public.admin_review_deposit_request(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_deposit_request(uuid, boolean, text) to authenticated;

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

revoke all on function public.admin_review_account_transaction(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_account_transaction(uuid, boolean, text) to authenticated;
