// FIXORA Role — server-side staff role changes (Vercel Edge function).
//
// Role changes used to mutate only the in-memory store and never reached the
// database, so staff privileges were not enforced anywhere. This endpoint
// applies role changes to public.profiles via the set_user_role RPC (migration
// 0010) using the service key. Only managers may call it, nobody may change
// their own role, and only a super_admin may promote someone to a manager role.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPER_ADMIN_EMAILS.

export const config = { runtime: 'edge', maxDuration: 10 };

import { json, rateLimit, getAuthedUser, getStaffRole, isManagerRole, writeAudit, logEvent } from './_shared';

const ALLOWED_ROLES = new Set(['super_admin', 'support_manager', 'technician', 'field_technician', 'customer']);
const MANAGER_ROLES = new Set(['super_admin', 'support_manager']);

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const rl = rateLimit(req, 30, 60_000);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const user = await getAuthedUser(req, supabaseUrl);
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
  const callerRole = await getStaffRole(supabaseUrl, serviceKey, user);
  if (!callerRole || !isManagerRole(callerRole)) {
    logEvent('role.forbidden', { email: user.email });
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  let body: { userId?: string; role?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const targetId = String(body.userId ?? '').trim();
  const newRole = String(body.role ?? '').trim();
  if (!targetId || !ALLOWED_ROLES.has(newRole)) {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
  if (targetId === user.id) {
    return json({ ok: false, error: 'cannot_change_own_role' }, 400);
  }
  // Only a super_admin may grant/revoke manager privileges.
  if (MANAGER_ROLES.has(newRole) && callerRole !== 'super_admin') {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/set_user_role`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ target: targetId, new_role: newRole }),
    });
    if (!res.ok) return json({ ok: false, error: 'rpc_failed' }, 500);
  } catch {
    return json({ ok: false, error: 'rpc_failed' }, 500);
  }

  await writeAudit(supabaseUrl, serviceKey, {
    userId: user.id,
    action: 'role.changed',
    entity: targetId,
    details: { actorEmail: user.email, role: newRole },
  });
  logEvent('role.changed', { actor: user.email, target: targetId, role: newRole });

  return json({ ok: true });
}
