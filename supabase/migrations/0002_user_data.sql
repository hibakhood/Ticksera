-- 0002_user_data.sql
-- Per-user application data document (tickets, chat, bookings, payments).
-- The SPA keeps these slices in its zustand store; for real (Supabase) users
-- a debounced snapshot is persisted here so data survives reloads and is
-- available across devices. Owner-scoped via RLS.
-- Run this after 0001_init.sql in the Supabase SQL editor.

create table if not exists public.user_data (
  user_id    uuid primary key,                -- = auth.uid()
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "user_data_own" on public.user_data;
create policy "user_data_own" on public.user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
