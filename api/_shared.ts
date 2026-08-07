// Shared helpers for FIXORA Vercel Edge functions.
// Files prefixed with `_` are not deployed as routes by Vercel.

export const GLOBAL_STATE_ID = '00000000-0000-0000-0000-000000000000';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Simple in-memory fixed-window rate limiter keyed by client IP. Vercel Edge
// isolates are ephemeral and per-instance, so this is approximate; it still
// meaningfully raises the cost of automated abuse. Expired buckets are evicted
// so the map does not grow without bound.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number): void {
  if (rateBuckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}

export function rateLimit(req: Request, limit = 60, windowMs = 60_000): { ok: boolean; retryAfter?: number } {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  pruneBuckets(now);
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Resolve the authenticated Supabase user from the caller's Bearer token. */
const userCache = new Map<string, { user: { id: string; email: string } | null; expiresAt: number }>();
const USER_CACHE_TTL_MS = 60_000;

export async function getAuthedUser(req: Request, supabaseUrl: string): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  if (!token) return null;
  const now = Date.now();
  const cached = userCache.get(token);
  if (cached && cached.expiresAt > now) return cached.user;
  let user: { id: string; email: string } | null = null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { authorization: authHeader } });
    if (res.ok) {
      const data = (await res.json()) as { id?: string; email?: string };
      if (data.id) user = { id: data.id, email: (data.email ?? '').toLowerCase() };
    }
  } catch {
    user = null;
  }
  if (userCache.size > 5_000) userCache.clear();
  userCache.set(token, { user, expiresAt: now + USER_CACHE_TTL_MS });
  return user;
}

const STAFF_ROLES = new Set(['super_admin', 'support_manager', 'technician', 'field_technician']);
const MANAGER_ROLES = new Set(['super_admin', 'support_manager']);

export function isStaffRole(role: string | undefined): boolean {
  return !!role && STAFF_ROLES.has(role);
}

export function isManagerRole(role: string | undefined): boolean {
  return !!role && MANAGER_ROLES.has(role);
}

/** Resolve the caller's staff role (used to scope reads to least privilege). */
export async function getStaffRole(
  supabaseUrl: string,
  serviceKey: string,
  user: { id: string; email: string }
): Promise<string | null> {
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (superAdmins.includes(user.email)) return 'super_admin';
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${user.id}`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { role?: string }[];
    const role = rows[0]?.role;
    return role && isStaffRole(role) ? role : null;
  } catch {
    return null;
  }
}

/**
 * Is the user staff? Staff = listed in SUPER_ADMIN_EMAILS (server mirror of
 * VITE_SUPER_ADMIN_EMAIL) or holding a staff role in public.profiles.
 * Set SUPER_ADMIN_EMAILS in Vercel to match VITE_SUPER_ADMIN_EMAIL.
 */
export async function isStaff(
  supabaseUrl: string,
  serviceKey: string,
  user: { id: string; email: string }
): Promise<boolean> {
  return (await getStaffRole(supabaseUrl, serviceKey, user)) !== null;
}

/**
 * Atomically append a payment to the shared state row using the
 * version-gated SECURITY DEFINER RPC (migration 0008). Dedupes by reference.
 * Returns true when the payment was recorded.
 */
export async function persistSharedPayment(
  supabaseUrl: string,
  serviceKey: string,
  payment: Record<string, unknown>
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const read = await fetch(
        `${supabaseUrl}/rest/v1/user_data?user_id=eq.${GLOBAL_STATE_ID}&select=data,version`,
        { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } }
      );
      if (!read.ok) return false;
      const rows = (await read.json()) as { data?: Record<string, unknown>; version?: number }[];
      if (!rows.length) return false;
      const dataObj = rows[0].data ?? {};
      const version = rows[0].version ?? 0;
      const payments = Array.isArray(dataObj.payments) ? (dataObj.payments as unknown[]) : [];
      const reference = String(payment.reference ?? '');
      if (payments.some(p => (p as Record<string, unknown>).reference === reference)) return true;
      const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/update_shared_state_if_version`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          p_base_version: version,
          p_data: { ...dataObj, payments: [...payments, payment] },
        }),
      });
      if (!rpc.ok) return false;
      const out = (await rpc.json()) as { ok?: boolean };
      if (out.ok === true) return true;
      // Stale version; re-read and retry.
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolve a user's profile id from their email via the service key (used by
 * the Paystack webhook, which has no client session).
 */
export async function profileIdByEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { id?: string }[];
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Structured log line for Vercel/observability. */
export function logEvent(event: string, meta: Record<string, unknown> = {}): void {
  try {
    console.log(JSON.stringify({ t: new Date().toISOString(), event, ...meta }));
  } catch {
    /* ignore */
  }
}

/**
 * Append an immutable audit entry via the audit_log RPC (migration 0011).
 * Best-effort: the primary operation never fails if auditing does.
 */
export async function writeAudit(
  supabaseUrl: string,
  serviceKey: string,
  entry: { userId?: string | null; action: string; entity?: string; details?: Record<string, unknown> }
): Promise<void> {
  if (!supabaseUrl || !serviceKey) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/audit_log`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        uid: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity ?? '',
        details: entry.details ?? {},
      }),
    });
  } catch {
    /* ignore */
  }
}
