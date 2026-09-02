// TICKSERA billing plan update endpoint.
//
// The SPA previously changed a customer's plan by mutating the whole shared
// state snapshot and POSTing it to /api/state. That path is fragile for a
// billing action: the big merge payload can fail on size, conflict churn, or a
// stale client token, and a lost write leaves the customer's plan silently
// stale. This endpoint performs the grant atomically with the service-role key
// (the same RPC the Paystack verify flow uses) and records an audit entry, so
// a plan change takes effect immediately once the customer's client polls.
//
// Security: only managers (super_admin / support_manager) may change another
// user's plan. The endpoint validates the target and amount independently of
// the client and never trusts a client-provided reference or transaction id.

import { json, getAuthedUser, getStaffRole, isManagerRole, persistSharedPayment, ensureSharedRow, writeAudit } from '../_shared';

export const config = { runtime: 'edge', maxDuration: 30 };

const PAYMENT_PLANS = new Set(['Basic', 'Professional', 'Business', 'Enterprise']);
const MAX_AMOUNT = 1_000_000_000;

function hex(n: number): string {
  return Math.random().toString(16).substring(2, 2 + n).toUpperCase();
}

function genReference(): string {
  return `TICKSERA-${hex(6)}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'not_configured' }, 503);

  const user = await getAuthedUser(req, supabaseUrl);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const staffRole = await getStaffRole(supabaseUrl, serviceKey, user);
  if (!isManagerRole(staffRole ?? undefined)) return json({ error: 'forbidden' }, 403);

  let body: { userId?: unknown; plan?: unknown; amount?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > 64 * 1024) return json({ error: 'payload_too_large' }, 413);
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const plan = typeof body.plan === 'string' ? body.plan : '';
  const amount = typeof body.amount === 'number' && Number.isFinite(body.amount) ? body.amount : null;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return json({ error: 'invalid_user' }, 400);
  }
  if (!PAYMENT_PLANS.has(plan)) return json({ error: 'invalid_plan' }, 400);
  if (amount === null || amount < 0 || amount > MAX_AMOUNT) return json({ error: 'invalid_amount' }, 400);

  await ensureSharedRow(supabaseUrl, serviceKey);

  const payment = {
    id: `p${Date.now()}`,
    plan,
    amount,
    status: 'completed',
    reference: genReference(),
    paymentMethod: 'admin',
    renewalDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    transactionId: `TXN-${hex(8)}`,
    userId,
    createdAt: new Date().toISOString(),
  };

  const recorded = await persistSharedPayment(supabaseUrl, serviceKey, payment);
  if (!recorded) return json({ ok: false, error: 'write_failed' }, 500);

  await writeAudit(supabaseUrl, serviceKey, {
    userId: user.id,
    action: 'billing.plan_change',
    entity: 'payments',
    details: { userId, plan, amount },
  });

  return json({ ok: true, payment });
}