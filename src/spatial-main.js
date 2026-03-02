import './base.css'
import './spatial.css'
import { supabase, ensureSession } from './lib/supabase.js'
import { getAuthState, signIn, signUp, signOut, onAuthStateChange } from './lib/auth.js'
import { createAuthModal } from './components/auth-modal.js'
import { initSpatialView } from './views/spatial-view.js'

;(async () => {
  if (supabase) await ensureSession()

  const spatialView = initSpatialView(supabase)
  const reloadTasks = spatialView?.reloadTasks ?? (() => {})

  const authHeaderEl = document.getElementById('auth-header')
  let authModal = null

  async function refreshAuthHeader() {
    if (!authHeaderEl) return
    if (!supabase) {
      authHeaderEl.innerHTML = ''
      return
    }
    const { user, isAnonymous } = await getAuthState()
    authHeaderEl.innerHTML = ''
    if (isAnonymous || !user?.email) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'auth-header-btn'
      btn.textContent = 'Sign in'
      btn.setAttribute('aria-label', 'Sign in or create account')
      btn.addEventListener('click', () => authModal?.open())
      authHeaderEl.appendChild(btn)
    } else {
      const emailSpan = document.createElement('span')
      emailSpan.className = 'auth-header-email'
      emailSpan.textContent = user.email
      const signOutBtn = document.createElement('button')
      signOutBtn.type = 'button'
      signOutBtn.className = 'auth-header-signout'
      signOutBtn.textContent = 'Sign out'
      signOutBtn.setAttribute('aria-label', 'Sign out')
      signOutBtn.addEventListener('click', async () => {
        await signOut()
        await ensureSession()
        await reloadTasks()
        await refreshAuthHeader()
      })
      authHeaderEl.appendChild(emailSpan)
      authHeaderEl.appendChild(signOutBtn)
    }
  }

  if (supabase) {
    authModal = createAuthModal({
      signIn,
      signUp,
      onSuccess: async () => {
        await reloadTasks()
        await refreshAuthHeader()
      }
    })
    onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') await ensureSession()
      await reloadTasks()
      await refreshAuthHeader()
    })
  }

  await refreshAuthHeader()
})()
