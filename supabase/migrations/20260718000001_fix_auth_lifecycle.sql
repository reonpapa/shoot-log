create or replace function public.delete_shoot_log_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user_id uuid := auth.uid();
begin
  if requesting_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from auth.users
  where id = requesting_user_id;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.delete_shoot_log_account() from public;
grant execute on function public.delete_shoot_log_account() to authenticated;
