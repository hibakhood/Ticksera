// TICKSERA Payments: Paystack checkout initialization (Vercel Edge function).
//
// Env vars (set in Vercel; secret key is server-only, never ship to the client):
//   PAYSTACK_SECRET_KEY   required (sk_test_... / sk_live_... from the Paystack dashboard)
//
// Prices are computed server-side so a client can't underpay by tampering with the request.

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

import { json, rateLimit } from '../_shared';

const PLAN_PRICES: Record<string, number> = {
  Basic: 5000,
  Professional: 15000,
  Business: 50000,
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const rl = rateLimit(req, 30, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  const secretKey = (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  if (!secretKey) {
    return json({
      ok: false,
      error: 'not_configured',
      message: 'Payments are not configured yet. Add your Paystack secret key to start accepting payments.',
    });
  }

  let body: { plan?: string; email?: string; userId?: string; callback?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const plan = String(body.plan ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const amount = PLAN_PRICES[plan];
  if (!amount) return json({ ok: false, error: 'invalid_plan', message: 'Unknown plan.' }, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'A valid email is required.' }, 200);
  }

  const callback = body.callback && body.callback.startsWith('/') ? body.callback : '/billing';
  const origin = new URL(req.url).origin;
  const reference = `TICKSERA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const payload = {
    email,
    amount: amount * 100,
    currency: 'NGN',
    reference,
    callback_url: `${origin}${callback}`,
    metadata: {
      plan,
      user_id: String(body.userId ?? ''),
    },
  };

  try {
    const upstream = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await upstream.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string; access_code?: string };
    };
    if (!upstream.ok || !data.status || !data.data?.authorization_url) {
      return json({ ok: false, error: 'paystack_error', message: data.message ?? 'Could not start checkout.' });
    }
    return json({
      ok: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference ?? reference,
      amount,
      plan,
    });
  } catch (err) {
    return json({ ok: false, error: 'network_error', message: err instanceof Error ? err.message : 'Could not reach Paystack.' });
  }
}
