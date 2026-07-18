create table if not exists public.shoot_log_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.shoot_log_snapshots enable row level security;

drop policy if exists "read own snapshot" on public.shoot_log_snapshots;
create policy "read own snapshot"
on public.shoot_log_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own snapshot" on public.shoot_log_snapshots;
create policy "insert own snapshot"
on public.shoot_log_snapshots for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own snapshot" on public.shoot_log_snapshots;
create policy "update own snapshot"
on public.shoot_log_snapshots for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.shoot_log_snapshots from anon;
grant select, insert, update on table public.shoot_log_snapshots to authenticated;

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

  if saved.user_id is null then
    raise exception 'SYNC_CONFLICT' using errcode = '40001';
  end if;

  return saved;
end;
$$;

revoke all on function public.save_shoot_log_snapshot(jsonb, bigint) from public;
grant execute on function public.save_shoot_log_snapshot(jsonb, bigint) to authenticated;

create table if not exists public.shoot_log_keepalive (
  id smallint primary key check (id = 1),
  label text not null,
  created_at timestamptz not null default now()
);

insert into public.shoot_log_keepalive (id, label)
values (1, 'shoot-log')
on conflict (id) do nothing;

alter table public.shoot_log_keepalive enable row level security;

drop policy if exists "public keepalive read" on public.shoot_log_keepalive;
create policy "public keepalive read"
on public.shoot_log_keepalive for select
to anon, authenticated
using (true);

revoke all on table public.shoot_log_keepalive from anon, authenticated;
grant select on table public.shoot_log_keepalive to anon, authenticated;
