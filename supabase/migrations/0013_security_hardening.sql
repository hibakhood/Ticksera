-- 0013_security_hardening.sql
-- Close the remaining least-privilege gaps identified by the security audit.
--
-- The app's write path is /api/state (server-side, service role), which now
-- scopes technicians to their own work and validates/audits manager payment
-- writes. This migration makes the direct anon-key database path behave the
-- same way so a privileged account can't bypass the gateway by talking to
-- PostgREST directly:
--
--   1. is_manager() helper (mirror of the existing is_staff()).
--   2. tickets: insert/update limited to managers, the owner, or the assigned
--      technician (previously ANY staff row could write ANY ticket).
--   3. chat_messages: insert/update limited to managers, ticket owners, or the
--      assigned technician. This also replaces the old "chat_update_participants"
--      that let any staff row rewrite ANY message (chat-history tampering).
--   4. bookings: staff writes limited to managers or the booking owner.
--   5. notifications: staff writes limited to managers or the recipient.
--   6. payments: drop the leftover "payments_write_staff" policy (client
--      payment writes are already rejected by the 0007 trigger; belt-and-braces).
--   7. kb_articles / contact_messages: staff writes limited to managers.
--   8. payments: non-negative amount check constraint (numeric(10,2) already).
--   9. storage "attachments": MIME allowlist (was NULL = any file type) and
--      update policy limited to the object owner (was any authenticated user
--      overwriting anyone's attachment).
--
-- Designed to be re-runnable (DROP ... IF EXISTS / IF NOT EXISTS).

-- 1. Manager helper (roles that may write every business table).
create or replace function public.is_manager(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('super_admin','support_manager')
  );
$$;

-- 2. tickets: managers / owner / assigned technician.
drop policy if exists "tickets_insert_own_or_staff" on public.tickets;
create policy "tickets_insert_own_or_staff" on public.tickets
  for insert with check (
    public.is_manager(auth.uid())
    or auth.uid()::text = user_id
    or auth.uid()::text = assigned_to
  );

drop policy if exists "tickets_update_own_or_staff" on public.tickets;
create policy "tickets_update_own_or_staff" on public.tickets
  for update using (
    public.is_manager(auth.uid())
    or auth.uid()::text = user_id
    or auth.uid()::text = assigned_to
  )
  with check (
    public.is_manager(auth.uid())
    or auth.uid()::text = user_id
    or auth.uid()::text = assigned_to
  );

-- 3. chat_messages: managers / ticket owner / assigned technician.
drop policy if exists "chat_insert_participants" on public.chat_messages;
create policy "chat_insert_participants" on public.chat_messages
  for insert with check (
    public.is_manager(auth.uid())
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.user_id = auth.uid()::text or t.assigned_to = auth.uid()::text)
    )
  );

drop policy if exists "chat_update_participants" on public.chat_messages;
create policy "chat_update_participants" on public.chat_messages
  for update using (
    public.is_manager(auth.uid())
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.user_id = auth.uid()::text or t.assigned_to = auth.uid()::text)
    )
  )
  with check (
    public.is_manager(auth.uid())
    or exists (
      select 1 from public.tickets t
      where t.id = ticket_id
        and (t.user_id = auth.uid()::text or t.assigned_to = auth.uid()::text)
    )
  );

-- 4. bookings: managers or the booking owner (previously any staff row).
drop policy if exists "bookings_write_staff" on public.bookings;
create policy "bookings_write_own_or_manager" on public.bookings
  for all using (
    public.is_manager(auth.uid()) or user_id = auth.uid()::text
  )
  with check (
    public.is_manager(auth.uid()) or user_id = auth.uid()::text
  );

-- 5. notifications: managers or the recipient (previously any staff row).
drop policy if exists "notifications_write_staff" on public.notifications;
create policy "notifications_write_own_or_manager" on public.notifications
  for all using (
    public.is_manager(auth.uid()) or user_id = auth.uid()::text
  )
  with check (
    public.is_manager(auth.uid()) or user_id = auth.uid()::text
  );

-- 6. payments: no client may write; service role only (0007 trigger already
--    enforces this; drop the leftover staff policy as belt-and-braces).
drop policy if exists "payments_write_staff" on public.payments;

-- 7. kb_articles / contact_messages: staff writes limited to managers.
drop policy if exists "kb_write_staff" on public.kb_articles;
create policy "kb_write_managers" on public.kb_articles
  for all using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

drop policy if exists "contact_update_staff" on public.contact_messages;
create policy "contact_update_managers" on public.contact_messages
  for update using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

-- 8. payments: amounts must never be negative.
alter table public.payments
  add constraint payments_amount_nonnegative check (amount >= 0);

-- 9. storage "attachments": MIME allowlist (browser previews + office docs) and
--    owner-only updates (was: any authenticated user could overwrite any file).
update storage.buckets
set allowed_mime_types = array[
  'image/png','image/jpeg','image/gif','image/webp',
  'application/pdf',
  'text/plain','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id = 'attachments' and allowed_mime_types is null;

drop policy if exists "attachments_update_auth" on storage.objects;
create policy "attachments_update_own" on storage.objects
  for update using (
    bucket_id = 'attachments' and owner_id = (select auth.uid()::text)
  );
