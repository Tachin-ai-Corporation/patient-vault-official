/**
 * Shared low-level 1health API client.
 *
 * This is the single place the request URL is assembled: `${baseUrl}/api` +
 * the caller-supplied path (which includes the version segment, e.g.
 * `/v3/patient/...`). Both lib/api/patient.ts and lib/api/documents.ts import
 * from here so every call shares the same base path, auth header, API Inspector
 * logging (via `authFetch`), and error handling.
 */

"use client"

import { authFetch, getOneHealthBaseUrl } from "@/lib/auth-client"

/**
 * Build a fully-qualified API URL from a versioned path. The base URL and the
 * `/api` prefix are assembled here and nowhere else; callers pass the rest of
 * the path starting with the version segment (e.g. `/v3/patient/1/attach`).
 */
export function apiUrl(path: string): string {
  return `${getOneHealthBaseUrl()}/api${path}`
}

/**
 * Error thrown by `apiRequest` for non-2xx responses. Carries the HTTP status
 * so callers can branch (e.g. treat a "feature not deployed" 404 differently),
 * and `.message` is always a human-friendly sentence — never a raw JSON dump.
 */
export class ApiError extends Error {
  status: number
  /** True when the endpoint itself isn't available in this environment. */
  unavailable: boolean

  constructor(message: string, status: number, unavailable = false) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.unavailable = unavailable
  }
}

/**
 * Turn a raw error response into a friendly, human-readable message. Handles
 * RFC 7807 problem-details bodies (`{ title, detail, status }`) and the 1health
 * `{ message }` shape, and never surfaces raw JSON to the UI.
 *
 * Returns `{ message, unavailable }` where `unavailable` marks the case where
 * the endpoint isn't deployed in the current environment yet (a 404 whose body
 * reports "No static resource ..."), which we word gently for the user.
 */
function friendlyApiError(status: number, body: string): { message: string; unavailable: boolean } {
  let detail = ""
  let title = ""
  let apiMessage = ""

  if (body) {
    try {
      const parsed = JSON.parse(body)
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.message === "string") apiMessage = parsed.message
        if (typeof parsed.detail === "string") detail = parsed.detail
        if (typeof parsed.title === "string") title = parsed.title
      }
    } catch {
      /* not JSON — fall through to status-based wording */
    }
  }

  // The endpoint isn't deployed in this environment (e.g. custom-field APIs in
  // prod). The API reports this as a 404 with "No static resource ..." — word
  // it gently rather than showing the technical detail.
  const notDeployed = status === 404 && /no static resource/i.test(detail)
  if (notDeployed) {
    return {
      message: "This feature isn't available in the current environment yet. Please try again later or switch environments.",
      unavailable: true,
    }
  }

  // Prefer the API's own human-readable text, in order of usefulness.
  const message = apiMessage || detail || title
  if (message) return { message, unavailable: false }

  // Last resort: a clean status-based sentence, never raw JSON.
  const fallback =
    status === 404
      ? "The requested resource was not found."
      : status === 401 || status === 403
        ? "You don't have permission to perform this action."
        : status >= 500
          ? "The service is temporarily unavailable. Please try again."
          : `The request failed (error ${status}).`
  return { message: fallback, unavailable: false }
}

/**
 * Perform an API request and parse the JSON response. Throws an `ApiError` with
 * a friendly `.message` on non-2xx. Returns `undefined` for 204 / empty bodies.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(apiUrl(path), init)
  if (!res.ok) {
    let body = ""
    try {
      body = await res.text()
    } catch {
      /* ignore */
    }
    const { message, unavailable } = friendlyApiError(res.status, body)
    throw new ApiError(message, res.status, unavailable)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * Perform a raw API request and return the `Response` without throwing on
 * non-2xx. Use this when the caller needs to inspect an expected error status
 * (e.g. probing for a 405). The call is still logged in the API Inspector.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return authFetch(apiUrl(path), init)
}
