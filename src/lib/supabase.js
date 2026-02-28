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
