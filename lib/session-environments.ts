export type SessionEnvironment = 'demo' | 'prod'
export type SessionAdmission = SessionEnvironment | 'resolving' | null
export type UiEnvironment = 'staging' | 'production'

export const SESSION_ENVIRONMENTS: readonly SessionEnvironment[] = ['demo', 'prod']

export const ENVIRONMENT_CONFIG: Record<
  SessionEnvironment,
  { apiRoot: string; loginUrl: string; ui: UiEnvironment; label: string }
> = {
  demo: {
    apiRoot: 'https://1health.demo.1health.io',
    loginUrl: 'https://pv.demo.1health.io/login?openApp=Patient%20Vault',
    ui: 'staging',
    label: 'Sandbox',
  },
  prod: {
    apiRoot: 'https://1health.app.1health.io',
    loginUrl: 'https://1health.app.1health.io/login?openApp=Patient%20Vault',
    ui: 'production',
    label: 'Production',
  },
}

export const SESSION_FIELDS = [
  'base_url',
  'access_token',
  'refresh_token',
  'token_expires_at',
  'refresh_token_expires_at',
  'user_org_id',
  'user_id',
] as const

export type SessionField = (typeof SESSION_FIELDS)[number]

export function sessionCookieName(env: SessionEnvironment, field: SessionField): string {
  return `${env}_${field}`
}

/** Resolve the exact URL stored by the launch flow for an environment slot. */
export function connectedBaseUrlFor(
  env: SessionEnvironment,
  readCookie: (name: string) => string | null,
): string | null {
  const scopedBaseUrl = readCookie(sessionCookieName(env, 'base_url'))
  const activeBaseUrl = readCookie('active_environment') === env
    ? readCookie('onehealth_base_url')
    : null
  return (scopedBaseUrl ?? activeBaseUrl)?.replace(/\/+$/, '') ?? null
}

export function sessionEnvironmentFromBaseUrl(baseUrl: string | null): SessionEnvironment | null {
  if (!baseUrl) return null

  try {
    const hostname = new URL(baseUrl).hostname
    if (hostname === '1health.demo.1health.io') return 'demo'
    if (hostname === '1health.app.1health.io') return 'prod'
  } catch {
    return null
  }

  return null
}

/** Resolve the environment represented by the session that is actually active. */
export function connectedSessionEnvironment(
  readCookie: (name: string) => string | null,
): SessionEnvironment | null {
  const active = sessionEnvironmentFromBaseUrl(readCookie('onehealth_base_url'))
  if (active) return active

  for (const env of SESSION_ENVIRONMENTS) {
    if (!readCookie(sessionCookieName(env, 'access_token'))) continue
    const connected = sessionEnvironmentFromBaseUrl(connectedBaseUrlFor(env, readCookie))
    if (connected) return connected
  }

  return null
}

/**
 * Admit a valid legacy token while its companion launch base URL is becoming
 * visible, but never infer an environment from the token alone.
 */
export function sessionAdmission(
  readCookie: (name: string) => string | null,
  skewSeconds = 30,
): SessionAdmission {
  const connected = connectedSessionEnvironment(readCookie)
  if (connected && sessionIsUnexpired(connected, readCookie, skewSeconds)) return connected

  const legacyToken = readCookie('access_token')
  if (!legacyToken) return null
  const rawExpiry = readCookie('token_expires_at')
  if (!rawExpiry) return 'resolving'
  const expiry = Number.parseInt(rawExpiry, 10)
  return Number.isFinite(expiry) && Math.floor(Date.now() / 1000) < expiry - skewSeconds
    ? 'resolving'
    : null
}

export function isSessionEnvironment(value: unknown): value is SessionEnvironment {
  return value === 'demo' || value === 'prod'
}

export function toUiEnvironment(env: SessionEnvironment): UiEnvironment {
  return ENVIRONMENT_CONFIG[env].ui
}

export function fromUiEnvironment(env: UiEnvironment): SessionEnvironment {
  return env === 'production' ? 'prod' : 'demo'
}

export function sessionIsUnexpired(
  env: SessionEnvironment,
  readCookie: (name: string) => string | null,
  skewSeconds = 30,
): boolean {
  if (!readCookie(sessionCookieName(env, 'access_token'))) return false
  const rawExpiry = readCookie(sessionCookieName(env, 'token_expires_at'))
  if (!rawExpiry) return true
  const expiry = Number.parseInt(rawExpiry, 10)
  return Number.isFinite(expiry) && Math.floor(Date.now() / 1000) < expiry - skewSeconds
}
