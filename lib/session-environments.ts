export type SessionEnvironment = 'demo' | 'prod'
export type UiEnvironment = 'staging' | 'production'

export const SESSION_ENVIRONMENTS: readonly SessionEnvironment[] = ['demo', 'prod']

export const ENVIRONMENT_CONFIG: Record<
  SessionEnvironment,
  { apiRoot: string; loginUrl: string; ui: UiEnvironment; label: string }
> = {
  demo: {
    apiRoot: 'https://1health.demo.1health.io',
    loginUrl: 'https://1health.demo.1health.io/login?openApp=Patient%20Vault',
    ui: 'staging',
    label: 'Staging',
  },
  prod: {
    apiRoot: 'https://1health.app.1health.io',
    loginUrl: 'https://1health.app.1health.io/login?openApp=Patient%20Vault',
    ui: 'production',
    label: 'Production',
  },
}

export const SESSION_FIELDS = [
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
