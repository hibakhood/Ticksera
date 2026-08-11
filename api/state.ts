// FIXORA Shared State Gateway: the ONLY way clients may read or write the
// application's shared data (tickets, chat, bookings, payments, ...).
//
// The SPA used to upsert the shared `user_data` row directly with the anon key,
// which let ANY authenticated user read every tenant's tickets/payments/messages
// and overwrite them. That is gone: this function talks to the database with the
// service-role key and enforces per-record authorization:
//
//   - managers (super_admin / support_manager) read and write everything;
//   - technicians (technician / field_technician) read their operational
//     collections but may only WRITE records they own or work on (their tickets,
//     their chat messages, their profile, their notifications) and can never
//     write payments, the user directory, contact messages, KB content, or
//     conversations. Sender identity/role is forced server-side.
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

import { GLOBAL_STATE_ID, json, rateLimit, getAuthedUser, getStaffRole, isManagerRole, writeAudit } from './_shared';

const COLLECTIONS = ['tickets', 'chatMessages', 'conversations', 'bookings', 'payments', 'users', 'contactMessages', 'notifications', 'kbArticles'] as const;
const MAX_BODY_BYTES = 1024 * 1024;
const BOT_EMAIL = 'bot@fixora.com';

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
        return !String(rec.conversationId ?? '') && String(rec.senderEmail ?? '').toLowerCase() === email;
      case 'bookings':
        return rec.createdBy === user.id;
      case 'users':
        return rec.id === user.id;
      case 'notifications':
        return String(rec.userEmail ?? '').toLowerCase() === email;
      default:
        return false; // payments, conversations, contactMessages, kbArticles
    }
  };
}

const PAYMENT_PLANS = new Set(['Basic', 'Professional', 'Business', 'Enterprise']);
const PAYMENT_STATUSES = new Set(['pending', 'completed', 'failed', 'refunded']);

/** Reject malformed payment records a manager writes (financial integrity). */
function validPayment(rec: Row): boolean {
  const amount = rec.amount;
  const plan = String(rec.plan ?? '');
  const status = String(rec.status ?? '');
  return (
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 1_000_000_000 &&
    PAYMENT_PLANS.has(plan) &&
    PAYMENT_STATUSES.has(status) &&
    typeof rec.userId === 'string' &&
    rec.userId.length > 0 &&
    typeof rec.reference === 'string' &&
    rec.reference.length > 0
  );
}

/** Least-privilege write scope for non-manager staff (technicians / field techs). */
function technicianAllow(
  user: { id: string; email: string },
  myTicketIds: Set<string>,
  convIndex: Map<string, Set<string>>
): (col: string, rec: Row) => boolean {
  return (col, rec) => {
    switch (col) {
      case 'tickets':
        return rec.createdBy === user.id || rec.assignedTo === user.id;
      case 'chatMessages': {
        const cid = String(rec.conversationId ?? '');
        if (cid) return convIndex.get(cid)?.has(user.id) ?? false;
        return String(rec.senderEmail ?? '').toLowerCase() === user.email || myTicketIds.has(String(rec.ticketId ?? ''));
      }
      case 'users':
        return rec.id === user.id;
      case 'notifications':
        return String(rec.userEmail ?? '').toLowerCase() === user.email;
      case 'bookings':
        return rec.createdBy === user.id;
      default:
        return false; // payments, conversations, contactMessages, kbArticles
    }
  };
}

/** Strip privilege-relevant fields from a non-manager staff write. */
function sanitizeForTech(user: { id: string; email: string }, role: string): (col: string, rec: Row) => Row | null {
  return (col, rec) => {
    switch (col) {
      case 'users': {
        if (rec.id !== user.id) return null;
        const out: Row = { id: user.id };
        for (const k of SELF_EDITABLE_USER_FIELDS) {
          if (rec[k] !== undefined) out[k] = rec[k];
        }
        return out;
      }
      case 'chatMessages': {
        const safe: Row = { id: rec.id };
        for (const k of ['ticketId', 'conversationId', 'message', 'fileUrl', 'fileName', 'fileType', 'createdAt', 'senderName']) {
          if (rec[k] !== undefined) safe[k] = rec[k];
        }
        // Bot replies are produced server-side and merely mirrored by the
        // caller's session; keep their attribution. Anything else is forced to
        // the caller so a staff member can never impersonate a manager/bot.
        if (String(rec.senderRole ?? '') === 'bot' || String(rec.senderEmail ?? '').toLowerCase() === BOT_EMAIL) {
          safe.senderEmail = BOT_EMAIL;
          safe.senderRole = 'bot';
          safe.isAdmin = false;
          return safe;
        }
        safe.senderEmail = user.email;
        safe.senderRole = role;
        safe.isAdmin = true;
        return safe;
      }
      case 'notifications':
        return { ...rec, userEmail: user.email };
      default:
        return rec;
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
      m => !m.conversationId && (String(m.senderEmail ?? '').toLowerCase() === email || ownTicketIds.has(String(m.ticketId ?? '')))
    ),
    conversations: [],
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
 * customer PII (payments, contact messages) or the user directory. Staff chats
 * are scoped to the conversations a staff member participates in.
 */
function filterForStaff(data: Row, role: string, user: { id: string; email: string }): Row {
  if (isManagerRole(role)) return data;
  const myConversations = new Set(
    toArray(data.conversations)
      .filter(c => Array.isArray(c.participantIds) && c.participantIds.includes(user.id))
      .map(c => c.id)
  );
  return {
    tickets: toArray(data.tickets),
    chatMessages: toArray(data.chatMessages).filter(
      m => !m.conversationId || myConversations.has(String(m.conversationId))
    ),
    conversations: toArray(data.conversations).filter(c => myConversations.has(String(c.id))),
    bookings: toArray(data.bookings),
    payments: [],
    users: [],
    contactMessages: [],
    notifications: toArray(data.notifications),
    kbArticles: toArray(data.kbArticles),
  };
}

/** Best-effort audit of manual payment writes so grants are attributable. */
async function auditManagerPaymentWrites(
  supabaseUrl: string,
  serviceKey: string,
  current: Row,
  merged: Row,
  user: { id: string }
): Promise<void> {
  const before = new Map<string, Row>();
  for (const p of toArray(current.payments)) {
    if (typeof p.id === 'string') before.set(p.id, p);
  }
  for (const p of toArray(merged.payments)) {
    if (typeof p.id !== 'string') continue;
    const prev = before.get(p.id);
    if (prev && String(prev.status ?? '') === String(p.status ?? '')) continue;
    await writeAudit(supabaseUrl, serviceKey, {
      userId: user.id,
      action: 'payment.manual',
      entity: 'payments',
      details: {
        id: p.id,
        userId: p.userId ?? null,
        plan: p.plan ?? '',
        amount: p.amount ?? 0,
        status: p.status ?? '',
        previousStatus: prev ? (prev.status ?? null) : null,
      },
    });
  }
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
    const view = staffRole ? filterForStaff(data, staffRole, user) : filterForCustomer(data, user);
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
    const currentData = current.data ?? {};

    // Conversation membership index (current + incoming) so a writer can only
    // message a conversation they belong to.
    const convIndex = new Map<string, Set<string>>();
    for (const list of [currentData, incoming]) {
      for (const c of toArray(list.conversations)) {
        if (typeof c.id === 'string') {
          const ps = Array.isArray(c.participantIds) ? c.participantIds.map(String) : [];
          convIndex.set(c.id, new Set(ps));
        }
      }
    }

    // Ticket ids the staff member works on (assigned or created) so a tech can
    // post to their own tickets while never touching other tenants' records.
    const myTicketIds = new Set<string>();
    for (const list of [currentData, incoming]) {
      for (const t of toArray(list.tickets)) {
        if (typeof t.id === 'string' && (t.createdBy === user.id || t.assignedTo === user.id)) myTicketIds.add(t.id);
      }
    }

    let merged: Row;
    if (staffRole) {
      if (isManagerRole(staffRole)) {
        // Managers may write every collection. Payments get validated for
        // financial integrity and new/status-changed records are audited so
        // manual grants are attributable.
        const managerSanitize = (col: string, rec: Row): Row | null =>
          col === 'payments' && !validPayment(rec) ? null : rec;
        merged = mergeCollections(currentData, incoming, () => true, managerSanitize);
        await auditManagerPaymentWrites(supabaseUrl, serviceKey, currentData, merged, user);
      } else {
        // Technicians: least privilege. They may only write their own work and
        // never payments, the user directory, contact messages, KB content, or
        // conversations (manager-created). Fields that carry authority
        // (sender identity, role) are forced server-side.
        merged = mergeCollections(
          currentData,
          incoming,
          technicianAllow(user, myTicketIds, convIndex),
          sanitizeForTech(user, staffRole)
        );
      }
    } else {
      merged = mergeCollections(currentData, incoming, allowForUser(user), (col, rec) => sanitizeForUser(col, rec, user));
    }
    const result = await applySharedRow(supabaseUrl, serviceKey, merged, baseVersion);
    if (result.conflict) {
      return json({ error: 'conflict', version: result.version, data: result.data }, 409);
    }
    return result.ok ? json({ ok: true, version: result.version }) : json({ ok: false, error: 'write_failed' }, 500);
  }

  return json({ error: 'Method not allowed' }, 405);
}
