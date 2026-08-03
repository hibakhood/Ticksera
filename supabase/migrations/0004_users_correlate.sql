-- 0004_users_correlate.sql
-- Let staff read every profile so the admin dashboard Users/Organizations tabs
-- mirror the real registered users in the database (auth.users -> profiles).
-- Without this policy the anon-key client can only ever read its own profile,
-- so signups that never logged back in through the app stay invisible to the
-- dashboard.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It depends on 0001_init.sql (public.profiles + public.is_staff) being applied.

drop policy if exists "profiles_read_staff" on public.profiles;

create policy "profiles_read_staff" on public.profiles
  for select using (public.is_staff(auth.uid()));

-- Combined with the existing "profiles_read_own" policy, RLS now ORs them:
--   owners can still read their own row, and staff can read every row.
