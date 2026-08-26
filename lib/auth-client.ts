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
import { saveLoginIntent } from "@/lib/login-intent"
import {
  ENVIRONMENT_CONFIG,
  SESSION_ENVIRONMENTS,
  SESSION_FIELDS,
  connectedBaseUrlFor,
  connectedSessionEnvironment,
  sessionEnvironmentFromBaseUrl,
  sessionCookieName,
  sessionIsUnexpired,
  type SessionEnvironment,
} from "@/lib/session-environments"

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
const LEGACY_SESSION_COOKIES = [
  "access_token",
  "refresh_token",
  "token_expires_at",
  "refresh_token_expires_at",
  "onehealth_base_url",
  "onehealth_environment",
  "user_org_id",
  "user_id",
] as const
const SESSION_COOKIES = [
  "active_environment",
  ...LEGACY_SESSION_COOKIES,
  ...SESSION_ENVIRONMENTS.flatMap((env) => SESSION_FIELDS.map((field) => sessionCookieName(env, field))),
] as const

function getConnectedBaseUrl(env: SessionEnvironment): string | null {
  return connectedBaseUrlFor(env, getCookie)
}

export function getActiveEnvironment(): SessionEnvironment {
  const connected = getConnectedSessionEnvironment()
  if (connected) return connected
  throw new Error("The 1health environment is still resolving because no connected base URL is available.")
}

export function getConnectedSessionEnvironment(): SessionEnvironment | null {
  return connectedSessionEnvironment(getCookie)
}

export function setActiveEnvironment(env: SessionEnvironment): boolean {
  if (!hasEnvironmentSession(env)) return false
  const baseUrl = getConnectedBaseUrl(env)
  if (!baseUrl) return false
  setCookie("active_environment", env, 60 * 60 * 24 * 30)
  setCookie("onehealth_base_url", baseUrl, 60 * 60 * 24 * 30)
  return true
}

export function hasEnvironmentSession(env: SessionEnvironment): boolean {
  return sessionIsUnexpired(env, getCookie)
}

/**
 * Migrate the old single cookie set once its launch base URL resolves the real
 * environment. A token without that URL remains in the resolving state.
 */
export function migrateLegacySession(): SessionEnvironment | null {
  const legacyToken = getCookie("access_token")
  if (!legacyToken) return getConnectedSessionEnvironment()

  const legacyEnv = sessionEnvironmentFromBaseUrl(getCookie("onehealth_base_url"))
  if (!legacyEnv) return null

  if (!getCookie(sessionCookieName(legacyEnv, "access_token"))) {
    for (const field of SESSION_FIELDS) {
      const legacyName = field === "base_url" ? "onehealth_base_url" : field
      const value = getCookie(legacyName)
      if (value) setCookie(sessionCookieName(legacyEnv, field), value, 60 * 60 * 24 * 30)
    }
  }
  setCookie("active_environment", legacyEnv, 60 * 60 * 24 * 30)
  for (const name of LEGACY_SESSION_COOKIES) deleteCookie(name)
  return legacyEnv
}

/**
 * Fully logs the user out. Await this before navigating away.
 *
 * Step 0 invalidates the server-side platform session; the remaining layers tear
 * down local state. Clearing happens in layers because the session cookies may
 * be written scoped to the parent domain (`.1health.io`) and/or marked HttpOnly
 * during the 1health launch — neither of which client JS can remove:
 *
 *   1. SERVER: POST /api/logout, which calls the platform global-logout endpoint
 *      for each environment and expires every session cookie across host-only and
 *      parent-domain scopes (including HttpOnly cookies). We await it so the
 *      Set-Cookie response is applied before navigating.
 *   2. CLIENT cookies: sweep readable (non-HttpOnly) cookies with path/domain
 *      variants as a fast, belt-and-suspenders clear.
 *   3. WEB STORAGE: clear local/session storage so nothing rehydrates identity.
 *
 * The server route uses BO Core's global logout operation, so the platform
 * invalidates all device sessions before this app clears its local state.
 */
export async function signOut(): Promise<void> {
  // 1. Authoritative server-side platform logout and cookie clear. Keeping the
  // platform request in /api/logout avoids a duplicate invalidation race and
  // works even when access-token cookies are HttpOnly.
  try {
    await fetch("/api/logout", { method: "POST", credentials: "include", cache: "no-store" })
  } catch {
    // Network failure must not prevent browser-owned session state cleanup.
  } finally {
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

    // 4. Clear persistent, origin-scoped stores that cookies + web storage do
    // NOT cover: IndexedDB, the Cache Storage API, and service workers. On demo
    // the hosted 1health login SPA is served from this same origin and persists
    // its session there (axios-based SPAs commonly keep tokens in IndexedDB), so
    // a stale token survived sign-out and let the login page bootstrap an
    // already-dead session (external-application 401 → logout 401 → oauth2/token
    // 400 → "Something went wrong"), only recovering on a manual reload. Awaited
    // so it finishes before the caller navigates away.
    await clearPersistentOriginStorage()
  }
}

/**
 * Best-effort teardown of the persistent, origin-scoped browser stores that a
 * cookie/web-storage clear leaves behind. Every step is guarded and the whole
 * thing is awaited via `Promise.allSettled`, so a single unsupported API or
 * blocked handle can never hang or fail the logout flow.
 */
async function clearPersistentOriginStorage(): Promise<void> {
  if (typeof window === "undefined") return

  const tasks: Promise<unknown>[] = []

  // IndexedDB — where axios/localforage SPAs commonly persist auth/session state.
  try {
    const factory = window.indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>
    }
    if (factory?.databases) {
      const databases = await factory.databases()
      for (const { name } of databases) {
        if (!name) continue
        tasks.push(
          new Promise<void>((resolve) => {
            const request = window.indexedDB.deleteDatabase(name)
            // Resolve on every terminal state — including `blocked`, which fires
            // when another tab holds the DB open — so logout never stalls.
            request.onsuccess = request.onerror = request.onblocked = () => resolve()
          }),
        )
      }
    }
  } catch {
    // indexedDB.databases() is unsupported in some browsers — safe to ignore.
  }

  // Cache Storage API — service-worker / PWA response caches that could replay
  // an authenticated shell.
  try {
    if (window.caches?.keys) {
      const keys = await window.caches.keys()
      for (const key of keys) tasks.push(window.caches.delete(key))
    }
  } catch {
    // Cache Storage unavailable (non-secure context / SSR) — safe to ignore.
  }

  // Service workers — unregister so a cached SPA shell can't rehydrate identity
  // or serve stale API responses after the session is gone.
  try {
    const container = navigator.serviceWorker
    if (container?.getRegistrations) {
      const registrations = await container.getRegistrations()
      for (const registration of registrations) tasks.push(registration.unregister())
    }
  } catch {
    // Service workers unsupported / blocked — safe to ignore.
  }

  await Promise.allSettled(tasks)
}

// ============================================================================
// TOKEN ACCESSORS
// ============================================================================

/**
 * Gets the current access token from cookies
 */
export function getAccessToken(env: SessionEnvironment = getActiveEnvironment()): string | null {
  return getCookie(sessionCookieName(env, "access_token"))
}

/**
 * Gets the current refresh token from cookies
 */
export function getRefreshToken(env: SessionEnvironment = getActiveEnvironment()): string | null {
  return getCookie(sessionCookieName(env, "refresh_token"))
}

/**
 * Gets the 1health base URL from cookies.
 * The URL is set per-environment (demo/prod) during authentication.
 */
export function getOneHealthBaseUrl(env: SessionEnvironment = getActiveEnvironment()): string {
  if (!hasEnvironmentSession(env)) {
    throw new Error(`No valid ${env} 1health session. User must authenticate via /auth first.`)
  }
  const baseUrl = getConnectedBaseUrl(env)
  if (!baseUrl) {
    throw new Error(`No connected base URL for the ${env} 1health session. User must authenticate via /auth again.`)
  }
  return baseUrl
}

/**
 * Returns true when a 1health session base URL is present. Use this to detect
 * the "not authenticated yet" state without triggering the thrown error above,
 * so unauthenticated loads stay quiet instead of surfacing as runtime errors.
 */
export function hasOneHealthSession(env: SessionEnvironment = getActiveEnvironment()): boolean {
  return hasEnvironmentSession(env)
}

/**
 * Gets the user's organization ID from cookies
 */
export function getOrganizationId(env: SessionEnvironment = getActiveEnvironment()): number | null {
  const orgIdCookie = getCookie(sessionCookieName(env, "user_org_id"))
  if (!orgIdCookie) return null
  const orgId = Number.parseInt(orgIdCookie, 10)
  return Number.isNaN(orgId) ? null : orgId
}

/**
 * Gets the current user ID from cookies
 */
export function getUserId(env: SessionEnvironment = getActiveEnvironment()): number | null {
  const userIdCookie = getCookie(sessionCookieName(env, "user_id"))
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

const refreshPromises: Partial<Record<SessionEnvironment, Promise<boolean>>> = {}

/**
 * Refreshes the access token using the refresh token.
 * Makes a direct call to 1health OAuth endpoint.
 * Returns true if successful, false if refresh failed.
 */
export async function refreshToken(env: SessionEnvironment = getActiveEnvironment()): Promise<boolean> {
  // Coalesce refreshes only within the same environment. Demo and production
  // refresh independently and can never share credentials.
  const inFlight = refreshPromises[env]
  if (inFlight) return inFlight

  const refreshPromise = (async () => {
    const currentRefreshToken = getRefreshToken(env)

    if (!currentRefreshToken) {
      console.error("[auth-client] No refresh token available")
      return false
    }

    let baseUrl: string
    try {
      baseUrl = getOneHealthBaseUrl(env)
    } catch {
      console.error("[auth-client] No 1health base URL available")
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
        return false
      }

      const data = JSON.parse(responseText)
      const accessTokenMaxAge = data.expires_in || 3600
      const refreshTokenMaxAge = accessTokenMaxAge * 2

      // Update cookies with new tokens
      setCookie(sessionCookieName(env, "access_token"), data.access_token, accessTokenMaxAge)
      if (data.refresh_token) {
        setCookie(sessionCookieName(env, "refresh_token"), data.refresh_token, refreshTokenMaxAge)
      }

      // Set expiration timestamps only in the refreshed environment slot.
      const tokenExpiresAt = Math.floor(Date.now() / 1000) + accessTokenMaxAge
      const refreshTokenExpiresAt = Math.floor(Date.now() / 1000) + refreshTokenMaxAge
      setCookie(sessionCookieName(env, "token_expires_at"), tokenExpiresAt.toString(), accessTokenMaxAge)
      setCookie(
        sessionCookieName(env, "refresh_token_expires_at"),
        refreshTokenExpiresAt.toString(),
        refreshTokenMaxAge,
      )

      console.log("[auth-client] Token refreshed successfully")
      return true
    } catch (error) {
      console.error("[auth-client] Token refresh error:", error)
      return false
    }
  })()

  refreshPromises[env] = refreshPromise
  try {
    return await refreshPromise
  } finally {
    delete refreshPromises[env]
  }
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

let sessionRedirectStarted = false

/**
 * Preserve the current in-app location and hand authentication back to the
 * connected 1health environment. Concurrent failed requests share this guard,
 * preventing a patient screen from launching several login navigations.
 */
function recoverExpiredSession(env: SessionEnvironment): never {
  if (typeof window !== "undefined" && !sessionRedirectStarted) {
    sessionRedirectStarted = true
    saveLoginIntent(`${window.location.pathname}${window.location.search}`)
    window.location.assign(ENVIRONMENT_CONFIG[env].loginUrl)
  }
  throw new SessionExpiredError()
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
  baseUrl: string,
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

    // The Inspector represents copyable 1health API calls only. Same-origin
    // application routes (for example, Console configuration) may still use
    // authFetch to forward the active bearer token, but must not enter the
    // Inspector because they have no public, versioned 1health API path.
    if (!/\/v\d+(?:\/|\?|$)/.test(path)) return

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
      baseUrl,
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
  // Bind credentials and Inspector metadata to the launch-connected URL, never
  // to the environment badge or a hardcoded host. This remains stable if the UI
  // switches environments while the request is in flight.
  const env = SESSION_ENVIRONMENTS.find((candidate) => {
    const connectedBaseUrl = getConnectedBaseUrl(candidate)
    return connectedBaseUrl !== null &&
      (url === connectedBaseUrl || url.startsWith(`${connectedBaseUrl}/`))
  }) ?? getActiveEnvironment()
  const connectedBaseUrl = getOneHealthBaseUrl(env)
  let accessToken = getAccessToken(env)

  // No access token - try to refresh first
  if (!accessToken) {
    const refreshed = await refreshToken(env)
    if (!refreshed) {
      recoverExpiredSession(env)
    }
    accessToken = getAccessToken(env)
    if (!accessToken) {
      recoverExpiredSession(env)
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
    publishInspectorCall(url, connectedBaseUrl, method, options.body, response.status, responseBody, duration)
  }

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401) {
    console.log("[auth-client] Received 401, attempting token refresh...")
    const refreshed = await refreshToken(env)

    if (!refreshed) {
      recoverExpiredSession(env)
    }

    // Get the new token from the same request slot and retry.
    const newAccessToken = getAccessToken(env)
    if (!newAccessToken) {
      recoverExpiredSession(env)
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

    publishInspectorCall(url, connectedBaseUrl, method, options.body, retryResponse.status, retryBody, retryDuration)

    if (retryResponse.status === 401) {
      recoverExpiredSession(env)
    }

    return retryResponse
  }

  return response
}
