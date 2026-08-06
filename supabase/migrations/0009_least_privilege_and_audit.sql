-- 0009_least_privilege_and_audit.sql
-- Tighten RLS to least privilege and close remaining write vectors.
--
-- 1. Payments and contact messages are customer PII: only managers
--    (super_admin / support_manager) may read them. Technicians no longer
--    receive the full customer dataset from the DB or the shared row.
-- 2. organizations are only readable by their owner or staff (the app derives
--    its Organizations tab from profiles/users, not this table, so nothing
--    breaks).
-- 3. audit_logs inserts are restricted to the service role so anonymous and
--    authenticated users can no longer spam the audit table.
-- 4. kb_articles: unpublished drafts are hidden from non-staff readers.

-- 1. Payments: managers only.
drop policy if exists "payments_read_staff" on public.payments;
create policy "payments_read_managers" on public.payments
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'support_manager')
    )
  );

-- 2. Contact messages: intake is now server-side (api/contact.ts uses the
--    service role), so drop the permissive public insert policy that allowed
--    anyone to spam arbitrary rows from the browser. Reading stays manager-only.
drop policy if exists "contact_insert_public" on public.contact_messages;
drop policy if exists "contact_read_staff" on public.contact_messages;
create policy "contact_read_managers" on public.contact_messages
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'support_manager')
    )
  );

-- 3. Organizations: owner or staff.
drop policy if exists "orgs_read_all_authed" on public.organizations;
create policy "orgs_read_owner_or_staff" on public.organizations
  for select using (owner_id = auth.uid() or public.is_staff(auth.uid()));

-- 4. audit_logs: only the service role may insert (the app writes audit
--    entries server-side through the service key / a SECURITY DEFINER RPC).
drop policy if exists "audit_insert_service" on public.audit_logs;
create policy "audit_insert_service" on public.audit_logs
  for insert with check (auth.role() = 'service_role');

-- 5. kb_articles: hide unpublished drafts from non-staff readers. The scalar
--    column mirrors the app's isPublished flag (written by the two-way sync).
alter table public.kb_articles add column if not exists is_published boolean not null default true;
drop policy if exists "kb_read_public" on public.kb_articles;
create policy "kb_read_public" on public.kb_articles
  for select using (is_published is true or public.is_staff(auth.uid()));
