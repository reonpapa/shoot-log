create or replace function public.save_shoot_log_snapshot(
  p_payload jsonb,
  p_expected_revision bigint
)
returns public.shoot_log_snapshots
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.shoot_log_snapshots;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_expected_revision = 0 then
    insert into public.shoot_log_snapshots (
      user_id, payload, revision, updated_at
    )
    values (
      auth.uid(), p_payload, 1, now()
    )
    on conflict (user_id) do nothing
    returning * into saved;
  else
    update public.shoot_log_snapshots
    set payload = p_payload,
        revision = revision + 1,
        updated_at = now()
    where user_id = auth.uid()
      and revision = p_expected_revision
    returning * into saved;
  end if;

  -- A null result tells the client to load, merge, and retry without filling
  -- Postgres logs with an expected optimistic-concurrency exception.
  if saved.user_id is null then
    return null;
  end if;

  return saved;
end;
$$;

revoke all on function public.save_shoot_log_snapshot(jsonb, bigint) from public;
grant execute on function public.save_shoot_log_snapshot(jsonb, bigint) to authenticated;
