import { supabase } from './supabase.js'

/**
 * @typedef {{ user: import('@supabase/supabase-js').User | null, isAnonymous: boolean }} AuthState
 */

/**
 * Get current auth state. Treats no user as anonymous for UI (show sign-in option).
 * @returns {Promise<AuthState>}
 */
export async function getAuthState() {
  if (!supabase) {
    return { user: null, isAnonymous: true }
  }
  const {
    data: { session }
  } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const isAnonymous = !user || !!user.is_anonymous
  return { user, isAnonymous }
}

/**
 * Sign up: if current user is anonymous, convert with updateUser; otherwise signUp.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: import('@supabase/supabase-js').User | null, error: import('@supabase/supabase-js').AuthError | null }>}
 */
export async function signUp(email, password) {
  if (!supabase) {
    return { data: null, error: { message: 'Auth not configured' } }
  }
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.updateUser({ email, password })
    return { data: data?.user ?? null, error }
  }
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data: data?.user ?? null, error }
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: import('@supabase/supabase-js').User | null, error: import('@supabase/supabase-js').AuthError | null }>}
 */
export async function signIn(email, password) {
  if (!supabase) {
    return { data: null, error: { message: 'Auth not configured' } }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data: data?.user ?? null, error }
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Subscribe to auth state changes. Invokes callback on SIGNED_IN, USER_UPDATED, SIGNED_OUT.
 * @param {(event: string) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {}
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
      callback(event)
    }
  })
  return () => subscription.unsubscribe()
}
