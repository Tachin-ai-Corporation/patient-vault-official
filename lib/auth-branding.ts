// Branding hooks for the hosted auth screens.
//
// Model: 1health hosts the registration/login flow; a developer's app only
// "decorates" it (Plaid-style). The flow + steps are fixed — only branding is
// configurable. Supply a partial `AuthBranding` (e.g. from a per-developer
// config record or query param) and it is merged over the 1health defaults,
// so an unbranded screen always falls back to current 1health styling.

export type AuthBranding = {
  /** Product / vault name shown under the logo. */
  title: string
  /** One-line positioning shown beneath the title. */
  tagline: string
  /** Short text mark rendered in the logo chip when no logo image is set. */
  logoText: string
  /** Optional logo image URL. When set, it replaces the text chip. */
  logoSrc?: string
  /** Accessible name for the logo image. */
  logoAlt?: string
  /** Primary brand color (logo chip background). Any CSS color. */
  brandColor: string
  /** Foreground color used on top of `brandColor`. */
  onBrandColor: string
  /** Accent color for interactive bits (links, step indicator, focus). */
  accentColor: string
}

// Current 1health styling — the default when a developer sets nothing.
export const DEFAULT_BRANDING: AuthBranding = {
  title: 'Patient Vault',
  tagline: 'The patient database for your healthcare app.',
  logoText: '1h',
  brandColor: 'var(--trust-blue)',
  onBrandColor: '#e6ebf0',
  accentColor: 'var(--accent)',
}

/** Merge a partial developer config over the 1health defaults. */
export function resolveBranding(
  overrides?: Partial<AuthBranding> | null,
): AuthBranding {
  if (!overrides) return DEFAULT_BRANDING
  return { ...DEFAULT_BRANDING, ...overrides }
}

// The Patient Vault brandingId registered with 1health. It is appended to every
// outbound hosted login/registration URL so 1health renders the Patient Vault
// branding on its login and registration screens.
export const BRANDING_ID = '805f90f6-2b22-4e55-8a0c-7c33df804ce5'

/**
 * Append the Patient Vault `brandingId` to a 1health login/registration URL,
 * preserving any existing query string (e.g. `?openApp=Patient%20Vault`).
 */
export function withBrandingId(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}brandingId=${BRANDING_ID}`
}

/** Light/dark selection forwarded to the hosted 1health auth screens. */
export type AuthMode = 'light' | 'dark'

/**
 * Read the active theme straight from the DOM.
 *
 * The pre-hydration script in `layout.tsx` sets `light`/`dark` on <html>, so
 * this is accurate even before React hydrates — which makes it the reliable
 * source of truth for server-rendered markup, where `useTheme()` isn't
 * available. Falls back to `dark` (the app default) outside the browser.
 */
export function currentAuthMode(): AuthMode {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

/**
 * Build an outbound 1health login/registration URL carrying both the Patient
 * Vault `brandingId` and the current `mode`, so the hosted screen renders in the
 * same light/dark mode the user selected here.
 *
 * `withBrandingId` always introduces a `?`, so appending `&mode=` is safe.
 */
export function withAuthParams(url: string, mode: AuthMode): string {
  return `${withBrandingId(url)}&mode=${mode}`
}
