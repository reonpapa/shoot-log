-- Version 2.24.2: exclude administrators from every usage statistic.
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
  if exists(select 1 from public.shoot_log_admins where user_id = auth.uid()) then return; end if;
  insert into public.shoot_log_usage(user_id, app_version, language, display_mode)
  values (auth.uid(), left(coalesce(p_app_version, 'unknown'), 32), case when p_language = 'en' then 'en' else 'ja' end, case when p_display_mode = 'standalone' then 'standalone' else 'browser' end)
  on conflict (user_id) do update set last_seen_at = now(), launch_count = public.shoot_log_usage.launch_count + 1, app_version = excluded.app_version, language = excluded.language, display_mode = excluded.display_mode;
end;
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
  if not public.is_shoot_log_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select jsonb_build_object(
    'registeredUsers', (select count(*) from auth.users u where not exists(select 1 from public.shoot_log_admins a where a.user_id = u.id)),
    'trackedUsers', (select count(*) from public.shoot_log_usage u where not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'activeToday', (select count(*) from public.shoot_log_usage u where last_seen_at >= current_date and not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'active7Days', (select count(*) from public.shoot_log_usage u where last_seen_at >= now() - interval '7 days' and not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'active30Days', (select count(*) from public.shoot_log_usage u where last_seen_at >= now() - interval '30 days' and not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'standaloneUsers', (select count(*) from public.shoot_log_usage u where display_mode = 'standalone' and not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'totalLaunches', (select coalesce(sum(launch_count), 0) from public.shoot_log_usage u where not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id)),
    'versions', (select coalesce(jsonb_agg(jsonb_build_object('label', app_version, 'count', amount) order by amount desc), '[]'::jsonb) from (select app_version, count(*) amount from public.shoot_log_usage u where not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id) group by app_version) v),
    'languages', (select coalesce(jsonb_agg(jsonb_build_object('label', language, 'count', amount) order by amount desc), '[]'::jsonb) from (select language, count(*) amount from public.shoot_log_usage u where not exists(select 1 from public.shoot_log_admins a where a.user_id = u.user_id) group by language) l),
    'generatedAt', now()
  ) into result;
  return result;
end;
$$;

delete from public.shoot_log_usage where user_id in (select user_id from public.shoot_log_admins);
