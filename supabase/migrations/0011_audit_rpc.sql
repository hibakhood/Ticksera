-- 0011_audit_rpc.sql
-- Server-side audit logging. The app writes audit entries through this
-- SECURITY DEFINER function with the service key (the client-side insert policy
-- was locked to service_role in migration 0009). Execution is revoked from
-- anon/authenticated so users can neither spam nor forge audit history.
create or replace function public.audit_log(uid uuid, action text, entity text, details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, entity, details)
  values (uid, action, entity, coalesce(details, '{}'::jsonb));
end;
$$;

revoke execute on function public.audit_log(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.audit_log(uuid, text, text, jsonb) to service_role;
