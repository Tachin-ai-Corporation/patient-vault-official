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
 * Perform an API request and parse the JSON response. Throws on non-2xx,
 * surfacing the API's `message` field when present so callers can display it.
 * Returns `undefined` for 204 / empty bodies.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(apiUrl(path), init)
  if (!res.ok) {
    let message = ""
    let detail = ""
    try {
      detail = await res.text()
      if (detail) {
        try {
          const parsed = JSON.parse(detail)
          if (parsed && typeof parsed.message === "string") message = parsed.message
        } catch {
          /* not JSON */
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(message || `1health API ${res.status}: ${detail || res.statusText}`)
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
