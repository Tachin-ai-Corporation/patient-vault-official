/**
 * =============================================================================
 * 1HEALTH AUTHENTICATION SERVICE (CLIENT-SIDE)
 * =============================================================================
 *
 * This module provides client-side authentication utilities for all 1health API
 * requests. It handles:
 *   - Token retrieval from cookies
 *   - Automatic token refresh on 401 responses
 *   - Direct communication with 1health (no server round-trip)
 *   - Debug logging to browser console
 *
 * IMPORTANT: This file is for CLIENT components only. It reads cookies from
 * document.cookie and makes fetch requests directly to 1health.
 *
 * =============================================================================
 * USAGE INSTRUCTIONS
 * =============================================================================
 *
 * When making ANY request to the 1health API from client components, use
 * `authFetch` instead of the native `fetch`. This ensures proper token
 * management and automatic refresh handling.
 *
 * EXAMPLE - Client Component:
 * \`\`\`typescript
 * "use client"
 * import { authFetch, getOneHealthBaseUrl } from "@/lib/auth-client"
 *
 * async function searchPatients(firstName: string) {
 *   const baseUrl = getOneHealthBaseUrl()
 *   const response = await authFetch(`${baseUrl}/api/v2/query`, {
 *     method: "POST",
 *     body: JSON.stringify({ key: "Patient", ... })
 *   })
 *   return response.json()
 * }
 * \`\`\`
 *
 * =============================================================================
 */

"use client"

import { recordApiCall, type BusApiMethod } from "@/lib/api-inspector-bus"

// ============================================================================
// COOKIE UTILITIES
// ============================================================================

/**
 * Gets a cookie value by name from document.cookie
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Returns true when the page is running in a secure context (HTTPS), which is a
 * hard requirement for `SameSite=None` — browsers reject `None` without `Secure`.
 * `localhost` is treated as secure by modern browsers, so local dev still gets
 * the cross-site path and stays iframe-testable.
 */
function isSecureContext(): boolean {
  if (typeof window === "undefined") return false
  return window.location.protocol === "https:" || window.location.hostname === "localhost"
}

/**
 * The cookie attribute string shared by every session cookie written from the
 * client. Single source of truth so the auth page and token refresh can't drift.
 *
 * On HTTPS we emit `SameSite=None; Secure; Partitioned` so the cookie is sent
 * when Patient Vault is embedded in a cross-site iframe. `Partitioned` opts into
 * CHIPS, giving the embed its own cookie jar keyed to the top-level site — which
 * is what keeps `SameSite=None` acceptable to browsers phasing out third-party
 * cookies. On plain HTTP (non-localhost dev) `None` would be dropped, so we fall
 * back to `Lax` to keep local development working.
 */
export function cookieAttributes(): string {
  return isSecureContext() ? "; SameSite=None; Secure; Partitioned" : "; SameSite=Lax"
}

/**
 * Sets a cookie with the given name, value, and maxAge (in seconds)
 */
export function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}${cookieAttributes()}`
}

/**
 * Deletes a cookie by setting its maxAge to 0.
 *
 * A partitioned (CHIPS) cookie lives in a separate jar from an unpartitioned one,
 * and an expiry only matches a cookie with the same partition attribute — so we
 * emit both forms to guarantee removal regardless of how the cookie was written.
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; path=/; max-age=0`
  if (isSecureContext()) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=None; Secure; Partitioned`
  }
}

/**
 * All cookies written during the 1health launch/auth flow. Kept in one place so
 * sign-out can fully clear the session.
 */
const SESSION_COOKIES = [
  "access_token",
  "refresh_token",
  "token_expires_at",
  "refresh_token_expires_at",
  "onehealth_base_url",
  "onehealth_environment",
  "user_org_id",
  "user_id",
] as const

/** True if the access token is missing or past (or within 30s of) its expiry. */
function accessTokenLooksExpired(): boolean {
  if (!getAccessToken()) return true
  const at = getCookie("token_expires_at")
  if (!at) return false // no timestamp -> assume usable; let the call decide
  const expiresAt = Number.parseInt(at, 10)
  if (Number.isNaN(expiresAt)) return false
  return Math.floor(Date.now() / 1000) >= expiresAt - 30
}

/**
 * Best-effort call to the 1health platform logout endpoint, which invalidates
 * the server-side session/token. Never throws — logout must always proceed to
 * local teardown regardless of the outcome.
 *
 * The endpoint is `POST {OAUTH_ROOT}/auth/user/logout` with a Bearer access
 * token and credentials included (so platform cookies are sent). OAUTH_ROOT is
 * the base URL with a trailing `/api` stripped — the same convention
 * `refreshToken()` uses for `/auth/oauth2/token`.
 */
async function platformLogout(): Promise<void> {
  try {
    // Refresh once if the access token is (near) expired, so the Bearer we send
    // is valid and the server-side invalidation actually lands.
    if (accessTokenLooksExpired() && getRefreshToken()) {
      await refreshToken()
    }
    const token = getAccessToken()
    if (!token) return // nothing to invalidate

    const root = getOneHealthBaseUrl().replace(/\/api\/?$/, "")
    const res = await fetch(`${root}/auth/user/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include", // spec: withCredentials -> send platform cookies
      cache: "no-store",
    })
    console.log("[v0] platformLogout:", res.status)
  } catch (e) {
    // CORS block / network error / missing base URL — fall through to teardown.
    console.log("[v0] platformLogout failed (continuing):", (e as Error)?.message)
  }
}

/**
 * Fully logs the user out. Await this before navigating away.
 *
 * Step 0 invalidates the server-side platform session; the remaining layers tear
 * down local state. Clearing happens in layers because the session cookies may
 * be written scoped to the parent domain (`.1health.io`) and/or marked HttpOnly
 * during the 1health launch — neither of which client JS can remove:
 *
 *   0. PLATFORM: POST {OAUTH_ROOT}/auth/user/logout (Bearer + credentials) to
 *      invalidate the server-side token/session. Done FIRST, while we still hold
 *      a valid access token. Best-effort: never blocks the teardown below.
 *   1. SERVER: POST /api/logout, which expires every session cookie across the
 *      host-only AND parent-domain scopes (and can clear HttpOnly cookies). We
 *      await it so the Set-Cookie response is applied before we navigate.
 *   2. CLIENT cookies: sweep readable (non-HttpOnly) cookies with path/domain
 *      variants as a fast, belt-and-suspenders clear.
 *   3. WEB STORAGE: clear local/session storage so nothing rehydrates identity.
 *
 * NOTE: this ends THIS app's session (token + cookies + storage). The broader
 * 1health platform SSO session lives on the sibling host
 * `1health.<env>.1health.io` and cannot be cleared from here; ending it requires
 * navigating the browser to that host's own logout page (endpoint TBD).
 */
export async function signOut(): Promise<void> {
  // 0. Invalidate the server-side platform session while we still hold a token.
  await platformLogout()

  // 1. Authoritative server-side clear (handles parent-domain + HttpOnly).
  try {
    await fetch("/api/logout", { method: "POST", credentials: "include", cache: "no-store" })
  } catch {
    // Network failure shouldn't block the local clear + redirect below.
  }

  // 2. Client-side cookie sweep (known cookies + any other readable ones).
  if (typeof document !== "undefined") {
    const host = window.location.hostname
    const labels = host.split(".")
    const domains = [undefined, host, `.${host}`]
    // Add every parent-domain scope (e.g. `.1health.io`) so a broadly-scoped
    // cookie is also targeted.
    for (let i = 1; i < labels.length - 1; i++) {
      domains.push("." + labels.slice(i).join("."))
    }
    const paths = ["/", window.location.pathname]

    const names = new Set<string>(SESSION_COOKIES as readonly string[])
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim()
      if (name) names.add(name)
    }

    // Partitioned (CHIPS) cookies occupy a different jar than unpartitioned ones,
    // and an expiry only matches the same partition attribute — so clear both.
    const partitionVariants = isSecureContext()
      ? ["", "; SameSite=None; Secure; Partitioned"]
      : [""]

    for (const name of names) {
      for (const path of paths) {
        for (const domain of domains) {
          const domainPart = domain ? `; domain=${domain}` : ""
          for (const partition of partitionVariants) {
            document.cookie = `${name}=; path=${path}; max-age=0${domainPart}${partition}`
          }
        }
      }
    }
  }

  // 3. Clear web storage so nothing can rehydrate the old session.
  try {
    window.localStorage?.clear()
    window.sessionStorage?.clear()
  } catch {
    // Storage may be unavailable (private mode / SSR) — safe to ignore.
  }
}

// ============================================================================
// TOKEN ACCESSORS
// ============================================================================

/**
 * Gets the current access token from cookies
 */
export function getAccessToken(): string | null {
  return getCookie("access_token")
}

/**
 * Gets the current refresh token from cookies
 */
export function getRefreshToken(): string | null {
  return getCookie("refresh_token")
}

/**
 * Gets the 1health base URL from cookies.
 * The URL is set per-environment (demo/prod) during authentication.
 */
export function getOneHealthBaseUrl(): string {
  const cookieUrl = getCookie("onehealth_base_url")
  if (cookieUrl) return cookieUrl

  throw new Error("No 1health base URL available. User must authenticate via /auth first.")
}

/**
 * Returns true when a 1health session base URL is present. Use this to detect
 * the "not authenticated yet" state without triggering the thrown error above,
 * so unauthenticated loads stay quiet instead of surfacing as runtime errors.
 */
export function hasOneHealthSession(): boolean {
  return getCookie("onehealth_base_url") !== null
}

/**
 * Gets the user's organization ID from cookies
 */
export function getOrganizationId(): number | null {
  const orgIdCookie = getCookie("user_org_id")
  if (!orgIdCookie) return null
  const orgId = Number.parseInt(orgIdCookie, 10)
  return Number.isNaN(orgId) ? null : orgId
}

/**
 * Gets the current user ID from cookies
 */
export function getUserId(): number | null {
  const userIdCookie = getCookie("user_id")
  if (!userIdCookie) return null
  const userId = Number.parseInt(userIdCookie, 10)
  return Number.isNaN(userId) ? null : userId
}

// ============================================================================
// RESTRICTED API KEY (role-scoped Patient Vault key)
// ============================================================================

/**
 * The Patient Vault app must NOT act with the broad login (OAuth) token that
 * 1health issues at launch — that token can reach every 1health API. Instead,
 * onboarding mints a role-scoped API key (restricted to the "Patient Vault"
 * access-control role) and the app sends THAT key as the Bearer for all
 * data-plane calls. This limits the app to the Patient Vault endpoints plus the
 * handful the role explicitly allows (myself, grid/patient, sys-config).
 *
 * The generated key is a static value that can only be read once at creation,
 * so we hold it in sessionStorage (per browser session / launch, matching the
 * "mint a fresh key each session" policy) rather than a cookie. It is scoped to
 * a specific tenant because access-control role IDs are tenant-specific, so we
 * store the tenant id alongside it and only trust the key for that tenant.
 */
const RESTRICTED_KEY_STORAGE = "pv_restricted_api_key"
const RESTRICTED_KEY_TENANT_STORAGE = "pv_restricted_api_key_tenant"

/** The current session's role-scoped API key, or null if none minted yet. */
export function getRestrictedApiKey(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(RESTRICTED_KEY_STORAGE)
  } catch {
    return null
  }
}

/** The tenant id the stored restricted key is scoped to, or null. */
export function getRestrictedApiKeyTenant(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(RESTRICTED_KEY_TENANT_STORAGE)
    if (!raw) return null
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) ? null : n
  } catch {
    return null
  }
}

/** Persist the role-scoped key for this session, bound to its tenant. */
export function setRestrictedApiKey(value: string, tenantId: number): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(RESTRICTED_KEY_STORAGE, value)
    window.sessionStorage.setItem(RESTRICTED_KEY_TENANT_STORAGE, String(tenantId))
  } catch {
    // sessionStorage may be unavailable (private mode / SSR). The app will fall
    // back to the login token for data calls, which still works — it just isn't
    // scoped down. Never throw from here.
  }
}

/** Drop the stored restricted key (e.g. on sign-out). */
export function clearRestrictedApiKey(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(RESTRICTED_KEY_STORAGE)
    window.sessionStorage.removeItem(RESTRICTED_KEY_TENANT_STORAGE)
  } catch {
    /* ignore */
  }
}

// ============================================================================
// DEBUG LOGGING
// ============================================================================

interface ApiDebugInfo {
  url: string
  method: string
  headers: Record<string, string>
  body?: string | object
  status?: number
  statusText?: string
  responseBody?: string
  duration?: number
}

/**
 * Formats and logs API request/response to console
 * Headers and body are logged as formatted JSON strings for easy copying
 */
function logApiCall(type: "request" | "response", info: ApiDebugInfo): void {
  const timestamp = new Date().toLocaleTimeString()

  const headersStr = JSON.stringify(info.headers, null, 2)

  let bodyStr: string | undefined
  if (info.body) {
    try {
      const parsed = typeof info.body === "string" ? JSON.parse(info.body) : info.body
      bodyStr = JSON.stringify(parsed, null, 2)
    } catch {
      bodyStr = String(info.body)
    }
  }

  if (type === "request") {
    console.groupCollapsed(
      `%c[1health API] %c[${timestamp}] %c${info.method} %c${info.url}`,
      "color: #888",
      "color: #666",
      "color: #4CAF50; font-weight: bold",
      "color: #2196F3",
    )
    console.log("Headers:\n" + headersStr)
    if (bodyStr) {
      console.log("Body:\n" + bodyStr)
    }
    console.groupEnd()
  } else {
    const statusColor = info.status && info.status >= 200 && info.status < 300 ? "#4CAF50" : "#f44336"
    console.groupCollapsed(
      `%c[1health API] %c[${timestamp}] %c${info.method} %c${info.url} %c${info.status} %c(${info.duration}ms)`,
      "color: #888",
      "color: #666",
      "color: #4CAF50; font-weight: bold",
      "color: #2196F3",
      `color: ${statusColor}; font-weight: bold`,
      "color: #888",
    )
    console.log("Status:", info.status, info.statusText)
    console.log("Duration:", `${info.duration}ms`)
    console.log("Headers:\n" + headersStr)
    if (info.responseBody) {
      let responseStr: string
      try {
        const parsed = JSON.parse(info.responseBody)
        responseStr = JSON.stringify(parsed, null, 2)
      } catch {
        responseStr = info.responseBody
      }
      console.log("Response:\n" + responseStr)
    }
    console.groupEnd()
  }
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Refreshes the access token using the refresh token.
 * Makes a direct call to 1health OAuth endpoint.
 * Returns true if successful, false if refresh failed.
 */
export async function refreshToken(): Promise<boolean> {
  // Prevent concurrent refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    const currentRefreshToken = getRefreshToken()

    if (!currentRefreshToken) {
      console.error("[auth-client] No refresh token available")
      isRefreshing = false
      return false
    }

    let baseUrl: string
    try {
      baseUrl = getOneHealthBaseUrl()
    } catch {
      console.error("[auth-client] No 1health base URL available")
      isRefreshing = false
      return false
    }

    // Remove trailing /api or /api/ - OAuth endpoint is at root
    baseUrl = baseUrl.replace(/\/api\/?$/, "")
    const tokenUrl = `${baseUrl}/auth/oauth2/token`
    const requestBody = `grant_type=refresh_token&refresh_token=${encodeURIComponent(currentRefreshToken)}&client_id=public-client`

    const debugInfo: ApiDebugInfo = {
      url: tokenUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: requestBody,
    }

    logApiCall("request", debugInfo)

    const startTime = Date.now()

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: requestBody,
      })

      const duration = Date.now() - startTime
      const responseText = await response.text()

      logApiCall("response", {
        ...debugInfo,
        status: response.status,
        statusText: response.statusText,
        responseBody: responseText,
        duration,
      })

      if (!response.ok) {
        console.error("[auth-client] Token refresh failed:", response.status, responseText)
        isRefreshing = false
        return false
      }

      const data = JSON.parse(responseText)
      const accessTokenMaxAge = data.expires_in || 3600
      const refreshTokenMaxAge = accessTokenMaxAge * 2

      // Update cookies with new tokens
      setCookie("access_token", data.access_token, accessTokenMaxAge)
      if (data.refresh_token) {
        setCookie("refresh_token", data.refresh_token, refreshTokenMaxAge)
      }

      // Set expiration timestamps
      const tokenExpiresAt = Math.floor(Date.now() / 1000) + accessTokenMaxAge
      const refreshTokenExpiresAt = Math.floor(Date.now() / 1000) + refreshTokenMaxAge
      setCookie("token_expires_at", tokenExpiresAt.toString(), accessTokenMaxAge)
      setCookie("refresh_token_expires_at", refreshTokenExpiresAt.toString(), refreshTokenMaxAge)

      console.log("[auth-client] Token refreshed successfully")
      isRefreshing = false
      return true
    } catch (error) {
      console.error("[auth-client] Token refresh error:", error)
      isRefreshing = false
      return false
    }
  })()

  return refreshPromise
}

// ============================================================================
// AUTHENTICATED FETCH
// ============================================================================

export class SessionExpiredError extends Error {
  constructor() {
    super("SESSION_EXPIRED")
    this.name = "SessionExpiredError"
  }
}

/**
 * Publish a completed round-trip to the API Inspector bus so the in-app
 * inspector can render it as a live call. Best-effort: any failure here must
 * never break the actual request, so it is fully guarded.
 *
 * Bodies are parsed to JSON when possible (falling back to the raw string), and
 * FormData bodies are summarized rather than serialized. Only calls made
 * through authFetch (the PV API surface) are published — the OAuth token
 * refresh is deliberately NOT recorded, since its body carries the refresh
 * token.
 */
function publishInspectorCall(
  url: string,
  method: string,
  requestBody: BodyInit | null | undefined,
  status: number,
  responseText: string,
  latencyMs: number,
): void {
  try {
    let path: string
    try {
      const u = new URL(url)
      path = u.pathname + u.search
    } catch {
      path = url
    }

    let reqBody: unknown = undefined
    if (requestBody instanceof FormData) {
      reqBody = `[FormData with ${Array.from(requestBody.keys()).length} field(s)]`
    } else if (typeof requestBody === "string") {
      try {
        reqBody = JSON.parse(requestBody)
      } catch {
        reqBody = requestBody
      }
    } else if (requestBody != null) {
      reqBody = requestBody
    }

    let resBody: unknown = responseText
    try {
      resBody = JSON.parse(responseText)
    } catch {
      // Leave as the raw string when the response isn't JSON.
    }

    recordApiCall({
      method: method.toUpperCase() as BusApiMethod,
      path,
      requestBody: reqBody,
      status,
      responseBody: resBody,
      latencyMs,
    })
  } catch {
    // Never let inspector recording affect the request path.
  }
}

/**
 * =============================================================================
 * authFetch - CLIENT-SIDE AUTHENTICATED FETCH
 * =============================================================================
 *
 * Use this function for ALL 1health API requests from client components.
 * It automatically:
 *   1. Chooses the Bearer token: the role-scoped restricted key by default, or
 *      the broad login (OAuth) token when { useLoginToken: true } is passed for
 *      setup/admin calls (switch-tenant, list roles, generate token).
 *   2. Logs request/response to browser console.
 *   3. For the login token only: intercepts 401s, refreshes, and retries once.
 *      Restricted-key 401/403s are returned as-is so authorization errors from
 *      out-of-scope endpoints surface instead of escalating to the login token.
 *   4. Throws SessionExpiredError if a login-token refresh fails.
 *
 * @param url - The 1health API endpoint URL (use getOneHealthBaseUrl() to build it)
 * @param options - Standard fetch options (method, body, headers, etc.)
 * @param authOptions - Token selection ({ useLoginToken } for setup/admin calls)
 * @returns Promise<Response> - The fetch response
 * @throws SessionExpiredError if token refresh fails
 *
 * @example
 * const baseUrl = getOneHealthBaseUrl()
 * const response = await authFetch(`${baseUrl}/api/v2/query`, {
 *   method: "POST",
 *   body: JSON.stringify({ key: "Patient", attributes: ["id", "name"] })
 * })
 * const data = await response.json()
 */
export interface AuthFetchOptions {
  /**
   * Force the broad 1health login (OAuth) token as the Bearer, bypassing the
   * role-scoped restricted key. This is required for the setup/admin calls the
   * restricted key is intentionally NOT allowed to make — switching tenants,
   * listing access-control roles, and generating the token itself. Every
   * data-plane call omits this and gets the restricted key.
   */
  useLoginToken?: boolean
}

/**
 * Perform a single authenticated request with the given Bearer token, logging
 * the request/response to the console (and returning the read body so the
 * caller can publish it to the API Inspector). Never retries — retry/refresh
 * policy is decided by authFetch, which differs by token type.
 */
async function performFetch(
  url: string,
  options: RequestInit,
  bearer: string,
): Promise<{ response: Response; responseBody: string; duration: number; method: string }> {
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${bearer}`)

  // FormData requires the browser to set Content-Type with boundary
  const isFormData = options.body instanceof FormData
  if (options.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json")
  }

  const method = options.method || "GET"
  const headersObj = Object.fromEntries(headers.entries())

  const logBody = isFormData
    ? `[FormData with ${Array.from((options.body as FormData).keys()).length} field(s)]`
    : options.body

  logApiCall("request", { url, method, headers: headersObj, body: logBody as string | undefined })

  const startTime = Date.now()
  const response = await fetch(url, { ...options, headers })
  const duration = Date.now() - startTime

  // Clone response to read body for logging without consuming it
  const responseClone = response.clone()
  let responseBody: string
  try {
    responseBody = await responseClone.text()
  } catch {
    responseBody = "[Unable to read response body]"
  }

  logApiCall("response", {
    url,
    method,
    headers: headersObj,
    status: response.status,
    statusText: response.statusText,
    responseBody,
    duration,
  })

  return { response, responseBody, duration, method }
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
  authOptions: AuthFetchOptions = {},
): Promise<Response> {
  // Default: send the role-scoped restricted key for data-plane calls. Only the
  // explicit setup/admin calls opt into the broad login token.
  const restrictedKey = authOptions.useLoginToken ? null : getRestrictedApiKey()

  if (restrictedKey) {
    // Restricted-key path. This key is a static, role-scoped credential — NOT an
    // OAuth token — so refreshing the OAuth session would not change it. A
    // 401/403 here means the endpoint is outside the Patient Vault role's
    // allow-list (or the key is invalid); we surface that authorization error to
    // the caller rather than silently escalating to the broad login token, which
    // is the entire point of scoping the key down.
    const { response, responseBody, duration, method } = await performFetch(url, options, restrictedKey)
    publishInspectorCall(url, method, options.body, response.status, responseBody, duration)
    return response
  }

  // Login-token path (setup/admin calls, or before a restricted key exists).
  // Keeps the original refresh-on-401 + single retry behavior.
  let accessToken = getAccessToken()
  if (!accessToken) {
    const refreshed = await refreshToken()
    if (!refreshed) {
      throw new SessionExpiredError()
    }
    accessToken = getAccessToken()
    if (!accessToken) {
      throw new SessionExpiredError()
    }
  }

  const first = await performFetch(url, options, accessToken)

  // Publish now unless a 401 refresh + retry is about to supersede this result.
  if (first.response.status !== 401) {
    publishInspectorCall(url, first.method, options.body, first.response.status, first.responseBody, first.duration)
    return first.response
  }

  console.log("[auth-client] Received 401, attempting token refresh...")
  const refreshed = await refreshToken()
  if (!refreshed) {
    throw new SessionExpiredError()
  }

  const newAccessToken = getAccessToken()
  if (!newAccessToken) {
    throw new SessionExpiredError()
  }

  console.log("[auth-client] Retrying request with new token...")
  const retry = await performFetch(url, options, newAccessToken)
  publishInspectorCall(url, retry.method, options.body, retry.response.status, retry.responseBody, retry.duration)
  return retry.response
}
