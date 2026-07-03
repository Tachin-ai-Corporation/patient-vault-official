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

    // Step 2 — opportunistically adopt a token from the body if present. Most
    // deployments return no content here, so this is best-effort only.
    const data = await response.json().catch(() => null)
    const bodyToken =
      data?.access_token ?? data?.accessToken ?? data?.token?.access_token ?? data?.token?.tokenValue
    if (bodyToken) {
      const refreshTok = data?.refresh_token ?? data?.refreshToken ?? data?.token?.refresh_token ?? null
      const expiresIn = Number(data?.expires_in ?? data?.expiresIn ?? 3600)
      persistTokens(bodyToken, refreshTok, expiresIn)
    }

    // Steps 3 & 4 — mint an org-scoped token via the refresh grant, then verify
    // the active tenant actually changed. Retry the refresh once if needed.
    const MAX_ATTEMPTS = 2
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // On the first pass, only refresh if the body didn't already give us a
      // token; on subsequent passes always refresh to try to advance the context.
      if (attempt > 1 || !bodyToken) {
        const refreshed = await refreshToken()
        if (!refreshed && !bodyToken) {
          return { success: false, error: "Could not obtain an org-scoped token after switching" }
        }
      }

      const me = await fetchMyself()
      if (me.success && me.data?.tenantContext?.id === tenantId) {
        return { success: true }
      }
    }

    return {
      success: false,
      error: "Switched organization, but the active tenant did not update. Please try again.",
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

    const response = await authFetch(url, {
      method: "POST",
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[1health API] createApiToken error:", response.status, errorText)
      return { success: false, error: `Failed to create API key: ${response.status}` }
    }

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
  } catch (error) {
    console.error("[1health API] createApiToken exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
