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
}

type Listener = (call: BusApiCall) => void

const listeners = new Set<Listener>()

// Buffer calls that fire before the inspector provider mounts (e.g. the initial
// myself/tenant fetches during boot) so the first calls aren't lost. Capped so
// it can never grow unbounded if no subscriber ever attaches.
let buffer: BusApiCall[] = []
const MAX_BUFFER = 200

export function recordApiCall(call: BusApiCall): void {
  if (listeners.size === 0) {
    buffer.push(call)
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER)
    return
  }
  for (const fn of listeners) fn(call)
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
