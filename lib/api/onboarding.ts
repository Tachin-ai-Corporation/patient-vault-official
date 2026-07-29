/**
 * Client-side Onboarding API
 *
 * Automatic first-run provisioning for developers who launch on the shared
 * bootstrap tenant (tenantId === 1). The flow:
 *   1. createTenant()   — POST /api/v2/tenant (multipart) creates the dev's org
 *   2. switchTenant()   — GET  /api/v2/user/switch-tenant/{id} returns a new
 *                         access token scoped to the new org; persisted to cookies
 *   3. createApiToken() — POST /api/v2/token issues the long-lived API key
 *
 * Follows the client-side pattern in docs/ACTION-PATTERNS.md: all calls go
 * through authFetch() and each function returns a { success, ... } result.
 */

import { authFetch, getOneHealthBaseUrl, refreshToken, setCookie } from "@/lib/auth-client"
import { fetchMyself } from "@/lib/api/user"
import { fetchAllTenants } from "@/lib/api/tenant"

/** The shared bootstrap tenant every developer is dropped onto before setup. */
const BOOTSTRAP_TENANT_ID = 1

// ============================================================================
// Types
// ============================================================================

export interface CreateTenantInput {
  /** Organization / vault name, e.g. "Ada Lovelace's Patient Vault". */
  name: string
  /** Primary corporate email for the new org (the developer's email). */
  primaryCorporateEmail: string
}

export interface CreateTenantResult {
  success: boolean
  tenantId?: number
  organizationId?: number
  error?: string
}

export interface SwitchTenantResult {
  success: boolean
  error?: string
  /** Safe diagnostic summary (no token values) surfaced in the UI when needed. */
  debug?: string
}

export interface ApiToken {
  id: number
  name: string
  tokenValue: string
  createdAt?: string
  expiresAt?: string
}

export interface ApiTokenResult {
  success: boolean
  token?: ApiToken
  error?: string
}

// ============================================================================
// Defaults
// ============================================================================

/**
 * A validated placeholder headquarters address. Org creation requires a
 * resolved address (lat/lon + validated flag); since this onboarding runs
 * without user input we seed a known-good default that the developer can edit
 * later in their org settings.
 */
const DEFAULT_HQ_ADDRESS = {
  addressLine1: "15720 Route 59",
  addressLine2: "n/a",
  cityName: "Plainfield",
  country: "United States",
  countryCode: "n/a",
  county: "Will County",
  lat: 41.5964418,
  lon: -88.20272980000001,
  postalCode: "60544",
  stateName: "IL",
  type: "Headquarters",
  validated: true,
  fullAddress: "15720 Rte 59, Plainfield, IL 60544, USA",
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// ============================================================================
// Step 1 — Create the developer's organization/tenant
// ============================================================================

/** Random 6-digit suffix (100000–999999) used to disambiguate a taken name. */
function randomSuffix(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** True when a 400 response body indicates the org name is already taken. */
function isNameTakenError(status: number, body: string): boolean {
  return status === 400 && /already exists/i.test(body)
}

/** Single POST /v2/tenant attempt for a specific name. */
async function postTenant(
  name: string,
  primaryCorporateEmail: string,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; body: string }> {
  const baseUrl = getOneHealthBaseUrl()
  const url = `${baseUrl}/api/v2/tenant`

  const dto = {
    name,
    organizationNpiId: null,
    primaryCorporateEmail,
    shortOrganizationName: name,
    types: ["Health Provider", "Go To Market"],
    headquartersAddress: {
      ...DEFAULT_HQ_ADDRESS,
      name: `${name}-(${uuid()})`,
    },
  }

  // multipart/form-data with a single "dto" JSON part. authFetch detects the
  // FormData body and lets the browser set the multipart boundary itself.
  const form = new FormData()
  form.append("dto", JSON.stringify(dto))

  const response = await authFetch(url, { method: "POST", body: form })
  if (!response.ok) {
    return { ok: false, status: response.status, body: await response.text() }
  }
  return { ok: true, data: await response.json() }
}

/** Substring that identifies any Patient Vault org, regardless of owner prefix. */
const VAULT_NAME_MARKER = "patient vault"

/**
 * Pure matcher: given a list of the user's tenants, return the id of an existing
 * Patient Vault, or null when the user has none.
 *
 * The onboarding gate re-fires whenever the platform drops the user back on the
 * bootstrap tenant (id 1) via LPL, which previously caused a brand-new org to be
 * created on every launch. The rule is deliberately broad: if ANY accessible
 * tenant name contains "patient vault" (case-insensitive) — e.g. "Daniel
 * Garcia's Patient Vault" or "… Patient Vault 967955" — we reuse it and never
 * provision another. The bootstrap tenant is ignored, and we return the LOWEST
 * matching id so repeated logins always converge on the same vault.
 */
export function matchExistingVaultId(
  tenants: ReadonlyArray<{ id: number; name?: unknown }>,
): number | null {
  const matches = tenants
    .filter(
      (t) =>
        t.id !== BOOTSTRAP_TENANT_ID &&
        typeof t.name === "string" &&
        t.name.toLowerCase().includes(VAULT_NAME_MARKER),
    )
    .sort((a, b) => a.id - b.id)

  return matches.length > 0 ? matches[0].id : null
}

export async function findExistingVaultId(): Promise<number | null> {
  const all = await fetchAllTenants()
  if (!all.success || !all.data) return null
  return matchExistingVaultId(all.data)
}

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  try {
    // The 1health tenant name is globally unique, so a returning developer (or a
    // duplicate common name) collides with a 400 "already exists". When that
    // happens, retry with a random 6-digit suffix, e.g. "Chris Hill's Patient
    // Vault 409839", until we land a free name.
    const MAX_ATTEMPTS = 5
    let name = input.name

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await postTenant(name, input.primaryCorporateEmail)

      if (result.ok) {
        const data = result.data as Record<string, any>
        // Response shape: { tenant: { id, name }, organization: { id, name } }.
        // Fall back through a couple of shapes defensively.
        const tenantId = data?.tenant?.id ?? data?.tenantId ?? data?.id
        const organizationId = data?.organization?.id ?? data?.organizationId

        if (!tenantId) {
          return { success: false, error: "Organization created but no tenant id was returned" }
        }
        return { success: true, tenantId: Number(tenantId), organizationId }
      }

      // Name collision: append a fresh random suffix and try again.
      if (isNameTakenError(result.status, result.body) && attempt < MAX_ATTEMPTS) {
        name = `${input.name} ${randomSuffix()}`
        continue
      }

      console.error("[1health API] createTenant error:", result.status, result.body)
      return { success: false, error: `Failed to create organization: ${result.status}` }
    }

    return { success: false, error: "Could not find an available organization name" }
  } catch (error) {
    console.error("[1health API] createTenant exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// Step 2 — Switch the active tenant and persist the new scoped token
// ============================================================================

/** Persist an access token (and optional refresh token) to cookies. */
function persistTokens(accessToken: string, refreshTok: string | null, expiresIn: number): void {
  setCookie("access_token", accessToken, expiresIn)
  if (refreshTok) setCookie("refresh_token", refreshTok, expiresIn * 2)

  const now = Math.floor(Date.now() / 1000)
  setCookie("token_expires_at", String(now + expiresIn), expiresIn)
  setCookie("refresh_token_expires_at", String(now + expiresIn * 2), expiresIn * 2)
}

/** A JWT is three base64url segments separated by dots. */
function looksLikeJwt(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(v)
}

/** Recursively collect every string leaf with its dotted key path. */
function collectStrings(obj: unknown, path: string, out: Array<{ path: string; value: string }>): void {
  if (obj == null) return
  if (typeof obj === "string") {
    out.push({ path, value: obj })
    return
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      collectStrings(v, path ? `${path}.${k}` : k, out)
    }
  }
}

/**
 * Robustly extract the org-scoped access token (and refresh token, if any) from
 * the switch-tenant response body, regardless of the exact field names. We look
 * for a JWT-shaped string — preferring a key path that mentions "access"/"token"
 * — because the response schema has varied across 1health deployments.
 */
function extractTokensFromBody(data: unknown): {
  accessToken: string | null
  refreshToken: string | null
  accessTokenPath: string | null
} {
  const strings: Array<{ path: string; value: string }> = []
  collectStrings(data, "", strings)

  const jwts = strings.filter((s) => looksLikeJwt(s.value))
  // Prefer a JWT whose path clearly names the access token.
  const access =
    jwts.find((s) => /access/i.test(s.path)) ??
    jwts.find((s) => /token/i.test(s.path) && !/refresh/i.test(s.path)) ??
    jwts.find((s) => !/refresh/i.test(s.path)) ??
    jwts[0] ??
    null

  // A refresh token: a string keyed with "refresh" that isn't the access token.
  const refresh =
    strings.find((s) => /refresh/i.test(s.path) && s.value !== access?.value) ?? null

  return {
    accessToken: access?.value ?? null,
    refreshToken: refresh?.value ?? null,
    accessTokenPath: access?.path ?? null,
  }
}

/**
 * Switch the active tenant to the developer's newly-created org.
 *
 * IMPORTANT — cross-origin token delivery:
 * `GET /api/v2/user/switch-tenant/{id}` performs the switch server-side and, on
 * the real (same-origin) 1health SPA, hands back the new org-scoped tokens via a
 * Set-Cookie header on the 1health domain. This app is a *cross-origin* SPA, so
 * we can neither read that Set-Cookie nor (usually) a token in the body. Instead
 * we:
 *   1. Require only a 200 from the switch call.
 *   2. Opportunistically adopt a token if the DTO happens to return one.
 *   3. Otherwise mint a fresh token via the OAuth refresh grant — after the
 *      switch, the user's active-tenant context is the new org, so the refreshed
 *      token comes back scoped to it.
 *   4. Verify with `fetchMyself()` that `tenantContext.id === tenantId`, retrying
 *      the refresh once if the new context hasn't propagated yet.
 */
export async function switchTenant(tenantId: number): Promise<SwitchTenantResult> {
  try {
    const baseUrl = getOneHealthBaseUrl()
    // revokeToken=false keeps our current (launch/refresh) token valid so we can
    // still run the refresh grant below to obtain the org-scoped token.
    const url = `${baseUrl}/api/v2/user/switch-tenant/${tenantId}?revokeToken=false`

    const response = await authFetch(url, { method: "GET" })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[1health API] switchTenant error:", response.status, errorText)
      return { success: false, error: `Failed to switch organization: ${response.status}` }
    }

    // Step 2 — extract the org-scoped token from the response body. On real
    // 1health deployments the switch-tenant call returns the new token here; we
    // scan robustly for a JWT so we don't depend on exact field names. This is
    // the token bound to the NEW tenant — unlike the refresh grant, whose
    // refresh token is still bound to the original tenant.
    const rawBody = await response.text()
    let data: unknown = null
    try {
      data = rawBody ? JSON.parse(rawBody) : null
    } catch {
      data = null
    }

    const topKeys =
      data && typeof data === "object" ? Object.keys(data as Record<string, unknown>).join(",") : "(none)"
    const { accessToken: bodyToken, refreshToken: bodyRefresh, accessTokenPath } =
      extractTokensFromBody(data)

    const diag: string[] = []
    diag.push(`switch=${response.status}`)
    diag.push(`bodyLen=${rawBody.length}`)
    diag.push(`keys=[${topKeys}]`)
    diag.push(`tokenFound=${bodyToken ? `yes@${accessTokenPath}` : "no"}`)

    if (bodyToken) {
      // Best-effort expiry: look for an expires_in-like number anywhere shallow.
      const shallow = (data ?? {}) as Record<string, any>
      const expiresIn = Number(
        shallow.expires_in ?? shallow.expiresIn ?? shallow.token?.expires_in ?? 3600,
      )
      persistTokens(bodyToken, bodyRefresh, Number.isFinite(expiresIn) ? expiresIn : 3600)
    }

    // Steps 3 & 4 — verify the active tenant actually changed. Retry with a
    // short delay to allow the new context to propagate. Only fall back to the
    // refresh grant when the body gave us no token (it may re-issue an
    // original-tenant token, but it's better than nothing).
    const MAX_ATTEMPTS = 3
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (!bodyToken) {
        const refreshed = await refreshToken()
        diag.push(`a${attempt}:refresh=${refreshed}`)
        if (!refreshed) {
          return {
            success: false,
            error: "Could not obtain an org-scoped token after switching",
            debug: diag.join(" | "),
          }
        }
      }

      const me = await fetchMyself()
      const gotId = me.data?.tenantContext?.id
      diag.push(`a${attempt}:me=${me.success ? gotId : me.error}`)
      if (me.success && gotId === tenantId) {
        return { success: true }
      }

      // brief backoff before retrying (context propagation delay)
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 600))
    }

    return {
      success: false,
      error: `Switched organization, but the active tenant did not update (expected ${tenantId}). Please try again.`,
      debug: diag.join(" | "),
    }
  } catch (error) {
    console.error("[1health API] switchTenant exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// Step 3 — Issue the long-lived API key
// ============================================================================

export async function createApiToken(name: string): Promise<ApiTokenResult> {
  try {
    const baseUrl = getOneHealthBaseUrl()
    const url = `${baseUrl}/api/v2/token`

    // A token's value is only returned at creation and can never be read back.
    // So when a returning developer's vault already has a token with this name,
    // the platform responds 400 "already exists" and we cannot recover the old
    // value. Mirror createTenant(): retry with a unique suffixed name so the
    // developer always ends up with a fresh, viewable key instead of a dead end.
    const MAX_ATTEMPTS = 5
    let tokenName = name

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({ name: tokenName }),
      })

      if (response.ok) {
        const data = await response.json()
        const tokenValue = data?.token?.tokenValue ?? data?.tokenValue

        if (!tokenValue) {
          return { success: false, error: "API key created but no token value was returned" }
        }

        return {
          success: true,
          token: {
            id: data.id,
            name: data.name,
            tokenValue,
            createdAt: data.createdAt ?? data?.token?.issuedAt,
            expiresAt: data?.token?.expiresAt,
          },
        }
      }

      const errorText = await response.text()

      // Name collision: append a fresh random suffix and try again.
      if (isNameTakenError(response.status, errorText) && attempt < MAX_ATTEMPTS) {
        tokenName = `${name} ${randomSuffix()}`
        continue
      }

      console.error("[1health API] createApiToken error:", response.status, errorText)
      return { success: false, error: `Failed to create API key: ${response.status}` }
    }

    return { success: false, error: "Could not find an available API key name" }
  } catch (error) {
    console.error("[1health API] createApiToken exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
