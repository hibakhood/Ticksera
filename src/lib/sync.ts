import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Shared collections the app syncs across roles. All reads/writes go through
 * the `/api/state` Vercel Edge function, which enforces per-record
 * authorization with the service-role key (customers see and can only write
 * their own records; staff see and write everything). Clients can no longer
 * reach the shared `user_data` row directly, so one account can't read or
 * tamper with another tenant's data.
 */

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Kept for compatibility; the row id now lives in api/_shared.ts. */
export const GLOBAL_STATE_ID = '00000000-0000-0000-0000-000000000000';

/** The shared collections every role must see identically. */
export interface SharedState {
  tickets: unknown[];
  chatMessages: unknown[];
  bookings: unknown[];
  payments: unknown[];
  users: unknown[];
  contactMessages: unknown[];
  notifications: unknown[];
  kbArticles: unknown[];
}

async function sessionToken(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function loadSharedState(): Promise<SharedState | null> {
  if (!isSupabaseConfigured()) return null;
  const token = await sessionToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/state', { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; data?: SharedState };
    return data?.ok && data.data ? data.data : null;
  } catch (e) {
    console.warn('shared state load failed:', e);
    return null;
  }
}

export async function saveSharedState(data: SharedState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const token = await sessionToken();
  if (!token) return;
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) console.warn('shared state save failed:', res.status);
  } catch (e) {
    console.warn('shared state save failed:', e);
  }
}
