/**
 * API Inspector bus — a tiny, zero-dependency pub/sub that bridges the real
 * HTTP layer (`authFetch` in lib/auth-client.ts) to the in-memory API Inspector
 * (lib/api-inspector.tsx).
 *
 * WHY A SEPARATE MODULE: `auth-client.ts` is a plain module (not a React tree),
 * so it cannot call the inspector's React context. And `api-inspector.tsx`
 * imports `session-context`, which (transitively) imports `auth-client`. Wiring
 * the two together directly would create an import cycle. Keeping this bus
 * import-free breaks that cycle: `auth-client` publishes here, and the inspector
 * provider subscribes here.
 *
 * These are REAL round-trips (status + body from the actual response), so the
 * inspector renders them as live calls, not illustrative ones.
 */

export type BusApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type BusApiCall = {
  method: BusApiMethod
  // Pathname (+ query) of the request, e.g. "/api/v3/patient".
  path: string
  requestBody?: unknown
  status: number
  responseBody: unknown
  latencyMs: number
  // Set only when a large upload `data` field was truncated at publish time:
  // the formatted original payload size in KB (e.g. "12" or "3.4"). The full
  // base64 string is discarded and never retained downstream.
  uploadOriginalSizeKb?: string
}

type Listener = (call: BusApiCall) => void

const listeners = new Set<Listener>()

// Buffer calls that fire before the inspector provider mounts (e.g. the initial
// myself/tenant fetches during boot) so the first calls aren't lost. Capped so
// it can never grow unbounded if no subscriber ever attaches.
let buffer: BusApiCall[] = []
const MAX_BUFFER = 200

// A `data` field longer than this (base64 upload payload) is truncated for the
// log; anything shorter is kept verbatim.
const UPLOAD_DATA_TRUNCATE_THRESHOLD = 200
// How many leading characters of the base64 payload we keep for display.
const UPLOAD_DATA_PREFIX_CHARS = 40

// Format a base64 payload's transmitted size in KB. base64 characters are one
// byte each on the wire, so the string length is the byte count. Kept here (the
// import-free bus) and exported so the inspector can reuse the exact format.
export function formatBase64SizeKb(lengthChars: number): string {
  const kb = lengthChars / 1024
  if (kb >= 10) return Math.round(kb).toLocaleString()
  if (kb >= 1) return kb.toFixed(1)
  return kb.toFixed(2)
}

// If the request body carries a large base64 `data` field, return a clone whose
// `data` is truncated (first N chars + a size annotation) and record the
// original size. The full base64 string is dropped so it is never retained in
// the buffer or the inspector's in-memory log. Non-upload calls pass through.
function truncateUploadPayload(call: BusApiCall): BusApiCall {
  const body = call.requestBody
  if (!body || typeof body !== 'object') return call
  const record = body as Record<string, unknown>
  const data = record.data
  if (
    typeof data !== 'string' ||
    data.length <= UPLOAD_DATA_TRUNCATE_THRESHOLD
  ) {
    return call
  }
  const sizeKb = formatBase64SizeKb(data.length)
  return {
    ...call,
    requestBody: {
      ...record,
      data: `${data.slice(0, UPLOAD_DATA_PREFIX_CHARS)}… (${sizeKb} KB base64, truncated for display)`,
    },
    uploadOriginalSizeKb: sizeKb,
  }
}

export function recordApiCall(call: BusApiCall): void {
  // Truncate large upload payloads at publish time so the full base64 string is
  // never held anywhere downstream — not in this buffer, not in the log.
  const entry = truncateUploadPayload(call)
  if (listeners.size === 0) {
    buffer.push(entry)
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER)
    return
  }
  for (const fn of listeners) fn(entry)
}

export function subscribeApiCalls(fn: Listener): () => void {
  listeners.add(fn)
  // Flush anything buffered before this subscriber attached.
  if (buffer.length > 0) {
    const pending = buffer
    buffer = []
    for (const c of pending) fn(c)
  }
  return () => {
    listeners.delete(fn)
  }
}
