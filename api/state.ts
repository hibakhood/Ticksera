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

import { GLOBAL_STATE_ID, json, rateLimit, getAuthedUser, isStaff } from './_shared';

const COLLECTIONS = ['tickets', 'chatMessages', 'bookings', 'payments', 'users', 'contactMessages', 'notifications', 'kbArticles'] as const;
const MAX_BODY_BYTES = 1024 * 1024;

type Row = Record<string, unknown>;

async function readSharedRow(supabaseUrl: string, serviceKey: string): Promise<Row | null> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${GLOBAL_STATE_ID}&select=data`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { data?: Row }[];
    return rows.length ? (rows[0].data ?? null) : null;
  } catch {
    return null;
  }
}

async function writeSharedRow(supabaseUrl: string, serviceKey: string, data: Row): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${GLOBAL_STATE_ID}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ user_id: GLOBAL_STATE_ID, data, updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function toArray(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]).filter(r => r && typeof r === 'object') : [];
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

/** Merge the caller's records into the current row by id, honouring `allow`. */
function mergeCollections(current: Row, incoming: Row, allow: (col: string, rec: Row) => boolean): Row {
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
      if (!allow(col, rec) || typeof rec.id !== 'string') continue;
      existing.set(rec.id, rec);
      changed = true;
    }
    if (changed) out[col] = [...existing.values()];
  }
  return out;
}

/** What a customer may see: their own records plus the public knowledge base. */
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
  const staff = await isStaff(supabaseUrl, serviceKey, user);

  if (req.method === 'GET') {
    const row = await readSharedRow(supabaseUrl, serviceKey);
    const data = row ?? {};
    return json({ ok: true, data: staff ? data : filterForCustomer(data, user) });
  }

  if (req.method === 'POST') {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);
    let body: { data?: Row };
    try {
      body = JSON.parse(raw) as { data?: Row };
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const incoming = (body.data ?? {}) as Row;
    const current = (await readSharedRow(supabaseUrl, serviceKey)) ?? {};
    const merged = staff ? mergeCollections(current, incoming, () => true) : mergeCollections(current, incoming, allowForUser(user));
    const ok = await writeSharedRow(supabaseUrl, serviceKey, merged);
    return ok ? json({ ok: true }) : json({ ok: false, error: 'write_failed' }, 500);
  }

  return json({ error: 'Method not allowed' }, 405);
}
