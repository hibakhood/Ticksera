-- 0010_role_rpc.sql
-- Staff role changes are privileged: a user must never change their own role
-- (self-escalation / lockout), and role changes must be applied to the DB, not
-- just the in-memory state. This SECURITY DEFINER function lets the API update
-- profiles.role with the service key. Clients cannot call it directly: execute
-- is revoked from anon/authenticated and only granted to service_role.
create or replace function public.set_user_role(target uuid, new_role text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if new_role not in ('super_admin','support_manager','technician','field_technician','customer') then
    raise exception 'invalid role';
  end if;
  update public.profiles
     set role = new_role, updated_at = now()
   where id = target;
  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from public, anon, authenticated;
grant execute on function public.set_user_role(uuid, text) to service_role;
