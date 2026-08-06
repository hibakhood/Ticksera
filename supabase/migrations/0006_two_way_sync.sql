-- 0006_two_way_sync.sql
-- Make the business tables (tickets, chat_messages, bookings, payments,
-- notifications, kb_articles) the authoritative two-way-synced source of truth
-- for the app. The SPA mirrors every store mutation into these tables and reads
-- them back, so the dashboard charts (Ticket Activity, Status breakdown,
-- Revenue Trend, Ticket Status, Technician Workload, User Growth, Top Requested
-- Services) correlate with the actual database rows.
--
-- The app generates text ids (t<ts>, m<ts>, ...) and its own status/priority
-- vocabulary, so ids are widened to text and blocking foreign keys / check
-- constraints that don't match app values are dropped. The full app object is
-- kept in a `data` jsonb column so nothing is lost when the SPA reads rows back.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Depends on 0001_init.sql. Designed to be re-runnable (DROP IF EXISTS).

-- 1. Drop constraints that would block widening ids / app values.
alter table public.tickets       drop constraint if exists tickets_user_id_fkey;
alter table public.tickets       drop constraint if exists tickets_org_id_fkey;
alter table public.tickets       drop constraint if exists tickets_assigned_to_fkey;
alter table public.tickets       drop constraint if exists tickets_status_check;
alter table public.tickets       drop constraint if exists tickets_priority_check;
alter table public.chat_messages drop constraint if exists chat_messages_ticket_id_fkey;
alter table public.chat_messages drop constraint if exists chat_messages_sender_id_fkey;
alter table public.bookings      drop constraint if exists bookings_user_id_fkey;
alter table public.bookings      drop constraint if exists bookings_status_check;
alter table public.payments      drop constraint if exists payments_user_id_fkey;
alter table public.payments      drop constraint if exists payments_org_id_fkey;
alter table public.payments      drop constraint if exists payments_status_check;
alter table public.notifications drop constraint if exists notifications_user_id_fkey;
alter table public.kb_articles   drop constraint if exists kb_articles_author_id_fkey;

-- 2. Widen primary/foreign ids to text (the app generates text ids).
alter table public.tickets       alter column id          drop default;
alter table public.tickets       alter column id          type text;
alter table public.tickets       alter column user_id     type text;
alter table public.tickets       alter column org_id      type text;
alter table public.tickets       alter column assigned_to type text;
alter table public.chat_messages alter column id          drop default;
alter table public.chat_messages alter column id          type text;
alter table public.chat_messages alter column ticket_id   type text;
alter table public.chat_messages alter column sender_id   type text;
alter table public.bookings      alter column id          drop default;
alter table public.bookings      alter column id          type text;
alter table public.bookings      alter column user_id     type text;
alter table public.bookings      alter column user_id     drop not null;
alter table public.payments      alter column id          drop default;
alter table public.payments      alter column id          type text;
alter table public.payments      alter column user_id     type text;
alter table public.payments      alter column user_id     drop not null;
alter table public.payments      alter column org_id      type text;
alter table public.notifications alter column id          drop default;
alter table public.notifications alter column id          type text;
alter table public.notifications alter column user_id     type text;
alter table public.notifications alter column user_id     drop not null;
alter table public.kb_articles   alter column id          drop default;
alter table public.kb_articles   alter column id          type text;
alter table public.kb_articles   alter column author_id   type text;

-- 3. Payload column: carries the app's full object (activityLogs, ratings, ...).
alter table public.tickets       add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.chat_messages add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.bookings      add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.payments      add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.kb_articles   add column if not exists data jsonb not null default '{}'::jsonb;

-- 4. RLS: keep owner rules (ids are text now) and let staff read/write all rows.
drop policy if exists "tickets_read_own" on public.tickets;
drop policy if exists "tickets_insert_own" on public.tickets;
drop policy if exists "tickets_update_own_or_staff" on public.tickets;
create policy "tickets_read_own" on public.tickets
  for select using (auth.uid()::text = user_id or public.is_staff(auth.uid()));
create policy "tickets_insert_own_or_staff" on public.tickets
  for insert with check (auth.uid()::text = user_id or public.is_staff(auth.uid()));
create policy "tickets_update_own_or_staff" on public.tickets
  for update using (auth.uid()::text = user_id or public.is_staff(auth.uid()))
  with check (auth.uid()::text = user_id or public.is_staff(auth.uid()));

drop policy if exists "chat_read_ticket_participants" on public.chat_messages;
drop policy if exists "chat_insert_participants" on public.chat_messages;
drop policy if exists "chat_update_participants" on public.chat_messages;
create policy "chat_read_ticket_participants" on public.chat_messages
  for select using (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()::text
  ));
create policy "chat_insert_participants" on public.chat_messages
  for insert with check (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()::text
  ));
create policy "chat_update_participants" on public.chat_messages
  for update using (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()::text
  ))
  with check (public.is_staff(auth.uid()) or exists (
    select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()::text
  ));

drop policy if exists "bookings_own" on public.bookings;
drop policy if exists "bookings_read_staff" on public.bookings;
drop policy if exists "bookings_write_staff" on public.bookings;
create policy "bookings_own" on public.bookings
  for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "bookings_read_staff" on public.bookings
  for select using (public.is_staff(auth.uid()));
create policy "bookings_write_staff" on public.bookings
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "payments_own" on public.payments;
drop policy if exists "payments_insert_own" on public.payments;
drop policy if exists "payments_update_own" on public.payments;
drop policy if exists "payments_read_staff" on public.payments;
drop policy if exists "payments_write_staff" on public.payments;
create policy "payments_own" on public.payments
  for select using (user_id = auth.uid()::text);
create policy "payments_insert_own" on public.payments
  for insert with check (user_id = auth.uid()::text);
create policy "payments_update_own" on public.payments
  for update using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "payments_read_staff" on public.payments
  for select using (public.is_staff(auth.uid()));
create policy "payments_write_staff" on public.payments
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "notifications_own" on public.notifications;
drop policy if exists "notifications_read_staff" on public.notifications;
drop policy if exists "notifications_write_staff" on public.notifications;
create policy "notifications_own" on public.notifications
  for all using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "notifications_read_staff" on public.notifications
  for select using (public.is_staff(auth.uid()));
create policy "notifications_write_staff" on public.notifications
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
