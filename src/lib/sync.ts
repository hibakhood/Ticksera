import { getSupabase, isSupabaseConfigured } from './supabase';

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function remoteLoadUserData(userId: string): Promise<unknown | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('user_data load failed:', error.message);
      return null;
    }
    return data?.data ?? null;
  } catch (e) {
    console.warn('user_data load failed:', e);
    return null;
  }
}

export async function remoteSaveUserData(userId: string, data: unknown): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await getSupabase()
      .from('user_data')
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.warn('user_data save failed:', error.message);
  } catch (e) {
    console.warn('user_data save failed:', e);
  }
}
