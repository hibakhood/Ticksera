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
// isolates are ephemeral and per-instance, so this is approximate — it still
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
export async function getAuthedUser(req: Request, supabaseUrl: string): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { authorization: authHeader } });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string; email?: string };
    if (!user.id) return null;
    return { id: user.id, email: (user.email ?? '').toLowerCase() };
  } catch {
    return null;
  }
}

const STAFF_ROLES = new Set(['super_admin', 'support_manager', 'technician', 'field_technician']);

export function isStaffRole(role: string | undefined): boolean {
  return !!role && STAFF_ROLES.has(role);
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
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (superAdmins.includes(user.email)) return true;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${user.id}`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as { role?: string }[];
    return isStaffRole(rows[0]?.role);
  } catch {
    return false;
  }
}
