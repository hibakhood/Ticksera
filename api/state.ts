// FIXORA Shared State Gateway — the ONLY way clients may read or write the
// application's shared data (tickets, chat, bookings, payments, ...).
//
// The SPA used to upsert the shared `user_data` row directly with the anon key,
// which let ANY authenticated user read every tenant's tickets/payments/messages
// and overwrite them. That is gone: this function talks to the database with the
// service-role key and enforces per-record authorization:
//
//   - staff  (super_admin / support_manager / technician / field_technician)
//            read and write everything,
//   - customers read only their own records and may only write records they own.
//     Customers can NEVER write payments (those come from paystack/verify.ts)
//     or contact messages (those go to the public contact_messages table).
//
// Writes MERGE by id server-side: a caller can only add/update records they are
// allowed to own, and can never delete or corrupt other tenants' data.
//
// Env vars (set in Vercel):
//   SUPABASE_URL               project URL
//   SUPABASE_SERVICE_ROLE_KEY  service-role key (server-only)
//   SUPER_ADMIN_EMAILS         optional comma list mirroring VITE_SUPER_ADMIN_EMAIL

export const config = { runtime: 'edge', maxDuration: 30 };

import { GLOBAL_STATE_ID, json, rateLimit, getAuthedUser, getStaffRole, isManagerRole } from './_shared';

const COLLECTIONS = ['tickets', 'chatMessages', 'bookings', 'payments', 'users', 'contactMessages', 'notifications', 'kbArticles'] as const;
const MAX_BODY_BYTES = 1024 * 1024;

type Row = Record<string, unknown>;

interface SharedRow { data?: Row; version?: number }

async function readSharedRow(supabaseUrl: string, serviceKey: string): Promise<SharedRow | null> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${GLOBAL_STATE_ID}&select=data,version`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as SharedRow[];
    return rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

/**
 * Atomically apply a merge to the shared row. `baseVersion` is the version the
 * caller read; a mismatch means another writer landed first, so the write is
 * rejected (conflict) instead of clobbering. `baseVersion === null` skips the
 * check (used only for first-run seeding). The database function takes a row
 * lock so concurrent writers serialize.
 */
async function applySharedRow(
  supabaseUrl: string,
  serviceKey: string,
  data: Row,
  baseVersion: number | null
): Promise<{ ok: boolean; conflict: boolean; version?: number; data?: Row }> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/update_shared_state_if_version`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_base_version: baseVersion, p_data: data }),
    });
    if (!res.ok) return { ok: false, conflict: false };
    const out = (await res.json()) as { ok?: boolean; version?: number; data?: Row };
    if (out.ok === false) return { ok: false, conflict: true, version: out.version, data: out.data };
    return { ok: true, conflict: false, version: out.version };
  } catch {
    return { ok: false, conflict: false };
  }
}

function toArray(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]).filter(r => r && typeof r === 'object') : [];
}

/** Fields a customer may set on their own profile record (never role/email/id). */
const SELF_EDITABLE_USER_FIELDS = ['name', 'organization', 'avatar', 'phone', 'location', 'bio', 'skills'];

/** Force a customer's chat message to carry only sender-safe fields. */
function sanitizeChatMessage(rec: Row, user: { id: string; email: string }): Row {
  const out: Row = { id: rec.id };
  for (const k of ['ticketId', 'message', 'fileUrl', 'fileName', 'fileType', 'createdAt', 'senderName']) {
    if (rec[k] !== undefined) out[k] = rec[k];
  }
  out.senderEmail = user.email;
  out.senderRole = 'customer';
  out.isAdmin = false;
  return out;
}

/**
 * Sanitize records a customer is allowed to write so they can't forge
 * privilege-relevant fields (role, sender identity, notification targets).
 */
function sanitizeForUser(col: string, rec: Row, user: { id: string; email: string }): Row | null {
  switch (col) {
    case 'users': {
      if (rec.id !== user.id) return null;
      const out: Row = { id: user.id };
      for (const k of SELF_EDITABLE_USER_FIELDS) {
        if (rec[k] !== undefined) out[k] = rec[k];
      }
      return out;
    }
    case 'chatMessages':
      return sanitizeChatMessage(rec, user);
    case 'notifications': {
      const out: Row = { ...rec, userEmail: user.email };
      return out;
    }
    default:
      return rec;
  }
}

/** Which records may a (non-staff) customer write? Payments/contact/KB are staff-only. */
function allowForUser(user: { id: string; email: string }): (col: string, rec: Row) => boolean {
  const email = user.email;
  return (col, rec) => {
    switch (col) {
      case 'tickets':
        return rec.createdBy === user.id;
      case 'chatMessages':
        return String(rec.senderEmail ?? '').toLowerCase() === email;
      case 'bookings':
        return rec.createdBy === user.id;
      case 'users':
        return rec.id === user.id;
      case 'notifications':
        return String(rec.userEmail ?? '').toLowerCase() === email;
      default:
        return false; // payments, contactMessages, kbArticles
    }
  };
}

/** Merge the caller's records into the current row by id, honouring `allow` and `sanitize`. */
function mergeCollections(
  current: Row,
  incoming: Row,
  allow: (col: string, rec: Row) => boolean,
  sanitize?: (col: string, rec: Row) => Row | null
): Row {
  const out: Row = { ...current };
  for (const col of COLLECTIONS) {
    const arr = toArray(incoming[col]);
    if (arr.length === 0) continue;
    const existing = new Map<string, Row>();
    for (const rec of toArray(current[col])) {
      if (typeof rec.id === 'string') existing.set(rec.id, rec);
    }
    let changed = false;
    for (const rec of arr) {
      if (typeof rec.id !== 'string' || !allow(col, rec)) continue;
      const clean = sanitize ? sanitize(col, rec) : rec;
      if (!clean || typeof clean.id !== 'string') continue;
      existing.set(clean.id, clean);
      changed = true;
    }
    if (changed) out[col] = [...existing.values()];
  }
  return out;
}

/** What a customer may see: their own records plus published KB articles. */
function filterForCustomer(data: Row, user: { id: string; email: string }): Row {
  const email = user.email;
  const ownTicketIds = new Set(toArray(data.tickets).filter(t => t.createdBy === user.id).map(t => t.id));
  return {
    tickets: toArray(data.tickets).filter(t => t.createdBy === user.id),
    chatMessages: toArray(data.chatMessages).filter(
      m => String(m.senderEmail ?? '').toLowerCase() === email || ownTicketIds.has(String(m.ticketId ?? ''))
    ),
    bookings: toArray(data.bookings).filter(b => b.createdBy === user.id),
    payments: toArray(data.payments).filter(p => p.userId === user.id),
    users: [],
    contactMessages: [],
    notifications: toArray(data.notifications).filter(n => String(n.userEmail ?? '').toLowerCase() === email),
    kbArticles: toArray(data.kbArticles).filter(a => a.isPublished !== false),
  };
}

/**
 * Least-privilege view for staff. Managers (super_admin / support_manager) see
 * everything; technicians only get the operational collections and never
 * customer PII (payments, contact messages) or the user directory.
 */
function filterForStaff(data: Row, role: string): Row {
  if (isManagerRole(role)) return data;
  return {
    tickets: toArray(data.tickets),
    chatMessages: toArray(data.chatMessages),
    bookings: toArray(data.bookings),
    payments: [],
    users: [],
    contactMessages: [],
    notifications: toArray(data.notifications),
    kbArticles: toArray(data.kbArticles),
  };
}

export default async function handler(req: Request): Promise<Response> {
  const rl = rateLimit(req, 240, 60_000);
  if (!rl.ok) return json({ error: 'rate_limited' }, 429);

  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'not_configured' }, 503);

  const user = await getAuthedUser(req, supabaseUrl);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const staffRole = await getStaffRole(supabaseUrl, serviceKey, user);

  if (req.method === 'GET') {
    const row = await readSharedRow(supabaseUrl, serviceKey);
    const data = row?.data ?? {};
    const view = staffRole ? filterForStaff(data, staffRole) : filterForCustomer(data, user);
    return json({ ok: true, data: view, version: row?.version ?? null });
  }

  if (req.method === 'POST') {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
    let body: { data?: Row; baseVersion?: number | null };
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const incoming = (body.data ?? {}) as Row;
    const baseVersion = typeof body.baseVersion === 'number' ? body.baseVersion : null;
    const current = (await readSharedRow(supabaseUrl, serviceKey)) ?? {};
    const merged = staffRole
      ? mergeCollections(current.data ?? {}, incoming, () => true)
      : mergeCollections(current.data ?? {}, incoming, allowForUser(user), (col, rec) => sanitizeForUser(col, rec, user));
    const result = await applySharedRow(supabaseUrl, serviceKey, merged, baseVersion);
    if (result.conflict) {
      return json({ error: 'conflict', version: result.version, data: result.data }, 409);
    }
    return result.ok ? json({ ok: true, version: result.version }) : json({ ok: false, error: 'write_failed' }, 500);
  }

  return json({ error: 'Method not allowed' }, 405);
}
