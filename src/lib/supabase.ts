import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey && !url.includes('your-project') && !anonKey.includes('placeholder')
}

const demo = (import.meta.env.VITE_ENABLE_DEMO_MODE ?? '').trim().toLowerCase()

/**
 * Fail-closed demo mode (audit finding H4): local/demo auth paths (seed-account
 * login, demo login, offline password reset, offline signup) are ONLY reachable
 * when the deployment explicitly opts in with VITE_ENABLE_DEMO_MODE. A build
 * with neither Supabase configured nor the demo flag set cannot be signed into
 * through the local fallback, so an insecurely deployed demo build never
 * silently accepts the hard-coded seed passwords.
 */
export function isDemoModeAllowed(): boolean {
  return demo === 'true' || demo === '1' || demo === 'yes' || demo === 'on'
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  return supabase
}
