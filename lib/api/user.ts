/**
 * Client-side User API
 *
 * Replaces: app/actions/user-actions.ts
 */

import { authFetch, getOneHealthBaseUrl, hasOneHealthSession } from "@/lib/auth-client"

/** A tenant/org the user already belongs to, as returned in `myself.tenants`. */
export interface UserTenant {
  id: number
  name: string
}

export interface UserInfo {
  id: number
  username: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
  tenantContext: { id: number; name: string }
  /**
   * Every tenant/org this user is a member of (the "Switch Context" set).
   * `myself` returns this inline, so onboarding can detect an existing Patient
   * Vault without a separate tenant-list call and avoid re-provisioning.
   */
  tenants: UserTenant[]
  systemAdministrator: boolean
}

export interface MyselfResult {
  success: boolean
  data?: UserInfo
  error?: string
}

export async function fetchMyself(): Promise<MyselfResult> {
  // No session yet (e.g. app opened outside 1health) — this is an expected
  // state that the UI handles with a "Session required" gate, so return
  // quietly instead of throwing/logging a runtime error.
  if (!hasOneHealthSession()) {
    return { success: false, error: "NO_SESSION" }
  }
  try {
    const baseUrl = getOneHealthBaseUrl()
    const url = `${baseUrl}/api/v2/user/myself`

    const response = await authFetch(url, { method: "GET" })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[1health API] fetchMyself error:", response.status, errorText)
      return { success: false, error: `Failed to fetch user info: ${response.status}` }
    }

    const data = await response.json()

    return {
      success: true,
      data: {
        id: data.id,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        roles: data.roles || [],
        tenantContext: data.tenantContext,
        tenants: Array.isArray(data.tenants)
          ? data.tenants
              .filter((t: unknown): t is UserTenant => {
                const rec = t as Record<string, unknown> | null
                return !!rec && typeof rec.id === "number" && typeof rec.name === "string"
              })
              .map((t: UserTenant) => ({ id: t.id, name: t.name }))
          : [],
        systemAdministrator: data.systemAdministrator || false,
      },
    }
  } catch (error) {
    console.error("[1health API] fetchMyself exception:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function isSystemAdmin(): Promise<boolean> {
  const result = await fetchMyself()
  if (!result.success || !result.data) return false
  return result.data.roles.includes("System Admin") || result.data.systemAdministrator
}
