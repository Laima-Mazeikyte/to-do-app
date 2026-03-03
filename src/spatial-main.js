import './base.css'
import './spatial.css'
import { initTheme } from './lib/theme.js'
import { supabase, ensureSession } from './lib/supabase.js'

initTheme()
import { getAuthState, signIn, signUp, signOut, onAuthStateChange } from './lib/auth.js'
import { createAuthModal } from './components/auth-modal.js'
import { initSpatialView } from './views/spatial-view.js'

;(async () => {
  if (supabase) await ensureSession()

  const spatialView = initSpatialView(supabase, {
    auth: supabase
      ? {
          openAuthModal: () => authModal?.open(),
          signOut: async () => {
            await signOut()
            await ensureSession()
          },
          getAuthState
        }
      : undefined
  })
  const reloadTasks = spatialView?.reloadTasks ?? (() => {})
  const refreshMoreMenuAuth = spatialView?.refreshMoreMenuAuth ?? (async () => {})

  /** Wait for layout to settle after DOM changes (e.g. auth header update). */
  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
  }

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
      const guestText = document.createElement('span')
      guestText.className = 'auth-header-guest-text'
      guestText.textContent = 'Using app as guest'
      const signInLink = document.createElement('button')
      signInLink.type = 'button'
      signInLink.className = 'auth-header-signin-link'
      signInLink.textContent = 'Sign in'
      signInLink.setAttribute('aria-label', 'Sign in or create account')
      signInLink.addEventListener('click', () => authModal?.open())
      authHeaderEl.appendChild(guestText)
      authHeaderEl.appendChild(signInLink)
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
        await refreshAuthHeader()
        await waitForLayout()
        // reloadTasks runs via onAuthStateChange – avoids double reload race
      })
      authHeaderEl.appendChild(emailSpan)
      authHeaderEl.appendChild(signOutBtn)
    }
    await refreshMoreMenuAuth()
  }

  if (supabase) {
    authModal = createAuthModal({
      signIn,
      signUp,
      onSuccess: async () => {
        await refreshAuthHeader()
        await waitForLayout()
        // reloadTasks runs via onAuthStateChange – avoids double reload race
      }
    })
    onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        await ensureSession()
        await refreshAuthHeader()
        await waitForLayout()
        return
      }
      await refreshAuthHeader()
      await waitForLayout()
      await reloadTasks()
    })
  }

  await refreshAuthHeader()
})()
