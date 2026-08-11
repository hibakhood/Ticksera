import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Ticket, Booking, ChatMessage, Payment, KBArticle, Notification, TicketStatus, TicketPriority, TicketCategory } from '../types';
import type { SharedState } from './sync';

/**
 * Two-way sync between the SPA store and the business tables.
 *
 * Every store mutation is mirrored into tickets / chat_messages / bookings /
 * payments / notifications / kb_articles (migration 0006_two_way_sync.sql) and
 * read back so the dashboards correlate with the real database rows. The full
 * app object is stored in the `data` jsonb column; the scalar columns carry a
 * best-effort mapping for anyone inspecting the database directly.
 *
 * Reads/writes use the user's anon-key session, so RLS scopes everything:
 * staff see and write all rows, customers only their own.
 */

type DbRow = Record<string, unknown>;

function validUuid(id: string | undefined | null): string | null {
  if (!id) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

// ---------------------------------------------------------------------------
// Row -> app object (prefer the stored `data` payload, fall back to scalars)
// ---------------------------------------------------------------------------

function dbToTicket(row: DbRow): Ticket {
  const d = (row.data ?? {}) as Partial<Ticket>;
  return {
    id: String(row.id ?? ''),
    title: d.title ?? String(row.subject ?? ''),
    description: d.description ?? String(row.description ?? ''),
    category: (d.category ?? 'computer_repair') as TicketCategory,
    priority: (d.priority ?? 'medium') as TicketPriority,
    status: (d.status ?? 'open') as TicketStatus,
    screenshotUrls: d.screenshotUrls ?? [],
    assignedTo: d.assignedTo ?? (row.assigned_to ? String(row.assigned_to) : undefined),
    assignedRole: d.assignedRole,
    createdBy: d.createdBy ?? (row.user_id ? String(row.user_id) : ''),
    createdByName: d.createdByName ?? '',
    resolutionNotes: d.resolutionNotes,
    resolvedBy: d.resolvedBy,
    rating: d.rating,
    ratingComment: d.ratingComment,
    slaDeadline: d.slaDeadline,
    escalationLevel: d.escalationLevel ?? 0,
    triageStatus: d.triageStatus,
    triageStep: d.triageStep,
    estimatedResolutionTime: d.estimatedResolutionTime,
    aiRoutingReason: d.aiRoutingReason,
    activityLogs: d.activityLogs ?? [],
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
    updatedAt: d.updatedAt ?? String(row.updated_at ?? new Date().toISOString()),
    clientSegment: d.clientSegment,
    industryType: d.industryType,
    coreCategory: d.coreCategory,
    productItem: d.productItem,
    issueTrigger: d.issueTrigger,
  };
}

function dbToChatMessage(row: DbRow): ChatMessage {
  const d = (row.data ?? {}) as Partial<ChatMessage>;
  return {
    id: String(row.id ?? ''),
    ticketId: d.ticketId ?? String(row.ticket_id ?? ''),
    senderEmail: d.senderEmail ?? '',
    senderName: d.senderName ?? String(row.sender_name ?? ''),
    senderRole: (d.senderRole ?? String(row.sender_role ?? 'customer')) as ChatMessage['senderRole'],
    message: d.message ?? String(row.message ?? ''),
    isAdmin: d.isAdmin ?? false,
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    fileType: d.fileType,
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
  };
}

function dbToBooking(row: DbRow): Booking {
  const d = (row.data ?? {}) as Partial<Booking>;
  return {
    id: String(row.id ?? ''),
    serviceType: d.serviceType ?? String(row.service ?? ''),
    preferredDate: d.preferredDate ?? String(row.date ?? ''),
    preferredTime: d.preferredTime ?? String(row.time ?? ''),
    description: d.description ?? String(row.notes ?? ''),
    status: (d.status ?? 'pending') as Booking['status'],
    contactPhone: d.contactPhone ?? '',
    assignedTechnician: d.assignedTechnician ?? (row.technician ? String(row.technician) : undefined),
    sessionType: (d.sessionType ?? 'remote') as Booking['sessionType'],
    createdBy: d.createdBy ?? (row.user_id ? String(row.user_id) : ''),
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
    ticketId: d.ticketId,
  };
}

function dbToPayment(row: DbRow): Payment {
  const d = (row.data ?? {}) as Partial<Payment>;
  return {
    id: String(row.id ?? ''),
    plan: d.plan ?? String(row.plan ?? ''),
    amount: Number(d.amount ?? row.amount ?? 0),
    status: (d.status ?? 'completed') as Payment['status'],
    reference: d.reference ?? '',
    paymentMethod: d.paymentMethod ?? '',
    renewalDate: d.renewalDate,
    invoiceUrl: d.invoiceUrl,
    transactionId: d.transactionId ?? '',
    userId: d.userId ?? (row.user_id ? String(row.user_id) : ''),
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
  };
}

function dbToNotification(row: DbRow): Notification {
  const d = (row.data ?? {}) as Partial<Notification>;
  return {
    id: String(row.id ?? ''),
    userEmail: d.userEmail ?? '',
    title: d.title ?? String(row.title ?? ''),
    message: d.message ?? String(row.message ?? ''),
    type: (d.type ?? 'system') as Notification['type'],
    isRead: d.isRead ?? Boolean(row.read ?? false),
    link: d.link,
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
  };
}

function dbToKBArticle(row: DbRow): KBArticle {
  const d = (row.data ?? {}) as Partial<KBArticle>;
  return {
    id: String(row.id ?? ''),
    title: d.title ?? String(row.title ?? ''),
    content: d.content ?? String(row.content ?? ''),
    category: d.category ?? String(row.category ?? 'General'),
    tags: d.tags ?? [],
    isPublished: d.isPublished ?? Boolean(row.is_published ?? true),
    helpfulCount: Number(d.helpfulCount ?? row.helpful ?? 0),
    createdBy: d.createdBy ?? (row.author_id ? String(row.author_id) : ''),
    createdAt: d.createdAt ?? String(row.created_at ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// App object -> row (scalars are a best-effort mapping, full object in `data`)
// ---------------------------------------------------------------------------

function ticketToDb(t: Ticket): DbRow {
  return {
    id: t.id,
    user_id: validUuid(t.createdBy),
    org_id: null,
    subject: t.title,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    assigned_to: validUuid(t.assignedTo),
    channel: 'web',
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    data: t as unknown as Record<string, unknown>,
  };
}

function chatToDb(m: ChatMessage): DbRow {
  return {
    id: m.id,
    ticket_id: m.ticketId,
    sender_id: null,
    sender_name: m.senderName,
    sender_role: m.senderRole,
    message: m.message,
    created_at: m.createdAt,
    data: m as unknown as Record<string, unknown>,
  };
}

function bookingToDb(b: Booking): DbRow {
  return {
    id: b.id,
    user_id: validUuid(b.createdBy),
    service: b.serviceType,
    technician: b.assignedTechnician ?? '',
    date: b.preferredDate,
    time: b.preferredTime,
    notes: b.description,
    status: b.status,
    created_at: b.createdAt,
    data: b as unknown as Record<string, unknown>,
  };
}

function paymentToDb(p: Payment): DbRow {
  return {
    id: p.id,
    user_id: validUuid(p.userId),
    org_id: null,
    plan: p.plan,
    amount: p.amount,
    status: p.status,
    created_at: p.createdAt,
    data: p as unknown as Record<string, unknown>,
  };
}

function notificationToDb(n: Notification, userId: string | null): DbRow {
  return {
    id: n.id,
    user_id: userId,
    title: n.title,
    message: n.message,
    read: n.isRead,
    created_at: n.createdAt,
    data: n as unknown as Record<string, unknown>,
  };
}

function kbToDb(a: KBArticle): DbRow {
  return {
    id: a.id,
    author_id: validUuid(a.createdBy),
    title: a.title,
    category: a.category,
    content: a.content,
    helpful: a.helpfulCount,
    created_at: a.createdAt,
    data: a as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Email -> profile id resolution (notifications / chat target users by email)
// ---------------------------------------------------------------------------

let profileIdCache: Record<string, string> | null = null;
let profileIdCacheAt = 0;

async function emailToProfileId(): Promise<Record<string, string>> {
  if (profileIdCache && Date.now() - profileIdCacheAt < 30_000) return profileIdCache;
  try {
    const { data } = await getSupabase().from('profiles').select('id, email').limit(2000);
    const map: Record<string, string> = {};
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      map[String(r.email ?? '').toLowerCase()] = String(r.id ?? '');
    }
    profileIdCache = map;
    profileIdCacheAt = Date.now();
    return map;
  } catch {
    return profileIdCache ?? {};
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DbMirror {
  tickets: Ticket[];
  chatMessages: ChatMessage[];
  bookings: Booking[];
  payments: Payment[];
  notifications: Notification[];
  kbArticles: KBArticle[];
}

/** Load every business table through the anon-key client (RLS scopes rows). */
export async function loadDbCollections(): Promise<DbMirror | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const [t, c, b, p, n, k] = await Promise.all([
      getSupabase().from('tickets').select('*').limit(5000),
      getSupabase().from('chat_messages').select('*').limit(5000),
      getSupabase().from('bookings').select('*').limit(5000),
      getSupabase().from('payments').select('*').limit(5000),
      getSupabase().from('notifications').select('*').limit(5000),
      getSupabase().from('kb_articles').select('*').limit(5000),
    ]);
    return {
      tickets: (t.data ?? []).map(dbToTicket),
      chatMessages: (c.data ?? []).map(dbToChatMessage),
      bookings: (b.data ?? []).map(dbToBooking),
      payments: (p.data ?? []).map(dbToPayment),
      notifications: (n.data ?? []).map(dbToNotification),
      kbArticles: (k.data ?? []).map(dbToKBArticle),
    };
  } catch (e) {
    console.warn('db collection load failed:', e);
    return null;
  }
}

async function upsert(table: string, rows: DbRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const { error } = await getSupabase().from(table).upsert(rows, { onConflict: 'id' });
    if (error) console.warn(`mirror ${table} failed:`, error.message);
  } catch (e) {
    console.warn(`mirror ${table} failed:`, e);
  }
}

/** Resolve the caller's staff role so the mirror only writes rows RLS allows. */
async function currentRole(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    return (profile?.role as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Mirror the shared state into the business tables (best effort, RLS-scoped).
 *
 * The mirror runs under the caller's anon-key session, so it must only send
 * rows the caller may write (migration 0013 restricts staff writes to what a
 * manager/owner/assigned technician may touch). Technicians read the full
 * operational dataset but only sync their own tickets and messages; managers
 * sync everything.
 */
export async function mirrorToDb(data: SharedState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const role = await currentRole();
  const isManager = role === 'super_admin' || role === 'support_manager';
  const { data: authData } = await getSupabase().auth.getUser();
  const uid = authData.user?.id ?? null;
  const email = (authData.user?.email ?? '').toLowerCase();
  const emailToId = await emailToProfileId();

  const tickets = (data.tickets as Ticket[])
    .filter(t => isManager || t.createdBy === uid || t.assignedTo === uid)
    .map(ticketToDb);
  const writableTickets = new Set(
    (data.tickets as Ticket[])
      .filter(t => isManager || t.createdBy === uid || t.assignedTo === uid)
      .map(t => t.id)
  );
  // Only ticket messages belong in the chat_messages business table; staff
  // conversation messages ride in the shared row instead.
  const chatMessages = (data.chatMessages as ChatMessage[])
    .filter(m => m.ticketId)
    .filter(m => isManager || writableTickets.has(m.ticketId ?? '') || String(m.senderEmail ?? '').toLowerCase() === email)
    .map(chatToDb);
  const bookings = (data.bookings as Booking[])
    .filter(b => isManager || b.createdBy === uid)
    .map(bookingToDb);
  const payments = (data.payments as Payment[])
    .filter(() => isManager)
    .map(paymentToDb);
  const notifications = (data.notifications as Notification[])
    .filter(n => isManager || String(n.userEmail ?? '').toLowerCase() === email)
    .map(n => {
      const mail = (n.userEmail ?? '').toLowerCase();
      const id = emailToId[mail];
      return notificationToDb(n, validUuid(id));
    });
  const kbArticles = (data.kbArticles as KBArticle[])
    .filter(() => isManager)
    .map(kbToDb);

  // Chat inserts are gated on the owning ticket existing (RLS), so tickets first.
  await upsert('tickets', tickets);
  await Promise.allSettled([
    upsert('chat_messages', chatMessages),
    upsert('bookings', bookings),
    upsert('payments', payments),
    upsert('notifications', notifications),
    upsert('kb_articles', kbArticles),
  ]);
}
