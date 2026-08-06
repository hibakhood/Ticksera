// FIXORA Payments — Paystack webhook (Vercel Edge function).
//
// Receives server-side payment events from Paystack. This is the authoritative
// binding of a charge to a payer: the webhook carries no client-supplied
// identity, so ownership is resolved from Paystack's verified customer email.
//
// Security:
//   - Every request is signature-verified (HMAC-SHA512 of the raw body against
//     PAYSTACK_WEBHOOK_SECRET, constant-time compare). Requests without a valid
//     signature are rejected before any state is touched.
//   - Payments are persisted with the version-gated atomic update (migration
//     0008) and deduped by reference, so replaying a webhook never double
//     records a charge.
//
// Env vars (set in Vercel, must match the Paystack dashboard webhook secret):
//   PAYSTACK_WEBHOOK_SECRET         required
//   PAYSTACK_SECRET_KEY             required (used to confirm the charge)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   used to persist + bind the payment

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

import { json, rateLimit, persistSharedPayment, profileIdByEmail, writeAudit, logEvent } from '../_shared';

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

function buildPayment(
  event: {
    reference?: string;
    channel?: string;
    id?: number | string;
    paid_at?: string;
    customer_email?: string;
  },
  plan: string,
  amountNaira: number,
  userId: string
): Record<string, unknown> {
  return {
    id: `w${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    plan,
    amount: amountNaira,
    status: 'completed',
    paymentMethod: channelToMethod(event.channel),
    reference: event.reference ?? '',
    transactionId: String(event.id ?? event.reference ?? ''),
    userId,
    email: event.customer_email ?? '',
    renewalDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    createdAt: event.paid_at ?? new Date().toISOString(),
  };
}

/** Constant-time equality for hex digests. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const rl = rateLimit(req, 100, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  const webhookSecret = (process.env.PAYSTACK_WEBHOOK_SECRET ?? '').trim();
  const secretKey = (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  if (!webhookSecret) return json({ ok: false, error: 'not_configured' }, 503);

  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';
  const cryptoObj = globalThis.crypto as Crypto;
  const digest = await cryptoObj.subtle.digest('SHA-512', new TextEncoder().encode(raw + webhookSecret));
  const expected = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (!signature || !timingSafeEqual(signature.toLowerCase(), expected)) {
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let payload: {
    event?: string;
    data?: {
      status?: string;
      reference?: string;
      amount?: number;
      channel?: string;
      id?: number | string;
      paid_at?: string;
      customer?: { email?: string };
      metadata?: { plan?: string };
    };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  // Acknowledge all other events; only act on successful charges.
  if (payload.event !== 'charge.success') return json({ ok: true });
  const data = payload.data ?? {};
  if (data.status !== 'success') return json({ ok: true });

  const reference = String(data.reference ?? '').trim();
  if (!reference) return json({ ok: false, error: 'missing_reference' }, 400);

  const plan = data.metadata?.plan ?? '';
  const expectedKobo = PLAN_PRICES[plan] * 100;
  if (!expectedKobo) return json({ ok: true, ignored: 'invalid_plan' });
  if (data.amount !== expectedKobo) return json({ ok: true, ignored: 'amount_mismatch' });

  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (supabaseUrl && serviceKey) {
    // Confirm the charge is genuine before binding a payment to a user.
    try {
      const upstream = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { authorization: `Bearer ${secretKey}` },
      });
      const upstreamData = (await upstream.json()) as {
        status?: boolean;
        data?: { status?: string; amount?: number };
      };
      const confirmed =
        upstream.ok && upstreamData.status && upstreamData.data?.status === 'success' && upstreamData.data?.amount === expectedKobo;
      if (!confirmed) return json({ ok: false, error: 'confirmation_failed' }, 400);

      const customerEmail = (data.customer?.email ?? '').trim().toLowerCase();
      const userId = customerEmail ? await profileIdByEmail(supabaseUrl, serviceKey, customerEmail) : null;
      const payment = buildPayment(
        { ...data, customer_email: customerEmail },
        plan,
        expectedKobo / 100,
        userId ?? ''
      );
      const recorded = await persistSharedPayment(supabaseUrl, serviceKey, payment);
      if (recorded) {
        await writeAudit(supabaseUrl, serviceKey, {
          userId,
          action: 'payment.webhook',
          entity: 'payments',
          details: { reference: payment.reference, plan, amount: expectedKobo / 100, email: customerEmail },
        });
      }
      logEvent('payment.webhook', { userId, reference: payment.reference, plan, recorded });
    } catch {
      return json({ ok: false, error: 'server_error' }, 500);
    }
  }

  return json({ ok: true });
}
