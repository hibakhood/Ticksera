-- 0007_payments_lockdown.sql
-- Close the billing/entitlement bypass: customers could self-grant paid plans.
--
-- The two-way mirror (migration 0006) makes public.payments a source of truth
-- the SPA reads back, but RLS still allowed the OWNER to insert and update
-- their own rows with any plan/amount/status. Anyone with a free account could
-- add a 'completed' Business payment for themselves and unlock the dashboard.
--
-- Payments are authoritative ONLY from api/paystack/verify.ts (service role,
-- which bypasses RLS). Customers keep read access to their own rows. The DB
-- payments table is write-protected for every client (staff included): staff
-- can still record payments via the /api/state gateway and the shared row,
-- which is what the dashboards read. The trigger below enforces this at the
-- database level so a future policy change cannot silently reopen the hole.
--
-- Run this after 0006_two_way_sync.sql in the Supabase SQL editor.

drop policy if exists "payments_insert_own" on public.payments;
drop policy if exists "payments_update_own" on public.payments;

-- Belt-and-braces: even if a future migration reintroduces owner policies, a
-- non-staff client may never write a completed/pending payment outside the
-- Paystack verification flow. Service role bypasses triggers, so this only
-- constrains anon/authenticated writers.
create or replace function public.reject_client_payment_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'payments may only be written by the Paystack verification service';
end;
$$;

drop trigger if exists payments_client_write_guard on public.payments;
create trigger payments_client_write_guard
  before insert or update on public.payments
  for each row
  when (auth.uid() is not null)
  execute function public.reject_client_payment_write();
