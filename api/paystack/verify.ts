// TICKSERA Payments: Paystack transaction verification (Vercel Edge function).
//
// Verifies a Paystack transaction, then, when Supabase is configured, writes the
// authoritative payment record into the SHARED application-state row using the
// service role key (bypassing RLS) so clients can never self-certify a payment and
// so the admin revenue dashboard reflects every customer's payment immediately.
//
// Env vars (set in Vercel):
//   PAYSTACK_SECRET_KEY           required (sk_test_... / sk_live_...)
//   SUPABASE_URL                  project URL
//   SUPABASE_SERVICE_ROLE_KEY     service-role key (server-only)
//
// The caller must send the user's Supabase access token in the Authorization header;
// the resolved auth user id is recorded as the owner of the payment record.

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

import { json, rateLimit, rateLimitDb, clientIp, getAuthedUser, persistSharedPayment, writeAudit, logEvent } from '../_shared';

const PLAN_PRICES: Record<string, number> = {
  Basic: 5000,
  Professional: 15000,
  Business: 50000,
};

function channelToMethod(channel?: string): string {
  const c = (channel ?? '').toLowerCase();
  if (c.includes('bank') && c.includes('transfer')) return 'bank';
  if (c.includes('bank')) return 'bank';
  if (c.includes('ussd')) return 'ussd';
  if (c.includes('mobile')) return 'mobile';
  if (c.includes('card')) return 'card';
  return c || 'card';
}

function buildPayment(tx: {
  reference?: string;
  channel?: string;
  id?: number | string;
  paid_at?: string;
}, plan: string, amountNaira: number, userId: string): Record<string, unknown> {
  return {
    id: `p${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    plan,
    amount: amountNaira,
    status: 'completed',
    paymentMethod: channelToMethod(tx.channel),
    reference: tx.reference ?? '',
    transactionId: String(tx.id ?? tx.reference ?? ''),
    userId,
    renewalDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    createdAt: tx.paid_at ?? new Date().toISOString(),
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const rl = rateLimit(req, 30, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  const secretKey = (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  if (!secretKey) {
    return json({ ok: false, error: 'not_configured', message: 'Payments are not configured yet.' });
  }

  let body: { reference?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }
  const reference = String(body.reference ?? '').trim();
  if (!reference) return json({ ok: false, error: 'missing_reference' }, 400);

  // Ownership is resolved from the caller's Supabase session (server-side,
  // unforgeable). The client-supplied metadata.user_id is NEVER trusted for
  // ownership: without a valid session the payment is returned but not
  // persisted under anyone's account.
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  // Authoritative, cross-instance per-IP limit (migration 0013). The in-memory
  // check above is only a per-isolate pre-filter.
  if (supabaseUrl && serviceKey) {
    const rlDb = await rateLimitDb(supabaseUrl, serviceKey, `verify:ip:${clientIp(req)}`, 30, 60_000);
    if (!rlDb.ok) return json({ ok: false, error: 'rate_limited', retry_after: rlDb.retryAfter }, 429);
  }

  const authed = supabaseUrl ? await getAuthedUser(req, supabaseUrl) : null;

  let txData: {
    status?: string;
    amount?: number;
    reference?: string;
    channel?: string;
    id?: number | string;
    paid_at?: string;
    metadata?: { plan?: string; user_id?: string };
  };
  try {
    const upstream = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { authorization: `Bearer ${secretKey}` },
    });
    const data = (await upstream.json()) as { status?: boolean; message?: string; data?: typeof txData };
    if (!upstream.ok || !data.status || !data.data) {
      return json({ ok: false, error: 'paystack_error', message: data.message ?? 'Could not verify payment.' });
    }
    txData = data.data;
  } catch (err) {
    return json({ ok: false, error: 'network_error', message: err instanceof Error ? err.message : 'Could not reach Paystack.' });
  }

  if (txData.status !== 'success') {
    return json({ ok: false, error: 'payment_not_successful', status: txData.status });
  }

  const plan = txData.metadata?.plan ?? '';
  const expectedKobo = PLAN_PRICES[plan] * 100;
  if (!expectedKobo) return json({ ok: false, error: 'invalid_plan' });
  if (txData.amount !== expectedKobo) {
    return json({ ok: false, error: 'amount_mismatch', message: 'Verified amount does not match the plan price.' });
  }

  const userId = authed?.id ?? null;
  const payment = buildPayment(txData, plan, expectedKobo / 100, userId ?? '');

  // Persist the authoritative record only when we know who owns it (an
  // authenticated Supabase user) and Supabase is configured. Uses the
  // version-gated atomic update (migration 0008) so a concurrent client write
  // cannot be clobbered and the reference is never recorded twice.
  if (supabaseUrl && serviceKey && userId) {
    const recorded = await persistSharedPayment(supabaseUrl, serviceKey, payment);
    if (recorded) {
      await writeAudit(supabaseUrl, serviceKey, {
        userId,
        action: 'payment.verified',
        entity: 'payments',
        details: { reference: payment.reference, plan, amount: expectedKobo / 100 },
      });
    }
    logEvent('payment.verified', { userId, reference: payment.reference, plan });
  }

  return json({ ok: true, payment });
}
