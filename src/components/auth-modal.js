/**
 * Auth modal: two entry points (Sign in / Create account), each reveals its own form.
 * Inline errors, focus trap, escape to close.
 *
 * @param {Object} options
 * @param {HTMLElement} [options.container] - Where to mount the modal (default: document.body)
 * @param {typeof import('../lib/auth.js').signIn} options.signIn
 * @param {typeof import('../lib/auth.js').signUp} options.signUp
 * @param {() => void} options.onSuccess - Called after successful sign in or sign up; caller should close modal and reload.
 */
export function createAuthModal({ container = document.body, signIn, signUp, onSuccess }) {
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

  const backdrop = document.createElement('div')
  backdrop.className = 'auth-modal-backdrop'
  backdrop.setAttribute('aria-hidden', 'true')
  backdrop.hidden = true

  const dialog = document.createElement('div')
  dialog.className = 'auth-modal'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', 'auth-modal-title')

  const choiceScreen = document.createElement('div')
  choiceScreen.className = 'auth-modal-choice-screen'

  const choiceHeader = document.createElement('div')
  choiceHeader.className = 'auth-modal-choice-header'
  const title = document.createElement('h2')
  title.id = 'auth-modal-title'
  title.className = 'auth-modal-title'
  title.textContent = 'Account'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'auth-modal-close'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.innerHTML = '<span aria-hidden="true">×</span>'
  choiceHeader.appendChild(title)
  choiceHeader.appendChild(closeBtn)

  const choice = document.createElement('div')
  choice.className = 'auth-modal-choice'
  const signInBtn = document.createElement('button')
  signInBtn.type = 'button'
  signInBtn.className = 'auth-modal-choice-btn'
  signInBtn.textContent = 'Sign in'
  signInBtn.setAttribute('aria-label', 'Sign in with email')
  const signUpBtn = document.createElement('button')
  signUpBtn.type = 'button'
  signUpBtn.className = 'auth-modal-choice-btn'
  signUpBtn.textContent = 'Create account'
  signUpBtn.setAttribute('aria-label', 'Create an account')
  choice.appendChild(signInBtn)
  choice.appendChild(signUpBtn)
  choiceScreen.appendChild(choiceHeader)
  choiceScreen.appendChild(choice)

  const signInFormWrap = document.createElement('div')
  signInFormWrap.className = 'auth-modal-form-wrap'
  signInFormWrap.hidden = true
  const signInBackBtn = document.createElement('button')
  signInBackBtn.type = 'button'
  signInBackBtn.className = 'auth-modal-back'
  signInBackBtn.setAttribute('aria-label', 'Back')
  signInBackBtn.innerHTML = '<span aria-hidden="true">←</span>'
  const signInForm = document.createElement('form')
  signInForm.className = 'auth-form'
  signInForm.setAttribute('aria-label', 'Sign in')
  const signInEmailLabel = document.createElement('label')
  signInEmailLabel.htmlFor = 'auth-signin-email'
  signInEmailLabel.className = 'auth-form-label'
  signInEmailLabel.textContent = 'Email'
  const signInEmail = document.createElement('input')
  signInEmail.id = 'auth-signin-email'
  signInEmail.type = 'email'
  signInEmail.name = 'email'
  signInEmail.className = 'auth-form-input'
  signInEmail.autocomplete = 'email'
  signInEmail.required = true
  const signInPasswordLabel = document.createElement('label')
  signInPasswordLabel.htmlFor = 'auth-signin-password'
  signInPasswordLabel.className = 'auth-form-label'
  signInPasswordLabel.textContent = 'Password'
  const signInPassword = document.createElement('input')
  signInPassword.id = 'auth-signin-password'
  signInPassword.type = 'password'
  signInPassword.name = 'password'
  signInPassword.className = 'auth-form-input'
  signInPassword.autocomplete = 'current-password'
  signInPassword.required = true
  const signInError = document.createElement('div')
  signInError.className = 'auth-form-error'
  signInError.setAttribute('role', 'alert')
  signInError.hidden = true
  const signInSubmitWrap = document.createElement('div')
  signInSubmitWrap.className = 'auth-form-actions'
  const signInSubmit = document.createElement('button')
  signInSubmit.type = 'submit'
  signInSubmit.className = 'auth-form-submit'
  signInSubmit.textContent = 'Sign in'
  signInForm.appendChild(signInEmailLabel)
  signInForm.appendChild(signInEmail)
  signInForm.appendChild(signInPasswordLabel)
  signInForm.appendChild(signInPassword)
  signInForm.appendChild(signInError)
  signInForm.appendChild(signInSubmitWrap)
  signInSubmitWrap.appendChild(signInSubmit)
  signInFormWrap.appendChild(signInBackBtn)
  signInFormWrap.appendChild(signInForm)

  const signUpFormWrap = document.createElement('div')
  signUpFormWrap.className = 'auth-modal-form-wrap'
  signUpFormWrap.hidden = true
  const signUpBackBtn = document.createElement('button')
  signUpBackBtn.type = 'button'
  signUpBackBtn.className = 'auth-modal-back'
  signUpBackBtn.setAttribute('aria-label', 'Back')
  signUpBackBtn.innerHTML = '<span aria-hidden="true">←</span>'
  const signUpForm = document.createElement('form')
  signUpForm.className = 'auth-form'
  signUpForm.setAttribute('aria-label', 'Create account')
  const signUpEmailLabel = document.createElement('label')
  signUpEmailLabel.htmlFor = 'auth-signup-email'
  signUpEmailLabel.className = 'auth-form-label'
  signUpEmailLabel.textContent = 'Email'
  const signUpEmail = document.createElement('input')
  signUpEmail.id = 'auth-signup-email'
  signUpEmail.type = 'email'
  signUpEmail.name = 'email'
  signUpEmail.className = 'auth-form-input'
  signUpEmail.autocomplete = 'email'
  signUpEmail.required = true
  const signUpPasswordLabel = document.createElement('label')
  signUpPasswordLabel.htmlFor = 'auth-signup-password'
  signUpPasswordLabel.className = 'auth-form-label'
  signUpPasswordLabel.textContent = 'Password'
  const signUpPassword = document.createElement('input')
  signUpPassword.id = 'auth-signup-password'
  signUpPassword.type = 'password'
  signUpPassword.name = 'password'
  signUpPassword.className = 'auth-form-input'
  signUpPassword.autocomplete = 'new-password'
  signUpPassword.required = true
  const signUpError = document.createElement('div')
  signUpError.className = 'auth-form-error'
  signUpError.setAttribute('role', 'alert')
  signUpError.hidden = true
  const signUpSubmitWrap = document.createElement('div')
  signUpSubmitWrap.className = 'auth-form-actions'
  const signUpSubmit = document.createElement('button')
  signUpSubmit.type = 'submit'
  signUpSubmit.className = 'auth-form-submit'
  signUpSubmit.textContent = 'Create account'
  signUpForm.appendChild(signUpEmailLabel)
  signUpForm.appendChild(signUpEmail)
  signUpForm.appendChild(signUpPasswordLabel)
  signUpForm.appendChild(signUpPassword)
  signUpForm.appendChild(signUpError)
  signUpForm.appendChild(signUpSubmitWrap)
  signUpSubmitWrap.appendChild(signUpSubmit)
  signUpFormWrap.appendChild(signUpBackBtn)
  signUpFormWrap.appendChild(signUpForm)

  dialog.appendChild(choiceScreen)
  dialog.appendChild(signInFormWrap)
  dialog.appendChild(signUpFormWrap)
  backdrop.appendChild(dialog)

  let previousActiveElement = null

  function getFocusables() {
    return Array.from(backdrop.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.hidden && el.getAttribute('tabindex') !== '-1'
    )
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return
    const focusables = getFocusables()
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

  function showChoice() {
    choiceScreen.hidden = false
    signInFormWrap.hidden = true
    signUpFormWrap.hidden = true
    signInError.textContent = ''
    signInError.hidden = true
    signUpError.textContent = ''
    signUpError.hidden = true
  }

  function showForm(formWrap) {
    choiceScreen.hidden = true
    signInFormWrap.hidden = formWrap !== signInFormWrap
    signUpFormWrap.hidden = formWrap !== signUpFormWrap
  }

  function open() {
    showChoice()
    previousActiveElement = document.activeElement
    backdrop.hidden = false
    backdrop.setAttribute('aria-hidden', 'false')
    signInBtn.focus()
    document.addEventListener('keydown', trapFocus)
    document.body.classList.add('auth-modal-open')
  }

  function close() {
    backdrop.hidden = true
    backdrop.setAttribute('aria-hidden', 'true')
    document.removeEventListener('keydown', trapFocus)
    document.body.classList.remove('auth-modal-open')
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus()
    }
  }

  signInBtn.addEventListener('click', () => {
    showForm(signInFormWrap)
    signInError.textContent = ''
    signInError.hidden = true
    signInEmail.value = ''
    signInPassword.value = ''
    signInEmail.focus()
  })

  signUpBtn.addEventListener('click', () => {
    showForm(signUpFormWrap)
    signUpError.textContent = ''
    signUpError.hidden = true
    signUpEmail.value = ''
    signUpPassword.value = ''
    signUpEmail.focus()
  })

  signInBackBtn.addEventListener('click', () => {
    showChoice()
    signInBtn.focus()
  })

  signUpBackBtn.addEventListener('click', () => {
    showChoice()
    signUpBtn.focus()
  })

  closeBtn.addEventListener('click', () => close())

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close()
  })

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (!signInFormWrap.hidden || !signUpFormWrap.hidden) {
        showChoice()
        signInBtn.focus()
      } else {
        close()
      }
    }
  })

  signInForm.addEventListener('submit', async (e) => {
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
  })

  signUpForm.addEventListener('submit', async (e) => {
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
  })

  container.appendChild(backdrop)

  return {
    open,
    close
  }
}
