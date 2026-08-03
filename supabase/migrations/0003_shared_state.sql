-- 0003_shared_state.sql
-- Single shared application-data row so every role (admin, technician, customer)
-- reads and writes the SAME tickets, users, payments, bookings, organizations, etc.
--
-- The SPA previously persisted its zustand store as a per-user snapshot in
-- user_data, which kept each account's tickets/payments invisible to the other
-- roles — the admin and technician dashboards never saw customer-created data.
-- This migration introduces a well-known shared row
-- (user_id = 00000000-0000-0000-0000-000000000000) that every authenticated user
-- can read and upsert, and pre-creates it so the app can seed it on first load.
--
-- Run this after 0002_user_data.sql in the Supabase SQL editor.

insert into public.user_data (user_id, data, updated_at)
values ('00000000-0000-0000-0000-000000000000', '{}'::jsonb, now())
on conflict (user_id) do nothing;

-- Let every authenticated user read the shared row.
drop policy if exists "user_data_shared_read" on public.user_data;
create policy "user_data_shared_read" on public.user_data
  for select using (
    auth.role() = 'authenticated'
    and user_id = '00000000-0000-0000-0000-000000000000'
  );

-- Let every authenticated user upsert the shared row.
drop policy if exists "user_data_shared_write" on public.user_data;
create policy "user_data_shared_write" on public.user_data
  for insert with check (
    auth.role() = 'authenticated'
    and user_id = '00000000-0000-0000-0000-000000000000'
  );

drop policy if exists "user_data_shared_update" on public.user_data;
create policy "user_data_shared_update" on public.user_data
  for update using (user_id = '00000000-0000-0000-0000-000000000000')
  with check (
    auth.role() = 'authenticated'
    and user_id = '00000000-0000-0000-0000-000000000000'
  );
