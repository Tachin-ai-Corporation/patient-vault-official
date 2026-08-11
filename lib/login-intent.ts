const LOGIN_INTENT_KEY = 'patient-vault:login-intent'
const BLOCKED_PATHS = ['/auth', '/api']

export function validateLoginIntent(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  try {
    const url = new URL(value, 'https://patient-vault.local')
    if (url.origin !== 'https://patient-vault.local') return null
    if (BLOCKED_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
      return null
    }
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

export function saveLoginIntent(value: string): void {
  const validated = validateLoginIntent(value)
  if (validated) window.sessionStorage.setItem(LOGIN_INTENT_KEY, validated)
}

export function consumeLoginIntent(fallback = '/patients'): string {
  const stored = window.sessionStorage.getItem(LOGIN_INTENT_KEY)
  window.sessionStorage.removeItem(LOGIN_INTENT_KEY)
  return validateLoginIntent(stored) ?? fallback
}

export function currentLoginIntent(): string {
  const params = new URLSearchParams(window.location.search)
  const guardedTarget = validateLoginIntent(params.get('returnTo'))
  if (guardedTarget) return guardedTarget

  const current = validateLoginIntent(`${window.location.pathname}${window.location.search}`)
  return current && current !== '/' ? current : '/patients'
}
