import { getSupabase, isSupabaseConfigured } from './supabase';
import { mirrorToDb } from './db';

/**
 * Shared collections the app syncs across roles. All reads/writes go through
 * the `/api/state` Vercel Edge function, which enforces per-record
 * authorization with the service-role key (customers see and can only write
 * their own records; staff see and write everything). Clients can no longer
 * reach the shared `user_data` row directly, so one account can't read or
 * tamper with another tenant's data.
 *
 * Writes are optimistic-concurrency safe: the server rejects a save whose base
 * version is stale (409) instead of overwriting another writer's changes, and
 * the store reloads + merges + retries.
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

export interface SharedStateLoad {
  data: SharedState;
  version: number | null;
}

export interface SharedStateSaveResult {
  ok: boolean;
  conflict: boolean;
  version?: number | null;
}

async function sessionToken(): Promise<string | null> {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function loadSharedState(): Promise<SharedStateLoad | null> {
  if (!isSupabaseConfigured()) return null;
  const token = await sessionToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/state', { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; data?: SharedState; version?: number | null };
    return data?.ok && data.data ? { data: data.data, version: data.version ?? null } : null;
  } catch (e) {
    console.warn('shared state load failed:', e);
    return null;
  }
}

/**
 * Publish the shared state. `baseVersion` is the version this snapshot was
 * derived from; if the server has moved on it returns `{ conflict: true }` and
 * the caller must reload + re-merge + retry.
 */
export async function saveSharedState(data: SharedState, baseVersion?: number | null): Promise<SharedStateSaveResult> {
  if (!isSupabaseConfigured()) return { ok: true, conflict: false };
  // Two-way sync: keep the business tables authoritative before publishing to
  // the shared row, so the dashboard charts correlate with the database.
  await mirrorToDb(data);
  const token = await sessionToken();
  if (!token) return { ok: false, conflict: false };
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ data, baseVersion: baseVersion ?? null }),
    });
    if (res.status === 409) return { ok: false, conflict: true, version: null };
    if (!res.ok) {
      console.warn('shared state save failed:', res.status);
      return { ok: false, conflict: false };
    }
    const out = (await res.json()) as { ok?: boolean; version?: number | null };
    return { ok: out.ok === true, conflict: false, version: out.version ?? null };
  } catch (e) {
    console.warn('shared state save failed:', e);
    return { ok: false, conflict: false };
  }
}
