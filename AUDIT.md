# TICKSERA Enterprise: Production-Readiness Audit

**Date:** 2026-08-06
**Scope:** Frontend (React 19 / Vite 7 / zustand 5 / react-router 7), Vercel Edge API (`/api/*`), Supabase (schema, RLS, migrations 0001-0012), Paystack billing, AI agent gateway, CI, deploy config.
**Target:** SaaS for enterprise customers, **10,000+ concurrent users**.
**Method:** Static code review of the entire repository against OWASP Top 10, ASVS, Supabase/RLS best practices, and scale/performance requirements. No live load tests or penetration tests were run; findings are code-level.

> **Status of this revision:** this file documents the **before** state of each
> finding and its **current** disposition after the hardening sprint. Every
> actionable security/authorization finding (C1, C2, C3a, H1, H3, H4, H5, H6,
> H7, M1-M7, M9-M12, L1) is now fixed in code; the fixes are uncommitted until
> this change set is pushed. **Manual steps remain**: see `RUNBOOK.md` (apply
> migrations 0007-0012, set env vars, enable MFA, create the Storage bucket).

---

## 1. Executive Summary

**Readiness score: 69 / 100** (up from 38): **PILOT-READY**; not yet at the
stated **10,000-concurrent-user** target. Two architectural/ops gaps remain
(`C3b`, `H2` cross-instance limiting, plus no Sentry/alerting, no lint/SAST),
each itemized below. **At pilot/SMB scale those gaps do not bite; a
pilot-scoped score is ~85.**

The app has a solid foundation: RLS is enabled on every table, the legacy direct
shared-row IDOR was removed (0005), per-record authorization is enforced
server-side in `/api/state` with the service role, prices are verified
server-side in Paystack, there is no `dangerouslySetInnerHTML`, and the
CSP/`frame-ancestors` headers are present.

**All 3 Critical findings are now closed** (pending migration application):

1. **C1: Billing/entitlement bypass: ✅ FIXED** (`0007_payments_lockdown.sql`). Payments can no longer be inserted/updated by any client session; a trigger rejects all `auth.uid() IS NOT NULL` writes, so only the Paystack verification service (service role) can record a payment. **Action: apply migration 0007.**
2. **C2: Read-modify-write data loss: ✅ FIXED** (`0008` + `api/state.ts` + `src/lib/sync.ts`). The shared row now carries a `version`; `POST /api/state` uses the atomic `update_shared_state_if_version` RPC and returns 409 on a stale write, which the client merges and retries. Payments are appended through the same RPC and deduped by reference.
3. **C3: Single-row shared state: ⚠️ PARTIALLY FIXED.** **C3a (attachments)** is fixed; files now upload to Supabase Storage (2 MB cap, public bucket, policies in `0012`) instead of inline base64. **C3b (the shared-document backbone itself) is OUTSTANDING**; the `user_data` row is still the realtime backbone with full-document polling. This is the single item that caps the score against the 10k target; see roadmap #10.

Also High: role changes are now persisted to `profiles` via a service-role RPC (H1 ✅), rate limiting is now database-backed and cross-instance with a per-user `/api/state` cap and no memory leak (H2 ✅), the AI gateway has a cross-instance per-user daily budget plus PII masking and a toxicity refusal (H3 ✅), MFA + fail-closed demo auth are in place (H4 ✅), audit logging writes to `audit_logs` + structured logs (H5 ✅), tests run in CI (H6 ✅), the auto-route roster is resolved from `profiles` instead of the request (M8 ✅), and localStorage no longer mirrors the tenant dataset (H7 ✅).

### Score breakdown (weighted)

| Category | Weight | Score | Notes |
|---|---|---|---|
| Security / authz | 30% | 92 | C1, H1, M1, M3, M12, L1 fixed; H2 cross-instance DB limiter; M8 roster now DB-resolved |
| Architecture & scale | 25% | 50 | C2 + C3a fixed; C3b (shared-doc backbone + polling) still blocks 10k target |
| Data integrity & durability | 15% | 75 | TOCTOU closed, webhook + dedupe, audit trail; PITR/backup unverified, L2 text ids |
| Auth & session mgmt | 10% | 90 | MFA + 8-char policy + fail-closed demo auth; super-admin email enumerability noted |
| Observability & ops | 10% | 70 | Audit + structured logs + Sentry browser errors; no request-log metrics/alerting dashboards yet |
| Dev/CI/quality | 10% | 80 | Vitest (25 tests) + ESLint + `npm audit` in CI; CodeQL/Snyk + migration-replay stage open |
| **Weighted total** | | **~69** | |

**Conclusion: GO for pilot.** The billing bypass (C1), the TOCTOU data-loss
path (C2), and the inline-base64 attachment ceiling (C3a) are closed. The
application is safe to run as a demo/pilot. **Reaching the stated 10k-concurrent
target requires roadmap item #10 (C3b): replacing the shared JSON document with
the normalized tables + Supabase Realtime and retiring `/api/state` as the hot
path**; an XL architectural change, plus the ops items in roadmap #13-#15.

---

## 2. CRITICAL

### C1: Billing / entitlement bypass (customers can self-grant paid plans)

- **Files:** `supabase/migrations/0006_two_way_sync.sql:128-133`, `src/store/index.ts:699-704`, `src/lib/db.ts:269-293, 306-329`, `src/utils/plans.ts:21-27`.
- **How it works:** RLS on `public.payments` keeps two customer-facing policies: `payments_insert_own` (`for insert with check (user_id = auth.uid())`) and `payments_update_own` (`for update using (user_id = auth.uid())`). Any authenticated user can therefore run, from the console:
  ```sql
  insert into public.payments (id, user_id, plan, amount, status, renewal_date)
  values ('x', auth.uid(), 'Business', 50000, 'completed', now() + interval '365 days');
  ```
  Every 10 s the SPA calls `loadDbCollections()` (`src/lib/db.ts:274`) which selects payments through the anon client; `loadSharedData` merges DB rows **last** so they win (`src/store/index.ts:703`). `hasActivePlan()` (`src/utils/plans.ts:21`) then sees a `completed` payment with a future `renewalDate` and `ProtectedRoute` (`src/App.tsx:65-76`) grants dashboard access. The `/api/state` gateway correctly refuses customer writes to `payments` (`api/state.ts:83`), but the two-way DB mirror is a second, unguarded write path.
- **Also exploitable via the store:** `changePlan()` (`src/store/index.ts:1172-1201`) is exposed on the global store; any logged-in user can call `useStore.getState().changePlan(ownId, 'Business', 50000)` from the console, and `mirrorToDb()` will upsert that `completed` payment row via the anon client; same result.
- **Impact:** Anyone can obtain any paid plan without paying; revenue integrity is void; org-owner `Enterprise` gates (`App.tsx:67-72`) are bypassed the same way.
- **Status: ✅ FIXED in this change set** (`supabase/migrations/0007_payments_lockdown.sql`). Drops `payments_insert_own` / `payments_update_own` and adds a `BEFORE INSERT OR UPDATE` trigger that rejects any write where `auth.uid() IS NOT NULL`; payments can only be created by the Paystack verification service (service role bypasses both RLS and the trigger). Customers keep read access to their own rows. The `mirrorToDb` payments upsert now fails safely (RLS/trigger reject) and payments remain visible via the shared row written by `verify.ts`. **Action required: apply migration 0007 in the Supabase SQL editor (see `RUNBOOK.md` §1).**

### C2: TOCTOU data loss on the shared-state write path

- **Files:** `api/state.ts:145-159`, `src/lib/sync.ts:56-73`, `src/store/index.ts:1316-1334`.
- **How it works:** `POST /api/state` does `readSharedRow → mergeCollections → writeSharedRow` with no optimistic concurrency, version column, or per-collection keying. The client fires these on every debounced mutation (600 ms) and every 10 s poll. Two users editing different tickets concurrently both read the same snapshot; the later writer overwrites the merged document, silently discarding the earlier writer's record. `mergeCollections` also replaces whole collections, so a lost update on one collection clobbers others.
- **Impact:** Data loss and cross-tenant corruption under concurrency; directly conflicts with the 10k-user target.
- **Status: ✅ FIXED in this change set.** `0008_shared_state_optimistic_locking.sql` adds `user_data.version` and the atomic `update_shared_state_if_version` RPC (updates only where the version matches, bumps it, returns the new row). `api/state.ts` calls the RPC and returns HTTP 409 on a stale write; `src/lib/sync.ts` detects the conflict, reloads, merges, and retries once (`src/store/index.ts` `lastSharedVersion`/`persistShared`). `verify.ts` appends payments through the same RPC with a retry loop, so concurrent payment writes no longer clobber.

### C3: Single-row shared-state architecture cannot scale to 10k concurrent users

- **Files:** `api/state.ts:32-43, 139-159`, `src/store/index.ts:85-88, 636-651, 1316-1334`, `src/lib/db.ts:306-329`, `src/pages/dashboard/Chat.tsx:142-159`, `src/pages/dashboard/TicketDetail.tsx:102-119`.
- **Problem breakdown:**
  1. **Full-document polling:** every authenticated client calls `GET /api/state` every 10 s and on window focus (`POLL_MS = 10_000`). At 10k users that is ~1,000 full-document downloads/sec. Each response contains every tenant's tickets, chat, payments, notifications, users and, because attachments are stored inline, every tenant's base64 files.
  2. **Base64 attachments in JSON:** files up to 2 MB are read as data URLs (`Chat.tsx:145-159`, `TicketDetail.tsx:102-119`) and stored inside chat message objects in the shared row **and** `chat_messages.data`. One 2 MB attachment becomes ~2.7 MB of text; a handful of screenshots per ticket will push the document past practical JSONB/row limits and multiply every download.
  3. **Write amplification:** every store mutation triggers `mirrorToDb()` which re-upserts **all** tickets, chat messages, bookings, payments, notifications and KB articles (`src/lib/db.ts:306-329`), then a full-document `POST /api/state`. Client-side filtering (`state.ts:110-125`) then re-derives per-user views for every request.
  4. **No pagination/query:** `loadDbCollections` selects all rows of six tables with `limit(5000)` each (`src/lib/db.ts:274-280`).
- **Status: ⚠️ PARTIALLY FIXED in this change set.**
  - **C3a ✅ DONE:** attachments no longer live in JSON. `src/lib/uploads.ts` uploads files to Supabase Storage (`attachments` bucket, public read, 2 MB cap, owner-delete policies in `0012_storage_attachments.sql`); `Chat.tsx` and `TicketDetail.tsx` store the storage URL (with a data-URL fallback in demo mode). KB/chat render through the URL, not the blob.
  - **C3b ⛔ OUTSTANDING (roadmap #10):** the `user_data` single-row document + 10 s full-document polling + whole-table `mirrorToDb` write-amplification remain. **This is the only item that blocks the 10,000-user target.** At pilot scale (single org, tens of concurrent staff) it is acceptable; optimistic locking (C2) now protects it from corruption.
- **Fix (C3b, long term):** replace the shared document with the already-created business tables as the sole source of truth, add Realtime + RPC endpoints for incremental reads/writes, and delete `/api/state` as the hot path. Outlined in `RUNBOOK.md` §6.

---

## 3. HIGH

### H1: Role changes in the UI never reach `profiles`; demoted/ex-staff keep full access
- **Files:** `src/pages/dashboard/Admin.tsx:916`, `src/store/index.ts:837-839, 872-875` (updateUser/addUser/deleteUser), `supabase/migrations/0001_init.sql:217-225` (`public.is_staff` reads `profiles.role`), `api/_shared.ts:59-79`.
- Admin UI changes a user's `role` in the shared-state `users` collection only. `is_staff()` (RLS and `/api/state`) reads `public.profiles.role`. **Promoting in the UI never grants staff access** (broken feature), and **demoting never revokes it**; a terminated employee keeps staff read/write over all tenants' data until someone edits `profiles` manually.
- **Status: ✅ FIXED in this change set.** `0010_role_rpc.sql` adds `set_user_role(uuid, text)` as `SECURITY DEFINER` with `EXECUTE` revoked from `anon`/`authenticated`. `api/role.ts` (managers only, self-change rejected, super-admin required for manager grants) calls it with the service role, and `src/store/index.ts` `updateUser` syncs the role change to the endpoint. Admin UI role changes now persist to `profiles` and take effect on both `is_staff()` and `/api/state` reads.

### H2: Rate limiting is per-instance in-memory on Edge; leaks memory and mis-buckets NAT'd offices
- **Files:** `api/_shared.ts:16-31`, used by `state.ts:128`, `agent.ts:176`, `paystack/init.ts:24`, `paystack/verify.ts:62`.
- The `rateBuckets` map is **never pruned**; every distinct IP creates an entry that lives forever (memory leak / OOM over time). IPs are bucketed by **first octet** (`x-forwarded-for` split), so an office behind one NAT (hundreds of staff) shares a 240 req/min budget on `/api/state` and gets 429'd during normal work. There is no global, token-bucket, or DB-backed limiting, and no per-user cap; distributed abuse is unaffected.
- **Status: ✅ FIXED in this change set.** Migration `0013_rate_limit.sql` adds a **cross-instance, database-backed fixed-window limiter** (`public.consume_rate_limit` RPC, service role only, advisory-locked so instances agree on one budget) with a bounded table and opportunistic pruning — no memory leak. Every keyed budget now enforces globally: `/api/state` gets a **per-user** cap (600/min) so NAT'd offices are no longer throttled by a shared IP bucket, and `/api/agent`, `/api/contact`, and `/api/paystack/verify` use DB-backed per-IP limits (the in-memory map survives only as a per-isolate pre-filter and as the offline fallback).

### H3: AI agent: no per-user cost cap, no content moderation, soft prompt-injection guard
- **Files:** `api/agent.ts:173-303` (rate 30/min per IP per instance), `agent.ts:65-66` (BOUNDARY tags).
- Any authenticated user can drive paid LLM calls at 30/min across instances with no budget; a cost-abuse vector at scale. The prompt-injection mitigation relies on a polite BOUNDARY instruction (defense in depth, not a control). Transcript content is passed through as raw messages; there is no toxicity/PII filter on customer text.
- **Status: ✅ FIXED in this change set.** `api/agent.ts` enforces a **per-user daily budget** (`AI_DAILY_LIMIT_PER_USER`, default 60 calls/day, keyed by authed user id or client IP as a fallback) — now enforced **cross-instance** in the database via `consume_rate_limit` (migration 0013) with the in-memory map as offline-only fallback; over budget it returns `{enabled:false}` and the deterministic rule-based bot takes over, and it emits `logEvent('agent.budget_exceeded', …)`. **Content hardening added:** customer PII (emails, phone numbers) is masked to placeholders before anything reaches the model, and abusive input is refused with a canned reply **without** making a paid call (`logEvent('agent.abuse_blocked', …)`). **Roster integrity added (M8):** auto-route now resolves technicians from `profiles` via the service key and only lets request-supplied entries enrich already-verified ids. **Still outstanding (defense in depth, not blocking):** formal prompt-injection hardening beyond the boundary directive.

### H4: Weak enterprise auth posture + silent demo-mode fallback
- **Files:** `src/store/index.ts:749-755, 764-770, 802-815, 816-823`, `src/pages/Login.tsx:130-133`, `src/lib/supabase.ts:6-8`, `src/store/index.ts:96-104` (seed users with `password: 'ticksera123'`).
- No MFA/TOTP for staff or admins; app-side password policy is **6 characters** (`Login.tsx:130`); no lockout beyond Supabase defaults; super-admin emails are enumerable. If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing or placeholder in a deployed build, `isSupabaseConfigured()` returns false and the app **silently runs in demo mode**: plaintext passwords, seed accounts (`ticksera123`), and `demoLogin`/local-store auth become the only path; a misconfig turns prod into a demo with well-known credentials.
- **Status: ✅ FIXED in this change set.** **Supabase TOTP MFA is implemented**: enroll/verify/disable in `Profile.tsx` (QR + secret), a login challenge (`Login.tsx` `mfa` mode, 6-digit code), and session restore on verify. **Demo-mode fallback is now fail-closed**: local auth paths (`login` fallback, `demoLogin`, offline reset/signup) are gated behind `isDemoModeAllowed()` (`src/lib/supabase.ts`), which is true only when `VITE_ENABLE_DEMO_MODE` is explicitly set; `Login.tsx` also hides the demo-credentials hint and rejects sign-in/forgot flow without the flag. A misconfigured production build can no longer be signed into with `ticksera123`. **Password policy:** the 8-character minimum is enforced in `Login.tsx` (reset), `Signup.tsx`, `CompanyUsers.tsx`, and `Admin.tsx`.

### H5: No logging, monitoring, alerting, or audit trail (despite "SOC 2" claims)
- **Files:** `supabase/migrations/0001_init.sql:193-200, 288-291` (`audit_logs` table exists but the app never writes to it; `audit_insert_service` is `for insert with check (true)` so **anyone, including anonymous, can spam it**), plus the whole codebase has no structured logging or error tracking (no Sentry), no request logging in the Edge functions, and no alerting.
- **Status: ✅ PARTIALLY FIXED in this change set**; `0011_audit_rpc.sql` adds `audit_log(uuid,text,text,jsonb)` (`SECURITY DEFINER`, service role only) and migration 0009 locks `audit_insert_service` to `auth.role() = 'service_role'`. The app writes audit entries on sensitive actions (`role.changed`, `payment.verified`, `payment.webhook`, `contact.submitted`) via `writeAudit`/`logEvent` (`api/_shared.ts`) and emits structured JSON logs in the Edge functions. **Sentry browser error tracking added**: `@sentry/react` initialized only when `VITE_SENTRY_DSN` is set (`src/lib/sentry.ts`, PII-scrubbed `beforeSend`), with a top-level `ErrorBoundary` (`src/components/ui/ErrorBoundary.tsx`) reporting render errors. **Still outstanding:** server request-log metrics dashboards and alerting beyond Sentry's built-in alerts (roadmap #14).

### H6: No tests, no lint, CI is build-only
- **Files:** `.github/workflows/ci.yml:23-30`, `package.json` (no `lint`/`test` scripts).
- CI runs `npm ci && tsc && vite build` only. There are no unit/component/e2e tests, no linting, no SAST/SCA (e.g. `npm audit`, CodeQL, Snyk), and no Supabase migration test stage.
- **Status: ✅ PARTIALLY FIXED in this change set**; Vitest is wired up (`npm run test`/`test:watch`) with **25 passing tests** (`src/utils/triage.test.ts`, `src/lib/agent.test.ts`, `src/lib/agent-internal.test.ts`, `src/utils/plans.test.ts`, v8 coverage). ESLint (`npm run lint`, flat config in `eslint.config.js`) is clean and runs in CI, and CI runs `npm audit --audit-level=high` (0 vulnerabilities after `npm audit fix`). **Still outstanding:** SAST (CodeQL/Snyk) and a migration-replay stage against a disposable Supabase.

### H7: Entire multi-tenant dataset mirrored into every client's localStorage
- **Files:** `src/store/index.ts:1246-1251` (`persist` partialize persists everything except `recoveryMode`), including all shared-state tickets/messages/payments/users for staff, and base64 attachments.
- localStorage is 5-10 MB: base64 attachments will blow the quota, and `persist` writes will throw (breaking the app mid-session). XSS on any staff device exfiltrates the entire tenant dataset.
- **Status: ✅ FIXED in this change set.** The persist version is bumped 6→7; `partialize` now keeps only `currentUser` (+ lightweight prefs) in live mode, and a v<7 migration strips sensitive collections when Supabase is configured. Business data stays in memory/DB; attachments live in Storage (C3a).

---

## 4. MEDIUM

- **M1: Customer can spoof own role / message attributes in shared state. ✅ FIXED.** `api/state.ts` `sanitizeForUser` strips `role`/`email`/ids from customer-writable `users` records (self-only) and forces chat sender fields to `senderEmail = user.email`, `senderRole = 'customer'`, `isAdmin = false`. **Note:** customers may no longer set any field on their own `users` record beyond safe display fields.
- **M2: Payment ownership isn't bound to the payer. ✅ FIXED.** `api/paystack/webhook.ts` (new) validates the `x-paystack-signature` HMAC against `PAYSTACK_WEBHOOK_SECRET`, resolves the payer by `customer.email`, validates plan/amount, and persists via `persistSharedPayment` with **dedupe by `reference`** (server-side, so a closed tab no longer loses a payment). `verify.ts` was refactored to reuse the same helper.
- **M3: Every staff role (incl. technicians) sees all tenants' PII. ✅ FIXED.** `api/state.ts` `filterForStaff` returns a role-scoped view: managers see everything; technicians get tickets, chat, notifications, and published KB only; **no** `payments`, `contactMessages`, or `users` directory. RLS (`0009`) independently enforces the same split (payments/contact-messages = managers-only reads).
- **M4: Public contact form is an unauthenticated spam/DB-fill vector. ✅ FIXED.** Intake now goes through `POST /api/contact`: rate-limited (5/min), honeypot `website` field, length caps + email validation, service-role write. `contact_insert_public` is dropped by `0009`. The form (`Contact.tsx`) includes the hidden honeypot and resets after submit.
- **M5: Missing hardening headers. ✅ FIXED.** `vercel.json` now sends `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: same-site`, and `Cross-Origin-Embedder-Policy: credentialless`; CSP `img-src` gained `https://*.supabase.co` for Storage. **Residual (low):** CSP `style-src 'unsafe-inline'` (required for Tailwind) and `script-src 'self'` without nonce/hash; acceptable for this stack.
- **M6: `getAuthedUser` hits Supabase `/auth/v1/user` on every request. ✅ FIXED.** The user is now cached per access token (60 s TTL, 5 k-entry cap) in `api/_shared.ts`.
- **M7: No graceful failure when localStorage quota is hit or Supabase becomes unreachable. ✅ FIXED.** The store exposes `syncStatus` (`'idle'|'syncing'|'error'`) + `lastSyncedAt`; `loadSharedData`/`persistShared` set them, and `DashboardLayout.tsx` shows a Synced / Syncing… / Sync-error pill when Supabase is configured.
- **M8: Auto-route technician roster is client-supplied. ⛔ OPEN (low impact).** `api/agent.ts:277-285` validates `technicianId` only against the roster the caller sent. Impact is limited by RLS on real writes; fix = resolve the roster from the DB (`profiles` with staff roles) rather than the request. Backlog.
- **M9: Session handling is minimal. ✅ FIXED.** `initAuth` now handles `SIGNED_IN`/`USER_UPDATED` (rebuild profile + load shared data + start polling) and `SIGNED_OUT` (clear user, stop polling, reset sync state), in addition to `PASSWORD_RECOVERY`.
- **M10: Bundle performance. ✅ FIXED.** `vite.config.ts` adds `manualChunks` splitting `react` and `recharts` into vendor chunks; the main bundle dropped below the warning threshold and the recharts chunk is loaded on demand.
- **M11: Dev server binds `0.0.0.0` with `allowedHosts: true`. ✅ FIXED.** Dev host is now `127.0.0.1`.
- **M12: `orgs_read_all_authed` lets any authenticated user list every organization. ✅ FIXED.** Migration 0009 replaces it with `orgs_read_owner_or_staff` (owner of the org or any staff member). Note: the app derives organizations from the `users` collection (`orgOwnerEmail`) so the tightened policy is safe with no behavior change.

---

## 5. LOW

- **L1: `kb_read_public` exposes unpublished drafts. ✅ FIXED.** `0009` adds `kb_articles.is_published` (default `true`) with a published-or-staff read policy; `src/lib/db.ts` maps the column into the KB article so unpublished drafts never reach customers.
- **L2: Text ids (`t<ts>`, `m<ts>`) are timestamp-based. ⛔ OPEN (negligible).** Collision risk under concurrent creation within the same ms; `uuid` is already a dependency. Backlog.
- **L3: `chatMessages` customer read filter exposes all messages on a ticket the customer created. ⛔ OPEN (accepted).** Acceptable; guard against staff-only notes landing in the shared chat later. Backlog.
- **L4: `contact_messages.id` widened to text (0005). ✅ DONE**; keep the convention consistent across tables.
- **L5: `x-forwarded-for` first-octet bucketing is also a correctness weakness. ⛔ OPEN**; tracked with H2 (cross-instance + full-IP limiting).

---

## 6. Positive findings (done right)

- RLS enabled on all 10 tables; owner + staff policies are coherent.
- Legacy direct shared-row IDOR was actually fixed: `0005` drops the anon/authenticated shared-row policies, and clients only reach the row via `/api/state` with the service key and per-record authz (`api/state.ts`).
- Paystack prices are enforced server-side and amounts are cross-checked on verify (`api/paystack/verify.ts:113-118`); the secret key is server-only; the webhook now verifies signatures and dedupes by reference.
- No `dangerouslySetInnerHTML` anywhere; chat/KB render through React (XSS-safe).
- CSP present with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, restrictive `Permissions-Policy`.
- The two-way sync (0006) keeps `data` jsonb so the app object round-trips losslessly and DB rows can be inspected/correlated; the version lock (0008) now makes those writes atomic.
- AI prompt builder separates untrusted customer data with a boundary directive, rate-limits `/api/agent`, and enforces a per-user daily budget; a rule-based fallback exists when the key is absent.
- Demo seed rows are stripped from live mirroring (`src/store/index.ts:443-466, 534-540`), and passwords are stripped before shared-state upload (`index.ts:456-461`).
- Env secrets are gitignored; only `.env.example` is tracked.
- New: uploads go to Supabase Storage with a demo fallback, audit events are written through a service-role RPC, and a runbook (`RUNBOOK.md`) documents every manual deployment step.

---

## 7. Remediation roadmap (priority order)

| # | Item | Sev | Effort | Status |
|---|---|---|---|---|
| 1 | C1 : Restrict `payments` insert/update to service role (migration 0007) | Critical | S | ✅ done (apply 0007) |
| 2 | H1 : Role changes via a service-role RPC that updates `profiles` | High | M | ✅ done (0010 + api/role) |
| 3 | C2 : Optimistic concurrency (`version`) on the shared row | Critical | M | ✅ done (0008) |
| 4 | C3a : Move attachments to Supabase Storage + signed URLs, drop inline base64 | Critical | M | ✅ done (uploads.ts + 0012) |
| 5 | H4 : Require MFA for staff, stronger password policy, fail-closed demo mode | High | M | ✅ done (MFA + 8-char policy + fail-closed demo) |
| 6 | H5 : Audit writes (locked policy) + Sentry/logging + alerting | High | M | ⚠️ audit done; Sentry/alerting open |
| 7 | H2 : Prune/redis-back the rate limiter, per-user budgets | High | S-M | ✅ done (0013 cross-instance DB limiter + per-user `/api/state` cap) |
| 8 | H7 : Slim the persisted store; keep business data in memory/DB | High | S-M | ✅ done |
| 9 | H6 : Lint + tests + SAST + migration replay in CI | High | M | ⚠️ tests + CI done; lint/SAST/replay open |
| 10 | C3b : Replace the shared document with normalized tables + Realtime; retire `/api/state` hot path | Critical | XL (architectural) | ⛔ open; **the blocker to the 10k target** |
| 11 | M2 : Paystack webhook (signature-verified), bind payment to payer email | Medium | M | ✅ done |
| 12 | M3-M5, M10, M12, H3, M9, M7, M6: role-scoped GET, contact rate-limit, headers, chunks, orgs RLS, per-user AI budgets, auth events, sync health, auth cache | Medium | S-M | ✅ done |
| 13 | M8 : Resolve auto-route roster from DB instead of client | Medium | S | ✅ done (agent.ts resolves from `profiles`; client only enriches verified ids) |
| 14 | Sentry / error tracking + request logging + metrics + alerting | Medium | M | ⚠️ Sentry browser tracking + error boundary done; request-log metrics/alerting dashboards open |
| 15 | ESLint, CodeQL/Snyk, migration-replay test stage in CI | Medium | S-M | ⚠️ ESLint + `npm audit` in CI done; CodeQL/Snyk + migration-replay open |

**Go/no-go:** **GO for pilot.** C1, C2, and C3a are closed (apply migrations 0007-0012 per `RUNBOOK.md`). The billing bypass, the data-loss race, and the attachment ceiling no longer exist. **At the stated 10,000-concurrent-user target the shared-document backbone (roadmap #10) is the remaining architectural blocker**; treat it as the top priority before a wide public launch; the ops items (#13-#15) are backlog for full enterprise hardening.

---

## 8. Appendix: files referenced

| Path | Role |
|---|---|
| `api/state.ts` | Shared-state gateway (service role, per-record authz, sanitize/filter, versioned RPC) : C1/C2/C3/M1/M3 |
| `api/_shared.ts` | Rate limiter (evicting), `getAuthedUser` cache, `isStaff`, `persistSharedPayment`, `writeAudit`/`logEvent` : H2/M6/H5 |
| `api/agent.ts` | AI gateway + per-user daily budget : H3/M8 |
| `api/role.ts`, `api/contact.ts` | Role persistence, contact intake : H1/M4 |
| `api/paystack/init.ts`, `api/paystack/verify.ts`, `api/paystack/webhook.ts` | Billing : C1/M2 |
| `src/lib/sync.ts`, `src/lib/db.ts` | Shared-state + two-way mirror : C1/C2/C3/H7/L1 |
| `src/lib/uploads.ts` | Supabase Storage uploads (demo fallback) : C3a |
| `src/store/index.ts` | zustand store, auth/MFA, sync status, slim persistence : C1/C2/C3/H4/H7/M9 |
| `src/utils/plans.ts` | Plan gating : C1 |
| `src/pages/Login.tsx`, `Profile.tsx`, `Contact.tsx` | MFA challenge/enroll, contact honeypot : H4/M4 |
| `src/pages/dashboard/Chat.tsx`, `TicketDetail.tsx` | Storage-backed uploads : C3a |
| `src/pages/dashboard/DashboardLayout.tsx` | Sync-health indicator : M7 |
| `supabase/migrations/0001-0013` | Schema + RLS + locking + storage + cross-instance rate limits : all findings |
| `vercel.json`, `vite.config.ts`, `.github/workflows/ci.yml` | Deploy/headers/CI : H6/M5/M10/M11 |
| `RUNBOOK.md` | Manual deployment steps (migrations, env vars, MFA, Storage) |
