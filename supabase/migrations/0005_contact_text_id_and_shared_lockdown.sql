-- 0005: lock down the shared row and let contact messages carry app string ids.
-- The client no longer touches user_data directly: all shared-state reads and
-- writes flow through the /api/state Edge function (service role, which
-- bypasses RLS and enforces per-record ownership server-side). Remove the
-- anon/authenticated policies from 0003 so a signed-in user cannot read or
-- overwrite the shared row (the previous IDOR).

drop policy if exists "user_data_shared_read" on public.user_data;
drop policy if exists "user_data_shared_write" on public.user_data;
drop policy if exists "user_data_shared_update" on public.user_data;

-- contact_messages.id is a uuid in 0001; the app generates text ids (c<ts>).
-- Widen the column so the public form can persist with the same id the app
-- uses locally (so table rows and shared-state rows dedupe cleanly by id).

alter table public.contact_messages alter column id drop default;
alter table public.contact_messages alter column id type text using id::text;
