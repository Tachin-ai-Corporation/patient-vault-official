/**
 * Client-side Patient Vault document (attachment) API (1health v3).
 *
 * Typed wrappers over `authFetch` for the patient attachment endpoints. Every
 * call goes through the shared `request()` helper so it uses the same base
 * path, auth header, and API Inspector logging as the rest of the app (see
 * lib/api/patient.ts).
 *
 * Endpoints:
 *   GET    /patient/{id}/attach                 list (newest first)
 *   GET    /patient/{id}/attach/{documentId}    detail (+ fresh downloadUrl)
 *   DELETE /patient/{id}/attach/{documentId}    deactivate (file retained)
 */

'use client'

import { authFetch, getOneHealthBaseUrl } from '@/lib/auth-client'

// ============================================================================
// Types
// ============================================================================

/** The document type value set used by the Type filter + badge. */
export type DocumentType =
  | 'lab_result'
  | 'imaging'
  | 'clinical_note'
  | 'audio'
  | 'fhir_bundle'
  | 'referral'
  | 'consent_form'
  | 'other'

/** A single attachment row (list) / record (detail). */
export interface DocumentDTO {
  documentId: string
  name: string
  documentType?: string | null
  contentType?: string | null
  sizeBytes?: number | null
  createdAt?: string | null
  /** Present on detail responses; expires 15 minutes after issue. */
  downloadUrl?: string | null
  /** Present on detail responses. Arbitrary key/value metadata. */
  metadata?: Record<string, unknown> | null
  /** True once the document has been deactivated (soft-deleted). */
  deleted?: boolean
}

/** Status segmented control -> `active` query param. */
export type DocumentStatus = 'active' | 'all' | 'deleted'

export interface DocumentListQuery {
  documentType?: string
  status?: DocumentStatus
}

// ============================================================================
// Low-level request helper (mirrors lib/api/patient.ts)
// ============================================================================

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getOneHealthBaseUrl()
  const res = await authFetch(`${baseUrl}/api${path}`, init)
  if (!res.ok) {
    // Surface the API's `message` field when present so callers can show it.
    let message = ''
    let detail = ''
    try {
      detail = await res.text()
      if (detail) {
        try {
          const parsed = JSON.parse(detail)
          if (parsed && typeof parsed.message === 'string') message = parsed.message
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

function unwrapList<T>(data: unknown, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k]
      if (Array.isArray(v)) return v as T[]
    }
  }
  return []
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * List attachments for a patient. The API already returns newest first, so the
 * order is preserved as-is. Filters are applied server-side via query params
 * (never filtered client-side): `documentType` narrows the type, and the
 * status control maps to `active` (omitted = active only, `all`, or `false`).
 */
export async function listDocuments(
  patientId: string,
  query: DocumentListQuery = {},
): Promise<DocumentDTO[]> {
  const params = new URLSearchParams()
  if (query.documentType) params.set('documentType', query.documentType)
  if (query.status === 'all') params.set('active', 'all')
  else if (query.status === 'deleted') params.set('active', 'false')
  // 'active' (default) omits the parameter entirely.
  const qs = params.toString()
  const data = await request<unknown>(
    `/patient/${patientId}/attach${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return unwrapList<DocumentDTO>(data, 'documents', 'attachments', 'content', 'items', 'data')
}

/**
 * Fetch a single document, including a freshly-issued `downloadUrl`. Always
 * call this immediately before downloading — download URLs expire after 15
 * minutes and must never be reused from an earlier fetch.
 */
export async function getDocument(
  patientId: string,
  documentId: string,
): Promise<DocumentDTO> {
  return request<DocumentDTO>(`/patient/${patientId}/attach/${documentId}`, {
    method: 'GET',
  })
}

/**
 * Deactivate (soft-delete) a document. The underlying file is retained and
 * remains visible under the Deleted / All status filters.
 */
export async function deleteDocument(
  patientId: string,
  documentId: string,
): Promise<void> {
  await request<unknown>(`/patient/${patientId}/attach/${documentId}`, {
    method: 'DELETE',
  })
}
