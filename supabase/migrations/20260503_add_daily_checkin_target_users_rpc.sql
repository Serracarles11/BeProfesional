create or replace function public.get_daily_checkin_target_users()
returns table (
  usuario_id uuid,
  email text
)
language sql
security definer
set search_path = auth, public
as $$
  select
    users.id as usuario_id,
    users.email::text as email
  from auth.users
  where users.email is not null;
$$;

revoke all on function public.get_daily_checkin_target_users() from public;
revoke all on function public.get_daily_checkin_target_users() from anon;
revoke all on function public.get_daily_checkin_target_users() from authenticated;
grant execute on function public.get_daily_checkin_target_users() to service_role;
