# FIXORA Enterprise — Production-Readiness Audit

**Date:** 2026-08-06
**Scope:** Frontend (React 19 / Vite 7 / zustand 5 / react-router 7), Vercel Edge API (`/api/*`), Supabase (schema, RLS, migrations 0001–0006), Paystack billing, AI agent gateway, CI, deploy config.
**Target:** SaaS for enterprise customers, **10,000+ concurrent users**.
**Method:** Static code review of the entire repository against OWASP Top 10, ASVS, Supabase/RLS best practices, and scale/performance requirements. No live load tests or penetration tests were run — findings are code-level.

---

## 1. Executive Summary

**Readiness score: 38 / 100 — NOT READY FOR PRODUCTION.**

The app has a solid foundation: RLS is enabled on every table, the legacy direct shared-row IDOR was removed (0005), per-record authorization is enforced server-side in `/api/state` with the service role, prices are verified server-side in Paystack, there is no `dangerouslySetInnerHTML`, and the CSP/`frame-ancestors` headers are present.

However there are **3 Critical** findings that block the stated target:

1. **C1 — Billing/entitlement bypass.** A signed-in customer can grant themselves any paid plan by inserting or updating their own row in `public.payments` through the anon-key client (RLS permits it) — the app then mirrors that row back into the store and unlocks the dashboard. Paywalls are effectively decorative.
2. **C2 — Read-modify-write data loss on the shared state.** `POST /api/state` is a fetch→merge→overwrite of one global row with no locking or versioning. Under 10k concurrent writers, updates are silently lost and one user's save can clobber another tenant's data.
3. **C3 — The single-row shared-state architecture cannot carry the workload.** Every client downloads the **entire multi-tenant document** (all tickets, messages, payments, users, and 2 MB base64 file attachments of every tenant) every 10 seconds, and every mutation re-upserts all business rows. This fails at scale and will exceed Postgres document-size limits quickly.

Also High: role changes made in the UI never propagate to `profiles` (RLS source of truth) so demoted staff retain full access, per-instance in-memory rate limiting that leaks memory and mis-buckets NAT'd offices, an unprotected AI-credit spend surface, no MFA, no logging/monitoring/audit trail (despite a "SOC 2 compliant" claim), and no tests.

### Score breakdown (weighted)

| Category | Weight | Score | Notes |
|---|---|---|---|
| Security / authz | 30% | 50 | Good RLS base; C1 billing bypass, H1 role retention, M1 role spoofing |
| Architecture & scale | 25% | 15 | C2, C3, per-instance rate limits, full-doc polling |
| Data integrity & durability | 15% | 30 | TOCTOU overwrites, no PITR/backup config verified, no webhook |
| Auth & session mgmt | 10% | 45 | No MFA, weak password policy, silent demo-mode fallback |
| Observability & ops | 10% | 15 | No logs, monitoring, alerting, audit writes, or error tracking |
| Dev/CI/quality | 10% | 40 | No tests, no lint, CI build-only |
| **Weighted total** | | **~38** | |

**Conclusion: NO-GO for production at 10,000+ concurrent users.** The billing bypass (**C1**) has been **fixed** as part of this change set (`0007_payments_lockdown.sql` — apply it in the Supabase SQL editor) and must be applied before any paid customer is onboarded; C2/C3 require an architectural change (normalized tables + realtime, not a shared JSON document) before scaling past single-digit concurrent writers. The application is safe to run as a demo/pilot with a handful of concurrent users once 0007 is applied. (Security category improves to ~65 and the weighted score to ~42 after the bundled fixes.)

---

## 2. CRITICAL

### C1 — Billing / entitlement bypass (customers can self-grant paid plans)

- **Files:** `supabase/migrations/0006_two_way_sync.sql:128-133`, `src/store/index.ts:699-704`, `src/lib/db.ts:269-293, 306-329`, `src/utils/plans.ts:21-27`.
- **How it works:** RLS on `public.payments` keeps two customer-facing policies: `payments_insert_own` (`for insert with check (user_id = auth.uid())`) and `payments_update_own` (`for update using (user_id = auth.uid())`). Any authenticated user can therefore run, from the console:
  ```sql
  insert into public.payments (id, user_id, plan, amount, status, renewal_date)
  values ('x', auth.uid(), 'Business', 50000, 'completed', now() + interval '365 days');
  ```
  Every 10 s the SPA calls `loadDbCollections()` (`src/lib/db.ts:274`) which selects payments through the anon client; `loadSharedData` merges DB rows **last** so they win (`src/store/index.ts:703`). `hasActivePlan()` (`src/utils/plans.ts:21`) then sees a `completed` payment with a future `renewalDate` and `ProtectedRoute` (`src/App.tsx:65-76`) grants dashboard access. The `/api/state` gateway correctly refuses customer writes to `payments` (`api/state.ts:83`), but the two-way DB mirror is a second, unguarded write path.
- **Also exploitable via the store:** `changePlan()` (`src/store/index.ts:1172-1201`) is exposed on the global store; any logged-in user can call `useStore.getState().changePlan(ownId, 'Business', 50000)` from the console, and `mirrorToDb()` will upsert that `completed` payment row via the anon client — same result.
- **Impact:** Anyone can obtain any paid plan without paying; revenue integrity is void; org-owner `Enterprise` gates (`App.tsx:67-72`) are bypassed the same way.
- **Status: ✅ FIXED in this change set** (`supabase/migrations/0007_payments_lockdown.sql`). Drops `payments_insert_own` / `payments_update_own` and adds a `BEFORE INSERT OR UPDATE` trigger that rejects any write where `auth.uid() IS NOT NULL` — payments can only be created by the Paystack verification service (service role bypasses both RLS and the trigger). Customers keep read access to their own rows. The `mirrorToDb` payments upsert now fails safely (RLS/trigger reject) and payments remain visible via the shared row written by `verify.ts`. **Action required: apply migration 0007 in the Supabase SQL editor.**

### C2 — TOCTOU data loss on the shared-state write path

- **Files:** `api/state.ts:145-159`, `src/lib/sync.ts:56-73`, `src/store/index.ts:1316-1334`.
- **How it works:** `POST /api/state` does `readSharedRow → mergeCollections → writeSharedRow` with no optimistic concurrency, version column, or per-collection keying. The client fires these on every debounced mutation (600 ms) and every 10 s poll. Two users editing different tickets concurrently both read the same snapshot; the later writer overwrites the merged document, silently discarding the earlier writer's record. `mergeCollections` also replaces whole collections, so a lost update on one collection clobbers others.
- **Impact:** Data loss and cross-tenant corruption under concurrency — directly conflicts with the 10k-user target.
- **Fix (short term):** Add a `version` (or `updated_at`) optimistic-lock to the shared row; reject writes whose version is stale and retry the merge server-side. (Long term: see C3 — move away from a single document.)

### C3 — Single-row shared-state architecture cannot scale to 10k concurrent users

- **Files:** `api/state.ts:32-43, 139-159`, `src/store/index.ts:85-88, 636-651, 1316-1334`, `src/lib/db.ts:306-329`, `src/pages/dashboard/Chat.tsx:142-159`, `src/pages/dashboard/TicketDetail.tsx:102-119`.
- **Problem breakdown:**
  1. **Full-document polling:** every authenticated client calls `GET /api/state` every 10 s and on window focus (`POLL_MS = 10_000`). At 10k users that is ~1,000 full-document downloads/sec. Each response contains every tenant's tickets, chat, payments, notifications, users and — because attachments are stored inline — every tenant's base64 files.
  2. **Base64 attachments in JSON:** files up to 2 MB are read as data URLs (`Chat.tsx:145-159`, `TicketDetail.tsx:102-119`) and stored inside chat message objects in the shared row **and** `chat_messages.data`. One 2 MB attachment becomes ~2.7 MB of text; a handful of screenshots per ticket will push the document past practical JSONB/row limits and multiply every download.
  3. **Write amplification:** every store mutation triggers `mirrorToDb()` which re-upserts **all** tickets, chat messages, bookings, payments, notifications and KB articles (`src/lib/db.ts:306-329`), then a full-document `POST /api/state`. Client-side filtering (`state.ts:110-125`) then re-derives per-user views for every request.
  4. **No pagination/query:** `loadDbCollections` selects all rows of six tables with `limit(5000)` each (`src/lib/db.ts:274-280`).
- **Fix (short term):** stop storing attachments in JSON — move to Supabase Storage (public/private buckets, signed URLs), enforce file-type/size server-side, and cap inline body size. Reduce polling; subscribe to a realtime channel instead. **Fix (long term):** replace the shared document with the already-created business tables as the sole source of truth, add Realtime + RPC endpoints, and delete `/api/state` as the hot path.

---

## 3. HIGH

### H1 — Role changes in the UI never reach `profiles`; demoted/ex-staff keep full access
- **Files:** `src/pages/dashboard/Admin.tsx:916`, `src/store/index.ts:837-839, 872-875` (updateUser/addUser/deleteUser), `supabase/migrations/0001_init.sql:217-225` (`public.is_staff` reads `profiles.role`), `api/_shared.ts:59-79`.
- Admin UI changes a user's `role` in the shared-state `users` collection only. `is_staff()` (RLS and `/api/state`) reads `public.profiles.role`. **Promoting in the UI never grants staff access** (broken feature), and **demoting never revokes it** — a terminated employee keeps staff read/write over all tenants' data until someone edits `profiles` manually.
- **Fix:** add a server endpoint (or a `SECURITY DEFINER` RPC) that staff call to update `profiles.role`, and drive the UI through it. Never treat the shared-state `users` array as the access-control source of truth.

### H2 — Rate limiting is per-instance in-memory on Edge; leaks memory and mis-buckets NAT'd offices
- **Files:** `api/_shared.ts:16-31`, used by `state.ts:128`, `agent.ts:176`, `paystack/init.ts:24`, `paystack/verify.ts:62`.
- The `rateBuckets` map is **never pruned** — every distinct IP creates an entry that lives forever (memory leak / OOM over time). IPs are bucketed by **first octet** (`x-forwarded-for` split), so an office behind one NAT (hundreds of staff) shares a 240 req/min budget on `/api/state` and gets 429'd during normal work. There is no global, token-bucket, or DB-backed limiting, and no per-user cap — distributed abuse is unaffected.
- **Fix:** evict expired entries, bucket by full client IP or an auth-scoped key (plus a per-user budget), and move to a shared store (Upstash/Redis or Supabase) for any limit that must hold across instances.
- **Status: ⚠️ Partially fixed in this change set** — expired buckets are now pruned and the map is bounded (`api/_shared.ts`). Still outstanding: first-octet bucketing (NAT'd offices share a budget), per-user budgets, and a cross-instance limiter.

### H3 — AI agent: no per-user cost cap, no content moderation, soft prompt-injection guard
- **Files:** `api/agent.ts:173-303` (rate 30/min per IP per instance), `agent.ts:65-66` (BOUNDARY tags).
- Any authenticated user can drive paid LLM calls at 30/min across instances with no budget — a cost-abuse vector at scale. The prompt-injection mitigation relies on a polite BOUNDARY instruction (defense in depth, not a control). Transcript content is passed through as raw messages; there is no toxicity/PII filter on customer text.
- **Fix:** per-user daily/monthly token budget enforced server-side, model rotation to cheaper/free tiers for high volume, cap `max_tokens`, and validate/normalize untrusted fields before interpolation.

### H4 — Weak enterprise auth posture + silent demo-mode fallback
- **Files:** `src/store/index.ts:749-755, 764-770, 802-815, 816-823`, `src/pages/Login.tsx:130-133`, `src/lib/supabase.ts:6-8`, `src/store/index.ts:96-104` (seed users with `password: 'fixora123'`).
- No MFA/TOTP for staff or admins; app-side password policy is **6 characters** (`Login.tsx:130`); no lockout beyond Supabase defaults; super-admin emails are enumerable. If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing or placeholder in a deployed build, `isSupabaseConfigured()` returns false and the app **silently runs in demo mode**: plaintext passwords, seed accounts (`fixora123`), and `demoLogin`/local-store auth become the only path — a misconfig turns prod into a demo with well-known credentials.
- **Fix:** enable MFA (Supabase TOTP) for staff, raise the minimum password length, and **fail closed**: gate `/api/*` and dashboard routes on Supabase being configured (a `SITE_IS_DEMO` flag only when explicitly set).

### H5 — No logging, monitoring, alerting, or audit trail (despite "SOC 2" claims)
- **Files:** `supabase/migrations/0001_init.sql:193-200, 288-291` (`audit_logs` table exists but the app never writes to it; `audit_insert_service` is `for insert with check (true)` so **anyone, including anonymous, can spam it**), plus the whole codebase has no structured logging or error tracking (no Sentry), no request logging in the Edge functions, and no alerting.
- **Fix:** write audit entries on every sensitive action (role change, delete, payment, state merge) via a service-role RPC; lock `audit_insert_service` to `role() = 'service_role'`; add Sentry/Observability (Logtail/Axiom) to the Edge functions and browser; add health/usage metrics and alerting.

### H6 — No tests, no lint, CI is build-only
- **Files:** `.github/workflows/ci.yml:23-30`, `package.json` (no `lint`/`test` scripts).
- CI runs `npm ci && tsc && vite build` only. There are no unit/component/e2e tests, no linting, no SAST/SCA (e.g. `npm audit`, CodeQL, Snyk), and no Supabase migration test stage.
- **Fix:** add `npm run lint`, Vitest + RTL for store/sync/paystack logic, a migration replay test against a disposable Supabase, and security scanning in CI.

### H7 — Entire multi-tenant dataset mirrored into every client's localStorage
- **Files:** `src/store/index.ts:1246-1251` (`persist` partialize persists everything except `recoveryMode`), including all shared-state tickets/messages/payments/users for staff, and base64 attachments.
- localStorage is 5–10 MB: base64 attachments will blow the quota, and `persist` writes will throw (breaking the app mid-session). XSS on any staff device exfiltrates the entire tenant dataset.
- **Fix:** persist only the current user's session + lightweight prefs; keep business data in memory/DB. Store attachments in Storage with signed URLs.

---

## 4. MEDIUM

- **M1 — Customer can spoof own role / message attributes in shared state.** `api/state.ts:79` (`users: rec.id === user.id`) lets a customer write their own `users` record including an arbitrary `role`, visible to staff in the Users directory (for non-DB users); `state.ts:75` lets them set `isAdmin`/`senderRole` on their own chat messages (cosmetic spoofing). Real access is profiles-based, so impact is data-integrity/confusion — but drop `role` from customer-writable fields.
- **M2 — Payment ownership isn't bound to the payer.** `api/paystack/verify.ts:113-121` records the payment under the **caller's session** without checking `tx.customer.email === authed.email`; verification is client-driven (no Paystack webhook), so a payment is lost if the user closes the tab before verify completes, and there is no refund/subscription-sync handling. Add a webhook handler with signature validation and match `customer.email`.
- **M3 — Every staff role (incl. technicians) sees all tenants' PII.** `api/state.ts:139-143` returns the full shared document (all contact messages, payments, users) to any staff member; least-privilege would scope by role (technicians need tickets + chat only).
- **M4 — Public contact form is an unauthenticated spam/DB-fill vector.** `supabase/migrations/0001_init.sql:274-276` (`contact_insert_public` with `with check (true)`), submitted straight from the anon client (`src/store/index.ts:1140-1151`). Add a server endpoint with rate limiting and honeypot, or a check that `auth.role() = 'authenticated'` isn't the only defense.
- **M5 — Missing hardening headers.** `vercel.json` lacked `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`; CSP has `style-src 'unsafe-inline'` (needed for Tailwind) and `script-src 'self'` without nonce/hash. **Status: ⚠️ Partially fixed in this change set** — HSTS (`max-age=63072000; includeSubDomains; preload`) and COOP `same-origin-allow-popups` added to `vercel.json`; CORP and script nonce/hash still outstanding.
- **M6 — `getAuthedUser` hits Supabase `/auth/v1/user` on every request** (`api/_shared.ts:34-46`) with no session cache — added latency and auth-endpoint load per call.
- **M7 — No graceful failure when localStorage quota is hit or Supabase becomes unreachable** — sync errors are silently `console.warn`ed (`src/lib/sync.ts:69-72`, `src/lib/db.ts:299`); users have no indication their data isn't saving.
- **M8 — Auto-route technician roster is client-supplied.** `api/agent.ts:277-285` validates `technicianId` only against the roster the caller sent; the roster itself is spoofable (impact limited by RLS on real writes, but the LLM is told a fake roster).
- **M9 — Session handling is minimal.** `initAuth` only listens for `PASSWORD_RECOVERY` (`src/store/index.ts:714-732`); email-confirmed signups don't auto-continue a session; no `SIGNED_IN`/refresh handling beyond `getSession`.
- **M10 — Bundle performance.** Recharts (used in `Dashboard.tsx`, `Admin.tsx`) produces a >500 kB chunk warning; no `manualChunks`/vendor splitting in `vite.config.ts`. Route-level lazy loading is good (App.tsx).
- **M11 — Dev server binds `0.0.0.0` with `allowedHosts: true`** (`vite.config.ts:17-23`) — DNS-rebinding risk if the dev server is reachable on a network.
- **M12 — `orgs_read_all_authed`** (`0001_init.sql:236-237`) lets any authenticated user list every organization (name/owner/plan).

---

## 5. LOW

- **L1 — `kb_read_public`** intentionally exposes the KB — fine, but confirm no unpublished drafts leak (filter `isPublished`).
- **L2 — Text ids (`t<ts>`, `m<ts>`) are timestamp-based** — collision risk under concurrent creation within the same ms; prefer UUIDs (`uuid` is already a dependency).
- **L3 — `chatMessages` customer read filter** (`state.ts:112-117`) exposes all messages on tickets a customer created, including any other participant's — acceptable, but confirm staff-only notes don't land there later.
- **L4 — `contact_messages.id` widened to text (0005)** — clean, but keep the convention consistent across tables.
- **L5 — `x-forwarded-for` first-octet bucketing** (privacy-friendly) is also a correctness weakness (see H2).

---

## 6. Positive findings (done right)

- RLS enabled on all 10 tables; owner + staff policies are coherent.
- Legacy direct shared-row IDOR was actually fixed: `0005` drops the anon/authenticated shared-row policies, and clients only reach the row via `/api/state` with the service key and per-record authz (`api/state.ts`).
- Paystack prices are enforced server-side and amounts are cross-checked on verify (`api/paystack/verify.ts:113-118`); the secret key is server-only.
- No `dangerouslySetInnerHTML` anywhere; chat/KB render through React (XSS-safe).
- CSP present with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, restrictive `Permissions-Policy`.
- The new two-way sync (0006) keeps `data` jsonb so the app object round-trips losslessly and DB rows can be inspected/correlated.
- AI prompt builder separates untrusted customer data with a boundary directive and rate-limits `/api/agent` (per instance); a rule-based fallback exists when the key is absent.
- Demo seed rows are stripped from live mirroring (`src/store/index.ts:443-466, 534-540`), and passwords are stripped before shared-state upload (`index.ts:456-461`).
- Env secrets are gitignored; only `.env.example` is tracked.

---

## 7. Remediation roadmap (priority order)

| # | Item | Sev | Effort |
|---|---|---|---|
| 1 | C1 — Restrict `payments` insert/update to service role (migration 0007) | Critical | S (✅ done) |
| 2 | H1 — Role changes via a service-role RPC that updates `profiles` | High | M |
| 3 | C2 — Optimistic concurrency (`version`) on the shared row | Critical | M |
| 4 | C3a — Move attachments to Supabase Storage + signed URLs, drop inline base64 | Critical | M |
| 5 | H4 — Require MFA for staff, stronger password policy, fail-closed demo mode | High | M |
| 6 | H5 — Audit writes (locked policy) + Sentry/logging + alerting | High | M |
| 7 | H2 — Prune/redis-back the rate limiter, per-user budgets | High | S–M (✅ eviction done) |
| 8 | H7 — Slim the persisted store; keep business data in memory/DB | High | S–M |
| 9 | H6 — Lint + tests + SAST + migration replay in CI | High | M |
| 10 | C3b — Replace the shared document with normalized tables + Realtime; retire `/api/state` hot path | Critical | XL (architectural) |
| 11 | M2 — Paystack webhook (signature-verified), bind payment to payer email | Medium | M |
| 12 | M3–M5, M10, H3 — role-scoped GET, contact-form rate limit, headers, chunks, per-user AI budgets | Medium | S–M (✅ HSTS/COOP done) |

**Go/no-go:** C1 is fixed (apply migration 0007) — the billing bypass is closed. Address **C2/C3** before scaling beyond a pilot; otherwise treat the rest as a prioritized backlog. At 10,000 concurrent users this architecture (full-document shared row + full-table mirroring) will not survive.

---

## 8. Appendix — files referenced

| Path | Role |
|---|---|
| `api/state.ts` | Shared-state gateway (service role, per-record authz) — C1/C2/C3/M1/M3 |
| `api/_shared.ts` | Rate limiter, `getAuthedUser`, `isStaff` — H2/M6 |
| `api/agent.ts` | AI gateway — H3/M8 |
| `api/paystack/init.ts`, `api/paystack/verify.ts` | Billing — C1/M2 |
| `src/lib/sync.ts`, `src/lib/db.ts` | Shared-state + two-way mirror — C1/C2/C3/H7 |
| `src/store/index.ts` | zustand store, auth, sync, seed/demo data — C1/C2/C3/H4/H7 |
| `src/utils/plans.ts` | Plan gating — C1 |
| `src/App.tsx` | Route guards (client-side only) — C1 |
| `src/pages/Login.tsx`, `Signup.tsx` | Auth UI — H4 |
| `src/pages/dashboard/Chat.tsx`, `TicketDetail.tsx` | File uploads (base64) — C3 |
| `supabase/migrations/0001–0006` | Schema + RLS — C1/H1/M4/M5/L1 |
| `vercel.json`, `vite.config.ts`, `.github/workflows/ci.yml` | Deploy/headers/CI — H6/M5/M10/M11 |
