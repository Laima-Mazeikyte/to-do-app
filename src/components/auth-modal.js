/**
 * Auth drawer: two entry points (Sign in / Create account), each reveals its own form.
 * Uses the same drawer pattern and style as "Add from a list".
 * Inline errors, focus trap, escape to close, backdrop click to close.
 *
 * @param {Object} options
 * @param {typeof import('../lib/auth.js').signIn} options.signIn
 * @param {typeof import('../lib/auth.js').signUp} options.signUp
 * @param {() => void} options.onSuccess - Called after successful sign in or sign up; caller should close and reload.
 */
export function createAuthModal({ signIn, signUp, onSuccess }) {
  const DRAWER_FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  const backdrop = document.getElementById('spatial-auth-drawer-backdrop')
  const drawer = document.getElementById('spatial-auth-drawer')
  const contentEl = document.getElementById('spatial-auth-drawer-content')

  if (!backdrop || !drawer || !contentEl) {
    console.warn('[Auth] Auth drawer elements not found')
    return { open: () => {}, close: () => {} }
  }

  let signInEmail, signInPassword, signInError, signInSubmit
  let signUpEmail, signUpPassword, signUpError, signUpSubmit
  let signInBtn, signUpBtn, signInFormWrap, signUpFormWrap, choiceScreen
  let closeBtn, signInBackBtn, signUpBackBtn

  function buildChoiceScreen() {
    const wrap = document.createElement('div')
    wrap.className = 'auth-drawer-choice'

    const header = document.createElement('div')
    header.className = 'auth-drawer-header'
    const title = document.createElement('h2')
    title.id = 'spatial-auth-drawer-title'
    title.className = 'spatial-drawer-title'
    title.textContent = 'Account'
    closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'auth-drawer-close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.innerHTML = '<span aria-hidden="true">×</span>'
    header.appendChild(title)
    header.appendChild(closeBtn)

    const hint = document.createElement('p')
    hint.className = 'spatial-drawer-hint'
    hint.textContent = 'Sign in or create an account to sync your to-dos across devices.'

    const actions = document.createElement('div')
    actions.className = 'spatial-drawer-actions'
    signInBtn = document.createElement('button')
    signInBtn.type = 'button'
    signInBtn.className = 'spatial-drawer-btn spatial-drawer-btn--primary'
    signInBtn.textContent = 'Sign in'
    signInBtn.setAttribute('aria-label', 'Sign in with email')
    signUpBtn = document.createElement('button')
    signUpBtn.type = 'button'
    signUpBtn.className = 'spatial-drawer-btn spatial-drawer-btn--secondary'
    signUpBtn.textContent = 'Create account'
    signUpBtn.setAttribute('aria-label', 'Create an account')
    actions.appendChild(signInBtn)
    actions.appendChild(signUpBtn)

    wrap.appendChild(header)
    wrap.appendChild(hint)
    wrap.appendChild(actions)
    return wrap
  }

  function createPasswordField(inputId, autocomplete, options = {}) {
    const wrap = document.createElement('div')
    wrap.className = 'auth-drawer-password-wrap'
    const label = document.createElement('label')
    label.htmlFor = inputId
    label.className = 'auth-drawer-label'
    label.textContent = 'Password'
    const inputWrap = document.createElement('div')
    inputWrap.className = 'auth-drawer-input-wrap'
    const input = document.createElement('input')
    input.id = inputId
    input.type = 'password'
    input.name = 'password'
    input.className = 'spatial-drawer-input auth-drawer-password-input'
    input.autocomplete = autocomplete
    input.required = true
    const eyeSvg = '<svg class="auth-drawer-password-icon auth-drawer-password-icon--show" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    const eyeOffSvg = '<svg class="auth-drawer-password-icon auth-drawer-password-icon--hide" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    const toggleBtn = document.createElement('button')
    toggleBtn.type = 'button'
    toggleBtn.className = 'auth-drawer-password-toggle'
    toggleBtn.setAttribute('aria-label', 'Show password')
    toggleBtn.innerHTML = eyeSvg
    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password'
      input.type = isPassword ? 'text' : 'password'
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password')
      toggleBtn.innerHTML = isPassword ? eyeOffSvg : eyeSvg
    })
    inputWrap.appendChild(input)
    inputWrap.appendChild(toggleBtn)
    wrap.appendChild(label)
    wrap.appendChild(inputWrap)
    if (options.hint) {
      const hint = document.createElement('p')
      hint.className = 'auth-drawer-password-hint'
      hint.textContent = options.hint
      wrap.appendChild(hint)
    }
    return { wrap, input }
  }

  function buildSignInForm() {
    const wrap = document.createElement('div')
    wrap.className = 'auth-drawer-form-wrap'

    const header = document.createElement('div')
    header.className = 'auth-drawer-header auth-drawer-header--back-only'
    signInBackBtn = document.createElement('button')
    signInBackBtn.type = 'button'
    signInBackBtn.className = 'auth-drawer-back'
    signInBackBtn.textContent = '← Back'
    signInBackBtn.setAttribute('aria-label', 'Back to account options')

    const form = document.createElement('form')
    form.className = 'auth-drawer-form'
    form.setAttribute('aria-label', 'Sign in')
    const title = document.createElement('h2')
    title.id = 'spatial-auth-drawer-title'
    title.className = 'spatial-drawer-title auth-drawer-form-title'
    title.textContent = 'Sign in'
    const emailLabel = document.createElement('label')
    emailLabel.htmlFor = 'auth-signin-email'
    emailLabel.className = 'auth-drawer-label'
    emailLabel.textContent = 'Email'
    signInEmail = document.createElement('input')
    signInEmail.id = 'auth-signin-email'
    signInEmail.type = 'email'
    signInEmail.name = 'email'
    signInEmail.className = 'spatial-drawer-input'
    signInEmail.autocomplete = 'email'
    signInEmail.required = true
    const { wrap: passwordWrap, input: passwordInput } = createPasswordField('auth-signin-password', 'current-password')
    signInPassword = passwordInput
    signInError = document.createElement('div')
    signInError.className = 'auth-drawer-error'
    signInError.setAttribute('role', 'alert')
    signInError.hidden = true
    signInSubmit = document.createElement('button')
    signInSubmit.type = 'submit'
    signInSubmit.className = 'spatial-drawer-btn spatial-drawer-btn--primary'
    signInSubmit.textContent = 'Sign in'

    form.appendChild(title)
    form.appendChild(emailLabel)
    form.appendChild(signInEmail)
    form.appendChild(passwordWrap)
    form.appendChild(signInError)
    form.appendChild(signInSubmit)

    header.appendChild(signInBackBtn)
    wrap.appendChild(header)
    wrap.appendChild(form)
    return wrap
  }

  function buildSignUpForm() {
    const wrap = document.createElement('div')
    wrap.className = 'auth-drawer-form-wrap'

    const header = document.createElement('div')
    header.className = 'auth-drawer-header auth-drawer-header--back-only'
    signUpBackBtn = document.createElement('button')
    signUpBackBtn.type = 'button'
    signUpBackBtn.className = 'auth-drawer-back'
    signUpBackBtn.textContent = '← Back'
    signUpBackBtn.setAttribute('aria-label', 'Back to account options')

    const form = document.createElement('form')
    form.className = 'auth-drawer-form'
    form.setAttribute('aria-label', 'Create account')
    const title = document.createElement('h2')
    title.id = 'spatial-auth-drawer-title'
    title.className = 'spatial-drawer-title auth-drawer-form-title'
    title.textContent = 'Create account'
    const emailLabel = document.createElement('label')
    emailLabel.htmlFor = 'auth-signup-email'
    emailLabel.className = 'auth-drawer-label'
    emailLabel.textContent = 'Email'
    signUpEmail = document.createElement('input')
    signUpEmail.id = 'auth-signup-email'
    signUpEmail.type = 'email'
    signUpEmail.name = 'email'
    signUpEmail.className = 'spatial-drawer-input'
    signUpEmail.autocomplete = 'email'
    signUpEmail.required = true
    const { wrap: passwordWrap, input: passwordInput } = createPasswordField('auth-signup-password', 'new-password', {
      hint: 'At least 6 characters (8+ recommended for security)'
    })
    signUpPassword = passwordInput
    signUpError = document.createElement('div')
    signUpError.className = 'auth-drawer-error'
    signUpError.setAttribute('role', 'alert')
    signUpError.hidden = true
    signUpSubmit = document.createElement('button')
    signUpSubmit.type = 'submit'
    signUpSubmit.className = 'spatial-drawer-btn spatial-drawer-btn--primary'
    signUpSubmit.textContent = 'Create account'

    form.appendChild(title)
    form.appendChild(emailLabel)
    form.appendChild(signUpEmail)
    form.appendChild(passwordWrap)
    form.appendChild(signUpError)
    form.appendChild(signUpSubmit)

    header.appendChild(signUpBackBtn)
    wrap.appendChild(header)
    wrap.appendChild(form)
    return wrap
  }

  function renderChoice() {
    contentEl.innerHTML = ''
    choiceScreen = buildChoiceScreen()
    contentEl.appendChild(choiceScreen)

    closeBtn.addEventListener('click', () => close())
    signInBtn.addEventListener('click', () => {
      renderSignIn()
      signInEmail?.focus()
    })
    signUpBtn.addEventListener('click', () => {
      renderSignUp()
      signUpEmail?.focus()
    })
  }

  function renderSignIn() {
    contentEl.innerHTML = ''
    signInFormWrap = buildSignInForm()
    contentEl.appendChild(signInFormWrap)
    signInError.textContent = ''
    signInError.hidden = true
    signInEmail.value = ''
    signInPassword.value = ''

    signInBackBtn.addEventListener('click', () => {
      renderChoice()
      signInBtn?.focus()
    })
    signInFormWrap.querySelector('form').addEventListener('submit', handleSignInSubmit)
    signInEmail.focus()
  }

  function renderSignUp() {
    contentEl.innerHTML = ''
    signUpFormWrap = buildSignUpForm()
    contentEl.appendChild(signUpFormWrap)
    signUpError.textContent = ''
    signUpError.hidden = true
    signUpEmail.value = ''
    signUpPassword.value = ''

    signUpBackBtn.addEventListener('click', () => {
      renderChoice()
      signUpBtn?.focus()
    })
    signUpFormWrap.querySelector('form').addEventListener('submit', handleSignUpSubmit)
    signUpEmail.focus()
  }

  async function handleSignInSubmit(e) {
    e.preventDefault()
    const email = signInEmail.value.trim()
    const password = signInPassword.value
    if (!email || !password) return
    signInError.hidden = true
    signInError.textContent = ''
    signInSubmit.disabled = true
    signInSubmit.textContent = 'Signing in…'
    const { error } = await signIn(email, password)
    signInSubmit.disabled = false
    signInSubmit.textContent = 'Sign in'
    if (error) {
      signInError.textContent = error.message || 'Sign in failed'
      signInError.hidden = false
      return
    }
    close()
    onSuccess()
  }

  async function handleSignUpSubmit(e) {
    e.preventDefault()
    const email = signUpEmail.value.trim()
    const password = signUpPassword.value
    if (!email || !password) return
    signUpError.hidden = true
    signUpError.textContent = ''
    signUpSubmit.disabled = true
    signUpSubmit.textContent = 'Creating account…'
    const { error } = await signUp(email, password)
    signUpSubmit.disabled = false
    signUpSubmit.textContent = 'Create account'
    if (error) {
      signUpError.textContent = error.message || 'Create account failed'
      signUpError.hidden = false
      return
    }
    close()
    onSuccess()
  }

  function getDrawerFocusables() {
    return [...drawer.querySelectorAll(DRAWER_FOCUSABLE)].filter(
      (el) => !el.hidden && el.getAttribute('tabindex') !== '-1'
    )
  }

  function trapDrawerFocus(e) {
    if (e.key !== 'Tab') return
    const focusables = getDrawerFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  function onDrawerKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      const formWrap = contentEl.querySelector('.auth-drawer-form-wrap')
      if (formWrap) {
        renderChoice()
        signInBtn?.focus()
      } else {
        close()
      }
    }
  }

  function open() {
    renderChoice()
    backdrop.hidden = false
    drawer.hidden = false
    backdrop.setAttribute('aria-hidden', 'false')
    drawer.setAttribute('aria-hidden', 'false')
    document.body.addEventListener('keydown', onDrawerKeydown)
    drawer.addEventListener('keydown', trapDrawerFocus)
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open')
      drawer.classList.add('is-open')
      signInBtn.focus()
    })
    document.body.classList.add('auth-drawer-open')
  }

  function close() {
    backdrop.classList.remove('is-open')
    drawer.classList.remove('is-open')
    const onTransitionEnd = () => {
      drawer.removeEventListener('transitionend', onTransitionEnd)
      backdrop.hidden = true
      drawer.hidden = true
      backdrop.setAttribute('aria-hidden', 'true')
      drawer.setAttribute('aria-hidden', 'true')
      document.body.removeEventListener('keydown', onDrawerKeydown)
      drawer.removeEventListener('keydown', trapDrawerFocus)
      document.body.classList.remove('auth-drawer-open')
    }
    drawer.addEventListener('transitionend', onTransitionEnd)
  }

  backdrop.addEventListener('click', () => close())

  return {
    open,
    close
  }
}
