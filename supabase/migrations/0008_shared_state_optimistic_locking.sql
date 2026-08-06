-- 0008_shared_state_optimistic_locking.sql
-- Prevent lost updates / cross-tenant clobbering on the shared state row.
--
-- Previously /api/state POST did read -> merge -> overwrite with no locking,
-- so two concurrent writers (e.g. two users editing tickets at the same time)
-- both computed their merge from the same snapshot and the later writer
-- silently discarded the earlier one's changes.
--
-- This migration adds a monotonic `version` column and a SECURITY DEFINER
-- function that performs the update atomically: it takes a ROW EXCLUSIVE lock
-- on the shared row, rejects the write if the caller's base version is stale,
-- and bumps the version on success. Callers (the Vercel edge functions) pass
-- the version they last read; a rejected write returns 409 and the client
-- reloads + merges + retries.
--
-- The version check also guards the Paystack payment append path (verify.ts).

alter table public.user_data add column if not exists version bigint not null default 0;

create or replace function public.update_shared_state_if_version(
  p_base_version bigint,
  p_data jsonb
)
returns table (ok boolean, version bigint, data jsonb)
language plpgsql security definer set search_path = public
as $$
declare
  cur_version bigint;
  cur_data    jsonb;
begin
  -- Serialize writers with a row lock so the check-and-update is atomic.
  select version, data into cur_version, cur_data
  from public.user_data
  where user_id = '00000000-0000-0000-0000-000000000000'
  for update;

  if cur_version is null then
    return query select false, null::bigint, null::jsonb;
    return;
  end if;

  if p_base_version is not null and cur_version <> p_base_version then
    return query select false, cur_version, cur_data;
    return;
  end if;

  update public.user_data
  set data = p_data, version = cur_version + 1, updated_at = now()
  where user_id = '00000000-0000-0000-0000-000000000000';

  return query select true, cur_version + 1, p_data;
end;
$$;

revoke all on function public.update_shared_state_if_version(bigint, jsonb) from anon;
revoke all on function public.update_shared_state_if_version(bigint, jsonb) from authenticated;
