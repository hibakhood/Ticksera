import { getSupabase, isSupabaseConfigured } from './supabase';

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Well-known user_id for the SHARED application-state row. Every role reads and
 * writes this single row so the admin, technician, and customer dashboards all
 * reflect the same tickets/users/payments/bookings. The RLS policies in
 * supabase/migrations/0003_shared_state.sql let any authenticated user upsert it.
 */
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

export async function loadSharedState(): Promise<SharedState | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('user_data')
      .select('data')
      .eq('user_id', GLOBAL_STATE_ID)
      .maybeSingle();
    if (error) {
      console.warn('shared state load failed:', error.message);
      return null;
    }
    return (data?.data as SharedState | undefined) ?? null;
  } catch (e) {
    console.warn('shared state load failed:', e);
    return null;
  }
}

export async function saveSharedState(data: SharedState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await getSupabase()
      .from('user_data')
      .upsert(
        { user_id: GLOBAL_STATE_ID, data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.warn('shared state save failed:', error.message);
  } catch (e) {
    console.warn('shared state save failed:', e);
  }
}
