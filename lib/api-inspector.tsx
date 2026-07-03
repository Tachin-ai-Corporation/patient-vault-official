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
  path: string
  requestHeaders: Record<string, string>
  requestBody?: unknown
  // When true, this is the request that WOULD be sent — there is no live
  // backend, so status/responseBody/latencyMs are intentionally absent.
  illustrative: boolean
  status?: number
  responseBody?: unknown
  latencyMs?: number
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
  projectId: string
  env: ApiEnv
  // Optional explicit auth header value (already masked). When omitted we
  // synthesize one from the env.
  authValue?: string
  // Present ONLY when a real PV API call was performed. Omit it (the default)
  // to record an illustrative request with no fabricated response.
  liveResponse?: LiveResponse
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

// Masked-but-structured bearer value, e.g. "pv_sk_staging_••••…". The prefix
// (and env segment) is visible; the secret body is masked.
export function maskedAuthValue(env: ApiEnv): string {
  const prefix = env === 'production' ? 'pv_sk_live_' : 'pv_sk_staging_'
  return `${prefix}${'•'.repeat(24)}`
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
    const entry: ApiCall = {
      id: `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      method: input.method,
      path: input.path,
      requestHeaders: {
        Authorization: `Bearer ${input.authValue ?? maskedAuthValue(input.env)}`,
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
        path: c.path,
        requestBody: c.requestBody,
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

// Build a valid cURL string for a recorded call. This is request-only, so it is
// accurate for both illustrative and live entries.
export function buildCurl(call: ApiCall): string {
  const base = 'https://api.1health.io'
  const lines: string[] = [`curl -X ${call.method} '${base}${call.path}'`]
  for (const [k, v] of Object.entries(call.requestHeaders)) {
    lines.push(`  -H '${k}: ${v}'`)
  }
  if (call.requestBody !== undefined) {
    lines.push(`  -d '${JSON.stringify(call.requestBody)}'`)
  }
  return lines.join(' \\\n')
}

// Build the JSON payload copied by "Copy JSON". For illustrative calls the
// response is null and a note explains why — we never copy a fabricated result.
export function buildJson(call: ApiCall): string {
  return JSON.stringify(
    {
      request: {
        method: call.method,
        path: call.path,
        headers: call.requestHeaders,
        body: call.requestBody ?? null,
      },
      response: call.illustrative
        ? null
        : { status: call.status, body: call.responseBody },
      ...(call.illustrative
        ? {
            note: 'Illustrative request — PV APIs are not live yet, so no response was returned.',
          }
        : {}),
    },
    null,
    2,
  )
}
