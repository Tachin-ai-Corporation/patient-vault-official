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

import { authFetch, getOneHealthBaseUrl, setCookie } from "@/lib/auth-client"

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

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  try {
    const baseUrl = getOneHealthBaseUrl()
    const url = `${baseUrl}/api/v2/tenant`

    const dto = {
      name: input.name,
      organizationNpiId: null,
      primaryCorporateEmail: input.primaryCorporateEmail,
      shortOrganizationName: input.name,
      types: ["Health Provider", "Go To Market"],
      headquartersAddress: {
        ...DEFAULT_HQ_ADDRESS,
        name: `${input.name}-(${uuid()})`,
      },
    }

    // multipart/form-data with a single "dto" JSON part. authFetch detects the
    // FormData body and lets the browser set the multipart boundary itself.
    const form = new FormData()
    form.append("dto", JSON.stringify(dto))

    const response = await authFetch(url, { method: "POST", body: form })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[1health API] createTenant error:", response.status, errorText)
      return { success: false, error: `Failed to create organization: ${response.status}` }
    }

    const data = await response.json()
    // Response shape: { tenant: { id, name }, organization: { id, name } }.
    // Fall back through a couple of shapes defensively.
    const tenantId = data?.tenant?.id ?? data?.tenantId ?? data?.id
    const organizationId = data?.organization?.id ?? data?.organizationId

    if (!tenantId) {
      return { success: false, error: "Organization created but no tenant id was returned" }
    }

    return { success: true, tenantId: Number(tenantId), organizationId }
  } catch (error) {
    console.error("[1health API] createTenant exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ============================================================================
// Step 2 — Switch the active tenant and persist the new scoped token
// ============================================================================

export async function switchTenant(tenantId: number): Promise<SwitchTenantResult> {
  try {
    const baseUrl = getOneHealthBaseUrl()
    // revokeToken=false keeps the launch token valid as a safety net while we
    // adopt the new, org-scoped token returned below.
    const url = `${baseUrl}/api/v2/user/switch-tenant/${tenantId}?revokeToken=false`

    const response = await authFetch(url, { method: "GET" })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[1health API] switchTenant error:", response.status, errorText)
      return { success: false, error: `Failed to switch organization: ${response.status}` }
    }

    const data = await response.json().catch(() => null)

    // The response DTO carries a new access token scoped to the target tenant.
    // Field naming varies, so read defensively.
    const accessToken =
      data?.access_token ?? data?.accessToken ?? data?.token?.access_token ?? data?.token?.tokenValue
    const refreshTok = data?.refresh_token ?? data?.refreshToken ?? data?.token?.refresh_token
    const expiresIn = Number(data?.expires_in ?? data?.expiresIn ?? 3600)

    if (!accessToken) {
      return {
        success: false,
        error: "Switched organization but no access token was returned",
      }
    }

    // Persist the new token so every subsequent authFetch is org-scoped, and
    // so a page refresh keeps the developer in their new org.
    setCookie("access_token", accessToken, expiresIn)
    if (refreshTok) setCookie("refresh_token", refreshTok, expiresIn * 2)

    const now = Math.floor(Date.now() / 1000)
    setCookie("token_expires_at", String(now + expiresIn), expiresIn)
    setCookie("refresh_token_expires_at", String(now + expiresIn * 2), expiresIn * 2)

    return { success: true }
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
