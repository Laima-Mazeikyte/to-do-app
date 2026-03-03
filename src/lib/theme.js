/**
 * Theme module: light / dark / system.
 * Applies dark class to html; default is system (follows OS).
 */

const STORAGE_KEY = 'spatial-theme'
const VALID_THEMES = ['light', 'dark', 'system']

/** @type {() => boolean} */
let systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

/**
 * @returns {'light' | 'dark' | 'system'}
 */
export function getTheme() {
  if (typeof localStorage === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY)
  return VALID_THEMES.includes(saved) ? /** @type {'light' | 'dark' | 'system'} */ (saved) : 'system'
}

/**
 * @param {'light' | 'dark' | 'system'} theme
 */
export function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme()
}

/**
 * @returns {'light' | 'dark'}
 */
export function getResolvedTheme() {
  const theme = getTheme()
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark = getResolvedTheme() === 'dark'
  root.classList.toggle('dark', isDark)
}

/** Run once on load; also sets up system preference listener. */
export function initTheme() {
  applyTheme()
  if (typeof window === 'undefined') return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme()
  })
}
