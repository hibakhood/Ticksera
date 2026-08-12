// TICKSERA Contact: server-side contact form intake (Vercel Edge function).
//
// The contact form previously inserted straight into `contact_messages` from
// the browser using the anon key and the permissive `contact_insert_public`
// policy. That let anyone spam the table and write arbitrary rows. This
// endpoint moves intake server-side:
//
//   - rate-limited per IP,
//   - honeypot field filters bots (they never reach the database),
//   - writes go through the service-role key (RLS bypass) so the permissive
//     client insert policy can be dropped (see migration 0009),
//   - fields are length-capped and type-checked server-side.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (persists the message when set).

export const config = { runtime: 'edge', maxDuration: 10 };

import { json, rateLimit, rateLimitDb, clientIp, writeAudit, logEvent } from './_shared';

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 4000;

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const rl = rateLimit(req, 5, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  // Authoritative, cross-instance per-IP limit (migration 0013). The in-memory
  // check above is only a per-isolate pre-filter.
  if (supabaseUrl && serviceKey) {
    const rlDb = await rateLimitDb(supabaseUrl, serviceKey, `contact:ip:${clientIp(req)}`, 5, 60_000);
    if (!rlDb.ok) return json({ ok: false, error: 'rate_limited', retry_after: rlDb.retryAfter }, 429);
  }

  let body: {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    website?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  // Honeypot: real users never fill this hidden field. Pretend success so bots
  // can't distinguish, but don't persist anything.
  if (typeof body.website === 'string' && body.website.length > 0) {
    logEvent('contact.bot_blocked', {});
    return json({ ok: true });
  }

  const name = String(body.name ?? '').trim().slice(0, MAX_NAME);
  const email = String(body.email ?? '').trim().slice(0, MAX_EMAIL);
  const subject = String(body.subject ?? '').trim().slice(0, MAX_SUBJECT);
  const message = String(body.message ?? '').trim().slice(0, MAX_MESSAGE);

  if (!name || !email || !subject || !message) {
    return json({ ok: false, error: 'missing_fields' }, 400);
  }
  if (!validEmail(email)) return json({ ok: false, error: 'invalid_email' }, 400);

  if (supabaseUrl && serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
          'content-type': 'application/json',
          prefer: 'return=minimal',
        },
        body: JSON.stringify({ name, email, subject, message, read: false }),
      });
      if (!res.ok) return json({ ok: false, error: 'persist_failed' }, 500);
    } catch {
      return json({ ok: false, error: 'persist_failed' }, 500);
    }
    await writeAudit(supabaseUrl, serviceKey, {
      action: 'contact.submitted',
      entity: 'contact_messages',
      details: { email, subject: subject.slice(0, 80) },
    });
  }
  logEvent('contact.submitted', { email });

  return json({ ok: true });
}
