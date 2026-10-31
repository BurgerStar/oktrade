create or replace function public.admin_list_user_activity(_limit integer default 100)
returns table (
  id uuid,
  email text,
  display_name text,
  country_of_residence text,
  status text,
  created_at timestamptz,
  last_active timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin();

  return query
    select p.id, p.email, p.display_name,
      nullif(trim(u.raw_user_meta_data ->> 'country_of_residence'), ''),
      p.status, p.created_at, p.last_seen_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.last_seen_at desc nulls last, p.created_at desc
    limit greatest(1, least(coalesce(_limit, 100), 500));
end;
$$;

revoke all on function public.admin_list_user_activity(integer) from public, anon;
grant execute on function public.admin_list_user_activity(integer) to authenticated;
