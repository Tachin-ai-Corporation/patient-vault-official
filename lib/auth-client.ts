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
 * Sets a cookie with the given name, value, and maxAge (in seconds)
 */
export function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
}

/**
 * Deletes a cookie by setting its maxAge to 0
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; path=/; max-age=0`
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

/**
 * Fully logs the user out of THIS app. Await this before navigating away.
 *
 * Clearing happens in three layers because the session cookies may be written
 * scoped to the parent domain (`.1health.io`) and/or marked HttpOnly during the
 * 1health launch — neither of which client JS can remove:
 *
 *   1. SERVER: POST /api/logout, which expires every session cookie across the
 *      host-only AND parent-domain scopes (and can clear HttpOnly cookies). This
 *      is the layer that actually kills the stale `access_token` that was
 *      silently re-authenticating the user. We await it so the Set-Cookie
 *      response is applied before we navigate.
 *   2. CLIENT cookies: sweep readable (non-HttpOnly) cookies with path/domain
 *      variants as a fast, belt-and-suspenders clear.
 *   3. WEB STORAGE: clear local/session storage so nothing rehydrates identity.
 *
 * NOTE: this only clears THIS app's session. To also end the 1health *platform*
 * SSO session (which is what silently re-launches the app), the caller should
 * afterward navigate the browser to `getPlatformLogoutUrl()`.
 */
export async function signOut(): Promise<void> {
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

    for (const name of names) {
      for (const path of paths) {
        for (const domain of domains) {
          const domainPart = domain ? `; domain=${domain}` : ""
          document.cookie = `${name}=; path=${path}; max-age=0${domainPart}`
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

/**
 * Per-environment API host fallback used only if the `onehealth_base_url` cookie
 * is missing (e.g. it was already cleared). Mirrors ENV_URLS on the /auth page.
 */
const ENV_API_HOSTS: Record<"demo" | "prod", string> = {
  demo: "https://demo.1health.io",
  prod: "https://app.1health.io",
}

/**
 * Per-environment 1health web-app (SPA) host. This is the user-facing site the
 * platform login page lives on — distinct from the API host above.
 */
const ENV_WEB_HOSTS: Record<"demo" | "prod", string> = {
  demo: "https://1health.demo.1health.io",
  prod: "https://1health.app.1health.io",
}

function activeEnv(): "demo" | "prod" {
  return getCookie("onehealth_environment") === "prod" ? "prod" : "demo"
}

/**
 * Builds the 1health PLATFORM logout endpoint for the active environment.
 *
 * This ends the 1health SSO session (the session that silently re-launches this
 * app). It is meant to be called as a BACKGROUND request, not navigated to as a
 * top-level page: the endpoint 302-redirects to a hardcoded `/api/login?logout`
 * API route that returns 401 in the browser, so following the redirect shows an
 * ugly error page. Fire it in the background to expire the platform session
 * cookie (pv.1health.io and the API host are same-site under 1health.io, so the
 * cookie is sent), then send the user to `getPlatformLoginUrl()` yourself.
 *
 * Read BEFORE clearing cookies — depends on `onehealth_base_url` (falls back to
 * the env API host, then demo).
 */
export function getPlatformLogoutUrl(): string {
  const base = getCookie("onehealth_base_url") || ENV_API_HOSTS[activeEnv()]
  return `${base.replace(/\/$/, "")}/api/logout`
}

/**
 * The user-facing 1health login page for the active environment. This is where
 * to send the browser after firing the background platform logout — a real,
 * working page (HTTP 200), unlike the API `/api/login` route.
 */
export function getPlatformLoginUrl(): string {
  return `${ENV_WEB_HOSTS[activeEnv()]}/login`
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
 *   1. Attaches the Bearer token from cookies
 *   2. Logs request/response to browser console
 *   3. Intercepts 401 Unauthorized responses
 *   4. Attempts to refresh the token
 *   5. Retries the original request with the new token
 *   6. Throws SessionExpiredError if refresh fails
 *
 * @param url - The 1health API endpoint URL (use getOneHealthBaseUrl() to build it)
 * @param options - Standard fetch options (method, body, headers, etc.)
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
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let accessToken = getAccessToken()

  // No access token - try to refresh first
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

  // Build headers with Authorization
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)

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

  // Log request
  logApiCall("request", {
    url,
    method,
    headers: headersObj,
    body: logBody as string | undefined,
  })

  const startTime = Date.now()

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  })

  const duration = Date.now() - startTime

  // Clone response to read body for logging without consuming it
  const responseClone = response.clone()
  let responseBody: string
  try {
    responseBody = await responseClone.text()
  } catch {
    responseBody = "[Unable to read response body]"
  }

  // Log response
  logApiCall("response", {
    url,
    method,
    headers: headersObj,
    status: response.status,
    statusText: response.statusText,
    responseBody,
    duration,
  })

  // Publish to the in-app API Inspector — but only when this is the final
  // outcome. A 401 here is followed by a token refresh + retry below; we record
  // the retry's result instead so the inspector shows the effective call.
  if (response.status !== 401) {
    publishInspectorCall(url, method, options.body, response.status, responseBody, duration)
  }

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401) {
    console.log("[auth-client] Received 401, attempting token refresh...")
    const refreshed = await refreshToken()

    if (!refreshed) {
      throw new SessionExpiredError()
    }

    // Get the new token and retry
    const newAccessToken = getAccessToken()
    if (!newAccessToken) {
      throw new SessionExpiredError()
    }

    headers.set("Authorization", `Bearer ${newAccessToken}`)

    console.log("[auth-client] Retrying request with new token...")

    const retryHeaders = Object.fromEntries(headers.entries())

    logApiCall("request", {
      url,
      method,
      headers: retryHeaders,
      body: logBody as string | undefined,
    })

    const retryStartTime = Date.now()

    const retryResponse = await fetch(url, {
      ...options,
      headers,
    })

    const retryDuration = Date.now() - retryStartTime

    // Log retry response
    const retryClone = retryResponse.clone()
    let retryBody: string
    try {
      retryBody = await retryClone.text()
    } catch {
      retryBody = "[Unable to read response body]"
    }

    logApiCall("response", {
      url,
      method,
      headers: retryHeaders,
      status: retryResponse.status,
      statusText: retryResponse.statusText,
      responseBody: retryBody,
      duration: retryDuration,
    })

    publishInspectorCall(url, method, options.body, retryResponse.status, retryBody, retryDuration)

    return retryResponse
  }

  return response
}
