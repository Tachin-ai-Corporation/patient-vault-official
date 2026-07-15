/**
 * Client-side Patient Vault document (attachment) API (1health v3).
 *
 * Typed wrappers for the patient attachment endpoints. Every call goes through
 * the shared client (`apiRequest` / `apiFetch` in lib/api/client.ts) so it uses
 * the same versioned base path, auth header, and API Inspector logging as the
 * patient module.
 *
 * Endpoints (all under the shared /api/v3 base):
 *   GET    /v3/patient/{id}/attach                 list (newest first)
 *   GET    /v3/patient/{id}/attach/{documentId}    detail (+ fresh downloadUrl)
 *   DELETE /v3/patient/{id}/attach/{documentId}    deactivate (file retained)
 */

'use client'

import { apiRequest, apiFetch } from '@/lib/api/client'

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
// Helpers
// ============================================================================

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
  const data = await apiRequest<unknown>(
    `/v3/patient/${patientId}/attach${qs ? `?${qs}` : ''}`,
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
  return apiRequest<DocumentDTO>(`/v3/patient/${patientId}/attach/${documentId}`, {
    method: 'GET',
  })
}

/** Body for attaching (uploading) a new document. */
export interface AttachDocumentInput {
  documentType: string
  contentType: string
  name: string
  /** Base64-encoded file contents (no data-URI prefix). */
  data: string
  /** Optional arbitrary metadata; omitted from the request when empty. */
  metadata?: Record<string, string>
}

/**
 * Attach (upload) a new document to a patient. The file must already be
 * base64-encoded by the caller. On success the API returns the created record
 * including a server-assigned `documentId`.
 */
export async function attachDocument(
  patientId: string,
  input: AttachDocumentInput,
): Promise<DocumentDTO> {
  const body: Record<string, unknown> = {
    documentType: input.documentType,
    contentType: input.contentType,
    name: input.name,
    data: input.data,
  }
  // Only include `metadata` when at least one key/value pair is present.
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    body.metadata = input.metadata
  }
  return apiRequest<DocumentDTO>(`/v3/patient/${patientId}/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
  await apiRequest<unknown>(`/v3/patient/${patientId}/attach/${documentId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// Method-not-allowed probe (API surface demo)
// ============================================================================

/**
 * Fire a raw request against an attachment URL for a method the resource does
 * not support, so the resulting 405 is recorded live in the API Inspector.
 *
 * This intentionally goes through `apiFetch` (the non-throwing shared client)
 * so it emits the exact same inspector entry an integrating developer's backend
 * would produce — same base path + masked auth header — and never throws on the
 * expected non-2xx status. Returns the HTTP status code.
 */
export async function probeAttachEndpoint(
  patientId: string,
  method: 'PUT' | 'PATCH' | 'POST' | 'DELETE',
  scope: 'collection' | 'item',
  documentId?: string,
): Promise<number> {
  const path =
    scope === 'collection'
      ? `/v3/patient/${patientId}/attach`
      : `/v3/patient/${patientId}/attach/${documentId || 'sample-document-id'}`
  const res = await apiFetch(path, { method })
  return res.status
}
