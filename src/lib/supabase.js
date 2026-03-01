import { createClient } from '@supabase/supabase-js'

// Vite only loads .env when the dev server starts – restart after changing .env
const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const hasEnv = !!(url && anonKey)
if (!hasEnv && import.meta.env.DEV) {
  console.warn(
    '[Supabase] Not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server (stop and run `pnpm dev` again from the project root).'
  )
  console.warn('[Supabase] Env check:', { hasUrl: !!url, hasKey: !!anonKey })
}

export const supabase = hasEnv ? createClient(url, anonKey) : null

/**
 * Ensures a Supabase auth session exists. Uses existing session if present,
 * otherwise signs in anonymously. Call this before loading/saving user data.
 * @returns {Promise<import('@supabase/supabase-js').User | null>} Current user or null if no client or auth failed.
 */
export async function ensureSession() {
  if (!supabase) return null
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (session?.user) return session.user
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error)
    return null
  }
  return data?.user ?? null
}
