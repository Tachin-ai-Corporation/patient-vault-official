'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSession, type ApiEnv } from '@/lib/session-context'
import { subscribeApiCalls } from '@/lib/api-inspector-bus'
import { getAccessToken, getOneHealthBaseUrl } from '@/lib/auth-client'

// ============================================================================
// API Inspector — a shared, in-memory record of the API calls behind every
// console action. This makes the product thesis literal: everything you do in
// the console is an API call.
//
// IMPORTANT — illustrative vs. live:
// The PV (1health) APIs are not on demo yet, so there is no live backend to
// call. Every entry recorded here is therefore *illustrative*: it is the
// request that WOULD be sent. We deliberately do NOT fabricate a success
// status or response body for illustrative calls — only the request (method,
// path, headers, body) is shown, clearly labeled as illustrative.
//
// SWAP POINT: when a real HTTP client is wired up, pass `liveResponse` to
// logApiCall (status + body from the actual round-trip). Entries with a live
// response render the real status/body; entries without stay illustrative.
//
// Nothing here is logged or persisted: the call list lives in memory only and
// is dropped on unmount/reload. Only lightweight UI preferences (panel open
// state, height, and the on/off toggle) are persisted — never request data.
// ============================================================================

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

// A real round-trip result. Only present when an actual PV API call was made.
export type LiveResponse = {
  status: number
  body: unknown
  latencyMs?: number
}

export type ApiCall = {
  id: string
  timestamp: number
  method: ApiMethod
  // Exact connected base URL used by the console session for this call.
  baseUrl: string
  path: string
  requestHeaders: Record<string, string>
  requestBody?: unknown
  // When true, this is the request that WOULD be sent — there is no live
  // backend, so status/responseBody/latencyMs are intentionally absent.
  illustrative: boolean
  status?: number
  responseBody?: unknown
  latencyMs?: number
  // Set only for upload calls whose base64 `data` field was truncated at
  // publish time: the original payload size in KB (formatted). Used by the
  // copy helpers to annotate the truncated body; the full base64 is not kept.
  uploadOriginalSizeKb?: string
  // Scope: which project + environment this call belongs to. The panel only
  // shows calls for the project/env the developer is currently viewing.
  projectId: string
  env: ApiEnv
}

// Payload a caller supplies; scope, headers, id, and timestamp are filled in.
export type LogApiCallInput = {
  method: ApiMethod
  path: string
  requestBody?: unknown
  // Optional for illustrative calls. Live calls always provide the exact URL
  // captured by authFetch through the Inspector bus.
  baseUrl?: string
  projectId: string
  env: ApiEnv
  // Optional explicit auth header value (already masked). When omitted we
  // synthesize one from the env.
  authValue?: string
  // Present ONLY when a real PV API call was performed. Omit it (the default)
  // to record an illustrative request with no fabricated response.
  liveResponse?: LiveResponse
  // Forwarded from the bus when a large upload payload was truncated at
  // publish time: the original base64 size in KB (formatted).
  uploadOriginalSizeKb?: string
}

export type InspectorVisibility = 'hidden' | 'collapsed' | 'expanded'

type ApiInspectorValue = {
  calls: ApiCall[]
  logApiCall: (input: LogApiCallInput) => void
  // Clear calls. With a scopeKey, only that project/env's calls are removed;
  // without one, all calls are cleared.
  clearCalls: (scopeKey?: string) => void
  // Global on/off for the whole viewer (toggled from Console). Defaults on.
  // When off, no panel is shown and recorded calls are ignored.
  enabled: boolean
  setEnabled: (v: boolean) => void
  visibility: InspectorVisibility
  setVisibility: (v: InspectorVisibility) => void
  height: number
  setHeight: (h: number) => void
}

const ApiInspectorContext = createContext<ApiInspectorValue | null>(null)

const STORAGE_KEY = 'pv-inspector'
const DEFAULT_HEIGHT = 300
export const MIN_HEIGHT = 160
export const MAX_HEIGHT = 640
// Cap the in-memory log so it never grows unbounded. Sized generously because
// seeding the sample batch logs the full per-patient sequence (1 POST
// /v3/patient + N contacts + M addresses per patient), which is many entries.
const MAX_CALLS = 500

export function scopeKeyFor(projectId: string, env: ApiEnv) {
  return `${projectId}::${env}`
}

// Show only enough of the actual bearer token to identify which credential was
// used. The full token is never stored in the Inspector's in-memory call log.
export function maskedAuthValue(token: string | null): string {
  if (!token) return '••••••••••••••••••••••••'
  const visible = token.slice(0, 6)
  return `${visible}${'•'.repeat(24)}`
}

export function ApiInspectorProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const [calls, setCalls] = useState<ApiCall[]>([])
  const [enabled, setEnabledState] = useState<boolean>(true)
  const [visibility, setVisibilityState] =
    useState<InspectorVisibility>('collapsed')
  const [height, setHeightState] = useState<number>(DEFAULT_HEIGHT)

  // Hydrate persisted UI preferences (toggle/open/height) like the theme. Only
  // UI state is persisted — never the call log itself.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<{
        enabled: boolean
        visibility: InspectorVisibility
        height: number
      }>
      if (typeof parsed.enabled === 'boolean') {
        setEnabledState(parsed.enabled)
      }
      if (
        parsed.visibility === 'hidden' ||
        parsed.visibility === 'collapsed' ||
        parsed.visibility === 'expanded'
      ) {
        setVisibilityState(parsed.visibility)
      }
      if (typeof parsed.height === 'number') {
        setHeightState(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, parsed.height)))
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const persist = useCallback(
    (next: { enabled: boolean; visibility: InspectorVisibility; height: number }) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
    },
    [],
  )

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v)
      persist({ enabled: v, visibility, height })
    },
    [persist, visibility, height],
  )

  const setVisibility = useCallback(
    (v: InspectorVisibility) => {
      setVisibilityState(v)
      persist({ enabled, visibility: v, height })
    },
    [persist, enabled, height],
  )

  const setHeight = useCallback(
    (h: number) => {
      const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h))
      setHeightState(clamped)
      persist({ enabled, visibility, height: clamped })
    },
    [persist, enabled, visibility],
  )

  const logApiCall = useCallback((input: LogApiCallInput) => {
    const live = input.liveResponse
    // Live calls carry the exact origin parsed from the URL sent by authFetch.
    // Illustrative calls read the active connected session directly; neither
    // path derives the host from the Inspector's UI environment label.
    const baseUrl = input.baseUrl ?? getOneHealthBaseUrl()
    const entry: ApiCall = {
      id: `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      method: input.method,
      baseUrl,
      path: input.path,
      requestHeaders: {
        // Mask immediately: only the first six characters enter Inspector state.
        Authorization: `Bearer ${input.authValue ?? maskedAuthValue(getAccessToken())}`,
        ...(input.requestBody !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      requestBody: input.requestBody,
      // No live backend → illustrative. Do not invent status/response.
      illustrative: !live,
      status: live?.status,
      responseBody: live ? live.body : undefined,
      latencyMs: live?.latencyMs,
      uploadOriginalSizeKb: input.uploadOriginalSizeKb,
      projectId: input.projectId,
      env: input.env,
    }
    // Newest first; cap the log so it never grows unbounded.
    setCalls((prev) => [entry, ...prev].slice(0, MAX_CALLS))
  }, [])

  // Bridge the real HTTP layer into the inspector. `authFetch` publishes every
  // completed round-trip to the bus; we tag it with the current project/env
  // scope (so the panel's scope filter matches) and record it as a LIVE call.
  //
  // Latest `enabled`/scope are read through refs so we can subscribe exactly
  // once on mount — re-subscribing would re-flush the boot-time buffer.
  const enabledRef = useRef(enabled)
  const scopeRef = useRef({
    projectId: session.currentProjectId,
    env: session.currentEnv,
  })
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])
  useEffect(() => {
    scopeRef.current = {
      projectId: session.currentProjectId,
      env: session.currentEnv,
    }
  }, [session.currentProjectId, session.currentEnv])

  useEffect(() => {
    const unsubscribe = subscribeApiCalls((c) => {
      if (!enabledRef.current) return
      logApiCall({
        method: c.method,
        baseUrl: c.baseUrl,
        path: c.path,
        requestBody: c.requestBody,
        uploadOriginalSizeKb: c.uploadOriginalSizeKb,
        projectId: scopeRef.current.projectId,
        env: scopeRef.current.env,
        liveResponse: {
          status: c.status,
          body: c.responseBody,
          latencyMs: c.latencyMs,
        },
      })
    })
    return unsubscribe
  }, [logApiCall])

  const clearCalls = useCallback((key?: string) => {
    if (!key) {
      setCalls([])
      return
    }
    setCalls((prev) =>
      prev.filter((c) => scopeKeyFor(c.projectId, c.env) !== key),
    )
  }, [])

  const value = useMemo<ApiInspectorValue>(
    () => ({
      calls,
      logApiCall,
      clearCalls,
      enabled,
      setEnabled,
      visibility,
      setVisibility,
      height,
      setHeight,
    }),
    [
      calls,
      logApiCall,
      clearCalls,
      enabled,
      setEnabled,
      visibility,
      setVisibility,
      height,
      setHeight,
    ],
  )

  return (
    <ApiInspectorContext.Provider value={value}>
      {children}
    </ApiInspectorContext.Provider>
  )
}

export function useApiInspector() {
  const ctx = useContext(ApiInspectorContext)
  if (!ctx) {
    throw new Error('useApiInspector must be used within an ApiInspectorProvider')
  }
  return ctx
}

// Convenience emitter that auto-injects the current project + environment
// scope (and a masked auth header) so call sites only describe the call. Any
// surface can call this to record the API call behind a user action. Calls are
// dropped silently when the viewer is toggled off in Console.
export function useApiEmitter() {
  const { logApiCall, enabled } = useApiInspector()
  const { session } = useSession()
  const projectId = session.currentProjectId
  const env = session.currentEnv

  return useCallback(
    (input: Omit<LogApiCallInput, 'projectId' | 'env'>) => {
      if (!enabled) return
      logApiCall({ ...input, projectId, env })
    },
    [logApiCall, enabled, projectId, env],
  )
}

// ============================================================================
// Attachment (upload) helpers
//
// A POST to a path containing "/attach" whose JSON body carries a base64 `data`
// field is a file upload. The base64 payload can be megabytes, so it is
// truncated at publish time (see lib/api-inspector-bus.ts) — the stored body
// already holds the shortened `data` and the entry records the original size in
// `uploadOriginalSizeKb`. Rendering shows the stored body verbatim; the copy
// helpers below swap in a placeholder (cURL) or append a size note (JSON).
// ============================================================================

// True when the call is a document upload (POST /…/attach with a `data` field).
// Accepts the minimal shape so it works on both ApiCall and bus rows.
export function isUploadCall(
  call: Pick<ApiCall, 'method' | 'path' | 'requestBody'>,
): boolean {
  return (
    call.method === 'POST' &&
    call.path.includes('/attach') &&
    !!call.requestBody &&
    typeof call.requestBody === 'object' &&
    typeof (call.requestBody as Record<string, unknown>).data === 'string'
  )
}

// The literal cURL placeholder standing in for the omitted base64 payload.
export const CURL_DATA_PLACEHOLDER = '<BASE64_FILE_CONTENT>'

// Quote arbitrary text as one POSIX shell argument. Single quotes are safest
// for JSON; embedded apostrophes are represented by closing the quote, adding
// an escaped apostrophe, and reopening it.
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`
}

// Captured URLs include the platform's internal `/api` prefix, while Inspector
// rows intentionally display the public versioned path beginning at `/v3`.
export function versionedPath(path: string): string {
  const match = path.match(/\/v3(?:\/|\?|$)/)
  if (!match || match.index === undefined) {
    throw new Error(`Inspector call does not contain a /v3 path: ${path}`)
  }
  return path.slice(match.index)
}

// Build a runnable cURL command from the exact connected origin captured with
// the call. The UI environment is deliberately ignored: it can disagree with
// an in-flight request, but the copied host must never do so.
export function buildCurl(call: ApiCall): string {
  const connectedBase = call.baseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  const url = `${connectedBase}/api${versionedPath(call.path)}`
  const lines: string[] = [
    `curl --request ${call.method} ${shellQuote(url)}`,
    '  --header "Authorization: Bearer $PV_API_KEY"',
    "  --header 'Content-Type: application/json'",
  ]

  if (call.requestBody !== undefined && call.method !== 'GET') {
    const body = isUploadCall(call)
      ? {
          ...(call.requestBody as Record<string, unknown>),
          data: CURL_DATA_PLACEHOLDER,
        }
      : call.requestBody
    lines.push(`  --data ${shellQuote(JSON.stringify(body))}`)
  }
  return lines.join(' \\\n')
}

// Context-specific JSON serializers. Each action copies exactly the payload
// beside it, not a request/response envelope.
export function buildRequestJson(call: ApiCall): string {
  const body =
    isUploadCall(call) && call.uploadOriginalSizeKb
      ? {
          ...(call.requestBody as Record<string, unknown>),
          _note: `data truncated — full payload was ${call.uploadOriginalSizeKb} KB base64`,
        }
      : (call.requestBody ?? null)
  return JSON.stringify(body, null, 2)
}

export function buildResponseJson(call: ApiCall): string {
  return JSON.stringify(call.responseBody ?? null, null, 2)
}
