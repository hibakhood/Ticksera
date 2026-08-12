# Ticksera Enterprise: Production Deployment & Hardening Runbook

This runbook lists the **manual steps only you can do** (Supabase dashboard /
Vercel / Paystack) plus what the codebase now does on its own. It pairs with
`AUDIT.md`; each item below references the issue it closes.

## 1. Apply the database migrations

In the Supabase Dashboard → **SQL Editor**, run these files **in order** (they
must be applied even though migrations 0001-0006 exist in the repo):

| File | Fixes | Notes |
| --- | --- | --- |
| `supabase/migrations/0007_payments_lockdown.sql` | C1 | Drops permissive client payment policies; rejects any client-side write to `payments`. |
| `supabase/migrations/0008_shared_state_optimistic_locking.sql` | C2 | Adds `user_data.version` + the atomic `update_shared_state_if_version` RPC. |
| `supabase/migrations/0009_least_privilege_and_audit.sql` | M3, M4, M12, H5, L1 | Payments/contact messages read = managers only; contact intake no longer public; orgs = owner-or-staff; audit inserts = service role only; adds `kb_articles.is_published`. |
| `supabase/migrations/0010_role_rpc.sql` | H1 | `set_user_role` RPC (service role only) so role changes hit the DB. |
| `supabase/migrations/0011_audit_rpc.sql` | H5 | `audit_log` RPC (service role only) for immutable audit history. |
| `supabase/migrations/0012_storage_attachments.sql` | C3 | Creates the public `attachments` Storage bucket (2 MB cap) + policies. |

> After applying, confirm in the dashboard that `user_data` now has a `version`
> column and that the three `SECURITY DEFINER` functions exist:
> `update_shared_state_if_version`, `set_user_role`, `audit_log`.

## 2. Supabase: enable & configure security features

- **Email confirmations ON**: Authentication → Providers → Email → confirmations.
- **MFA**: Authentication → Multi-factor → TOTP enabled (the app exposes
  enroll/verify in **Profile → Two-Factor Authentication**, and login will ask
  for a code once a user has one). Enforce it for staff with an
  **Auth policy** (SQL): e.g.
  ```sql
  create policy "mfa_enroll_staff" on auth.mfa_factors
    for insert with check (auth.uid() = user_id);
  ```
- **Storage**: bucket `attachments` is created by migration 0012. Verify it is
  **public** (Storage → Buckets → `attachments` → Public). If you prefer a
  private bucket, change `src/lib/uploads.ts` to `createSignedUrl` instead of
  `getPublicUrl`.
- **Service role key**: keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. It
  must **never** be in the client bundle (`VITE_*`).

## 3. Vercel environment variables

Set these in the Vercel project (Settings → Environment Variables):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Client Supabase URL. |
| `VITE_SUPABASE_ANON_KEY` | Client anon key. |
| `SUPABASE_URL` | Server URL for Edge functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server service-role key. |
| `SUPER_ADMIN_EMAILS` | Comma list; **must mirror** `VITE_SUPER_ADMIN_EMAIL` (bootstrap admins + server-side staff check). |
| `PAYSTACK_SECRET_KEY` | Enables checkout. |
| `PAYSTACK_WEBHOOK_SECRET` | **New**: signature secret for `/api/paystack/webhook`. |
| `RESEND_API_KEY` | Transactional email (optional). |
| `AI_API_KEY` | Enables the AI agent (OpenRouter). Leave empty to keep the deterministic bot. |
| `AI_DAILY_LIMIT_PER_USER` | Optional per-user AI budget/day (default 60). |
| `VITE_ENABLE_DEMO_MODE` | **New**: set `true` to opt into local/demo auth (seed accounts `ticksera123`, offline reset/signup). **Do not set in production**; without it the app fails closed when Supabase isn't configured. |

## 4. Paystack webhook

1. Dashboard → Settings → Webhooks → **Add endpoint**.
2. URL: `https://<your-domain>/api/paystack/webhook`.
3. Events: select **charge.success** (send all if unsure).
4. Copy the **Webhook Secret** into `PAYSTACK_WEBHOOK_SECRET` in Vercel.
5. Keep `metadata.plan` = `Basic | Professional | Business` on
   `transaction.initialize` (the client already does this); the webhook only
   records matching plan/amount charges.

## 5. What the code now does (no action needed)

- **C2: lost-update protection**: every client save is version-checked by the
  DB RPC; stale writes get a 409 and the client reloads, merges and retries.
  Payments are appended through the same atomic RPC and deduped by reference.
- **M1: write sanitization**: customer-writable records are filtered
  server-side (`users` → self only, no `role`/`email`; chat sender fields are
  forced; notifications scoped to the caller).
- **M3: least privilege**: the `/api/state` read view is role-scoped.
  Customers see only their own data + published KB; technicians get no
  payments/contact-messages/user-directory; managers see everything.
- **M4: contact form**: intake now goes through `POST /api/contact`
  (rate-limited, honeypot-protected, server-side write). The public insert
  policy is dropped by migration 0009.
- **H1: role changes**: `POST /api/role` (managers only) persists to
  `profiles` via `set_user_role`; nobody can change their own role.
- **H4: MFA**: enroll/disable in Profile; login challenges with a 6-digit code.
- **H5: audit logging**: sensitive actions (`role.changed`, `payment.verified`,
  `payment.webhook`, `contact.submitted`) are written to `audit_logs` via the
  service-role RPC + emitted as structured JSON logs in Vercel.
- **H6: tests**: `npm run test` (Vitest) runs in CI alongside typecheck + build.
- **H7: storage**: in live mode localStorage keeps only `currentUser`, never
  tenant collections.
- **H3: AI cost caps**: per-user daily budget + per-IP rate limit; over budget
  the deterministic bot takes over. Budgets are enforced **cross-instance** in
  the database (migration 0013), PII is masked before the prompt, abusive
  content is refused without a model call, and the auto-route roster is
  resolved from `profiles`, never from the request.

## 6. Known remaining limitations (documented, not blocking)

- **C3b: single-row shared state**: the `user_data` row remains the real-time
  backbone. This is fine at 10k users; the long-term architecture is multiple
  RPCs over the relational tables. Itemized in `AUDIT.md`.
- **L2: id generation** is timestamp-based (`t<ts>`, `c<ts>`, …) rather than
  UUID; collision risk is negligible at this scale.
- **H4 (demo auth) is now fail-closed**: when Supabase isn't configured, local
  auth (seed accounts `ticksera123`, offline reset/signup) only works if the
  build explicitly sets `VITE_ENABLE_DEMO_MODE=true`. A production build
  missing the Supabase vars can no longer be signed into via the seed accounts.

## 7. Verify after deploy

1. `npm run typecheck && npm run test && npm run build` locally → all green.
2. Sign in as a customer → open a ticket → send a chat attachment → confirm it
  renders (storage URL in the message) and the row in `user_data` has no
  base64 blob.
3. Two browsers open the same ticket; edit in both → the loser gets a re-merge
  (green "Synced" pill in the header shows health; red = error).
4. Contact page → submit → row appears in `contact_messages` and `audit_logs`.
5. Change a user's role in Admin → check `profiles.role` updated + audit entry.
6. Enable MFA in Profile → sign out → sign in → prompted for a code.
7. Pay with a test card → webhook fires → payment recorded once (no dup).
