// Standalone partner-referral helper for the marketing surface.
//
// Replaces the excluded lib/user-context module (a mock-session store). This
// file carries NO user/session logic — it only captures the ?ref= query param
// on the public landing page and persists it to localStorage so it survives the
// multi-step signup navigation on 1health. Validation of the ref against real
// partner credits happens server-side at user creation, not here.

const STORAGE_KEY = 'pv_partner_ref'

// Partner referral programs surfaced in the landing banner. Kept as static copy
// only; the authoritative credit grant is applied at signup on 1health.
export const partnerCredits: Record<string, { name: string; credit: number }> = {
  verge: { name: 'Verge HealthTech', credit: 25000 },
  'plug-and-play': { name: 'Plug and Play', credit: 25000 },
  hackathon: { name: 'a hackathon partner', credit: 25000 },
}

// Capture the raw ref value from the URL and persist it. No-op on the server and
// when no ref is present. Storage failures are swallowed (private mode, etc.).
export function captureRef(ref: string | null): void {
  if (typeof window === 'undefined') return
  if (!ref) return
  try {
    localStorage.setItem(STORAGE_KEY, ref)
  } catch {
    // ignore storage failures
  }
}

// Read back a previously captured ref, if any.
export function getStoredRef(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
