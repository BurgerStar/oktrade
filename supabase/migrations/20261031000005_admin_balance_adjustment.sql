create or replace function public.admin_adjust_user_balance(
  _user_id uuid,
  _asset text,
  _amount numeric,
  _note text
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_asset text := upper(trim(_asset));
  normalized_note text := trim(_note);
  next_balance numeric;
begin
  perform public.assert_admin();

  if _user_id is null or not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if normalized_asset !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'Select a valid asset' using errcode = '22023';
  end if;
  if _amount is null or _amount = 0 then
    raise exception 'Amount must be non-zero' using errcode = '22023';
  end if;
  if normalized_note is null or length(normalized_note) < 3 then
    raise exception 'Enter a reason for this balance change' using errcode = '22023';
  end if;

  insert into public.approved_deposit_balances (user_id, asset, available, updated_at)
  values (_user_id, normalized_asset, _amount, now())
  on conflict (user_id, asset) do update
    set available = public.approved_deposit_balances.available + excluded.available,
        updated_at = now();

  select available into next_balance
  from public.approved_deposit_balances
  where user_id = _user_id and asset = normalized_asset;

  if next_balance < 0 then
    raise exception 'Balance cannot go negative' using errcode = '22023';
  end if;

  perform public.write_audit(
    'admin_balance_adjustment',
    jsonb_build_object(
      'asset', normalized_asset,
      'amount', _amount,
      'note', left(normalized_note, 500)
    ),
    'approved_deposit_balances',
    _user_id::text
  );

  return next_balance;
end;
$$;

revoke all on function public.admin_adjust_user_balance(uuid, text, numeric, text) from public, anon;
grant execute on function public.admin_adjust_user_balance(uuid, text, numeric, text) to authenticated;

create or replace function public.admin_credit_user_balance(
  _user_id uuid,
  _asset text,
  _amount numeric,
  _note text
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.admin_adjust_user_balance(_user_id, _asset, abs(_amount), _note);
end;
$$;

revoke all on function public.admin_credit_user_balance(uuid, text, numeric, text) from public, anon;
grant execute on function public.admin_credit_user_balance(uuid, text, numeric, text) to authenticated;
