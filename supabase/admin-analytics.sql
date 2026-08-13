-- Shoot Log Version 2.24.0: privacy-conscious usage analytics and admin dashboard.
-- Run this file once in the Supabase SQL Editor.

create table if not exists public.shoot_log_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shoot_log_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  launch_count bigint not null default 1,
  app_version text not null,
  language text not null check (language in ('ja', 'en')),
  display_mode text not null check (display_mode in ('browser', 'standalone'))
);

alter table public.shoot_log_admins enable row level security;
alter table public.shoot_log_usage enable row level security;

revoke all on public.shoot_log_admins from anon, authenticated;
revoke all on public.shoot_log_usage from anon, authenticated;

create or replace function public.record_shoot_log_usage(
  p_app_version text,
  p_language text,
  p_display_mode text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.shoot_log_usage(user_id, app_version, language, display_mode)
  values (
    auth.uid(), left(coalesce(p_app_version, 'unknown'), 32),
    case when p_language = 'en' then 'en' else 'ja' end,
    case when p_display_mode = 'standalone' then 'standalone' else 'browser' end
  )
  on conflict (user_id) do update set
    last_seen_at = now(),
    launch_count = public.shoot_log_usage.launch_count + 1,
    app_version = excluded.app_version,
    language = excluded.language,
    display_mode = excluded.display_mode;
end;
$$;

create or replace function public.is_shoot_log_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.shoot_log_admins where user_id = auth.uid());
$$;

create or replace function public.get_shoot_log_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_shoot_log_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'registeredUsers', (select count(*) from auth.users),
    'trackedUsers', (select count(*) from public.shoot_log_usage),
    'activeToday', (select count(*) from public.shoot_log_usage where last_seen_at >= current_date),
    'active7Days', (select count(*) from public.shoot_log_usage where last_seen_at >= now() - interval '7 days'),
    'active30Days', (select count(*) from public.shoot_log_usage where last_seen_at >= now() - interval '30 days'),
    'standaloneUsers', (select count(*) from public.shoot_log_usage where display_mode = 'standalone'),
    'totalLaunches', (select coalesce(sum(launch_count), 0) from public.shoot_log_usage),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('label', app_version, 'count', amount) order by amount desc), '[]'::jsonb) from (select app_version, count(*) amount from public.shoot_log_usage group by app_version) v),
    'languages', (select coalesce(jsonb_agg(jsonb_build_object('label', language, 'count', amount) order by amount desc), '[]'::jsonb) from (select language, count(*) amount from public.shoot_log_usage group by language) l),
    'generatedAt', now()
  ) into result;
  return result;
end;
$$;

grant execute on function public.record_shoot_log_usage(text, text, text) to authenticated;
grant execute on function public.is_shoot_log_admin() to authenticated;
grant execute on function public.get_shoot_log_admin_stats() to authenticated;

insert into public.shoot_log_admins(user_id)
select id from auth.users where lower(email) = lower('reonpapa@gmail.com')
on conflict (user_id) do nothing;

do $$
begin
  if not exists (select 1 from public.shoot_log_admins) then
    raise exception 'reonpapa@gmail.com のShoot Logアカウントが見つかりません。先にこのアドレスでアプリへログインしてください。';
  end if;
end $$;
