'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  FileJson,
  TerminalSquare,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/session-context'
import {
  buildCurl,
  buildJson,
  displayUploadBody,
  isUploadCall,
  scopeKeyFor,
  useApiInspector,
  type ApiCall,
  type ApiMethod,
} from '@/lib/api-inspector'

type FilterMode = 'all' | 'reads' | 'writes'

const READ_METHODS: ApiMethod[] = ['GET']

function isRead(method: ApiMethod) {
  return READ_METHODS.includes(method)
}

// Method chip colors — calm, token-based.
function methodChipClass(method: ApiMethod): string {
  switch (method) {
    case 'GET':
      return 'border-accent/40 bg-accent/10 text-accent'
    case 'POST':
      return 'border-success/40 bg-success/10 text-success'
    case 'PATCH':
      return 'border-warning/40 bg-warning/10 text-warning'
    case 'DELETE':
      return 'border-destructive/40 bg-destructive/10 text-destructive'
  }
}

function statusClass(status: number): string {
  if (status >= 500) return 'text-destructive'
  if (status >= 400) return 'text-warning'
  return 'text-success'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// A signed download URL from an attachment detail response. Returned so the
// detail view can render it as plain (non-clickable) text with an expiry note.
function responseDownloadUrl(body: unknown): string | null {
  if (body && typeof body === 'object') {
    const url = (body as Record<string, unknown>).downloadUrl
    if (typeof url === 'string' && url.length > 0) return url
  }
  return null
}

export function ApiInspectorPanel() {
  const { session } = useSession()
  const {
    calls,
    clearCalls,
    enabled,
    visibility,
    setVisibility,
    height,
    setHeight,
  } = useApiInspector()

  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Scope: only show calls for the project + environment being viewed. A call
  // from a different project context simply isn't in this list.
  const scopeKey = scopeKeyFor(session.currentProjectId, session.currentEnv)
  const scopedCalls = useMemo(
    () =>
      calls.filter(
        (c) => scopeKeyFor(c.projectId, c.env) === scopeKey,
      ),
    [calls, scopeKey],
  )

  const filteredCalls = useMemo(() => {
    if (filter === 'reads') return scopedCalls.filter((c) => isRead(c.method))
    if (filter === 'writes') return scopedCalls.filter((c) => !isRead(c.method))
    return scopedCalls
  }, [scopedCalls, filter])

  // The latest scoped call drives the header label; the selected call (default
  // = latest visible) drives the detail pane and the copy affordances.
  const latest = scopedCalls[0] ?? null
  const selected = useMemo(() => {
    if (selectedId) {
      const found = filteredCalls.find((c) => c.id === selectedId)
      if (found) return found
    }
    return filteredCalls[0] ?? null
  }, [selectedId, filteredCalls])

  // ---- drag-to-resize (top edge) ----
  const draggingRef = useRef(false)
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      const startY = e.clientY
      const startHeight = height
      function onMove(ev: MouseEvent) {
        if (!draggingRef.current) return
        // Dragging up (smaller clientY) grows the panel.
        setHeight(startHeight + (startY - ev.clientY))
      }
      function onUp() {
        draggingRef.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.userSelect = ''
      }
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [height, setHeight],
  )

  // Globally toggled off in Console: the entire viewer disappears (no panel,
  // no reopen handle). Actions still work; they just aren't surfaced.
  if (!enabled) {
    return null
  }

  // Hidden state: just a small handle to reopen.
  if (visibility === 'hidden') {
    return (
      <button
        type="button"
        onClick={() => setVisibility('collapsed')}
        className="fixed bottom-4 right-6 z-40 flex items-center gap-2 rounded-button border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground shadow-lg transition-colors hover:text-foreground"
        aria-label="Open API Inspector"
      >
        <TerminalSquare className="h-4 w-4" />
        API Inspector
        {scopedCalls.length > 0 && (
          <span className="rounded-tag bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
            {scopedCalls.length}
          </span>
        )}
      </button>
    )
  }

  const expanded = visibility === 'expanded'

  return (
    <section
      aria-label="API Inspector"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 shadow-2xl backdrop-blur-sm md:left-60"
    >
      {/* Resize handle (only meaningful when expanded) */}
      {expanded && (
        <div
          role="separator"
          aria-label="Resize API Inspector"
          aria-orientation="horizontal"
          onMouseDown={onDragStart}
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize"
        >
          <div className="mx-auto mt-0.5 h-1 w-10 rounded-full bg-border" />
        </div>
      )}

      <InspectorHeader
        latest={latest}
        selected={selected}
        filter={filter}
        onFilter={setFilter}
        expanded={expanded}
        onToggleExpand={() =>
          setVisibility(expanded ? 'collapsed' : 'expanded')
        }
        onHide={() => setVisibility('hidden')}
        onClear={() => {
          clearCalls(scopeKey)
          setSelectedId(null)
        }}
        hasCalls={scopedCalls.length > 0}
      />

      {expanded && (
        <div
          className="flex min-h-0 border-t border-border"
          style={{ height }}
        >
          <CallList
            calls={filteredCalls}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
          />
          <CallDetail call={selected} />
        </div>
      )}
    </section>
  )
}

function InspectorHeader({
  latest,
  selected,
  filter,
  onFilter,
  expanded,
  onToggleExpand,
  onHide,
  onClear,
  hasCalls,
}: {
  latest: ApiCall | null
  selected: ApiCall | null
  filter: FilterMode
  onFilter: (f: FilterMode) => void
  expanded: boolean
  onToggleExpand: () => void
  onHide: () => void
  onClear: () => void
  hasCalls: boolean
}) {
  return (
    <header className="flex h-11 items-center gap-3 px-3">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-center gap-2 rounded-input px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={expanded ? 'Collapse API Inspector' : 'Expand API Inspector'}
        aria-expanded={expanded}
      >
        <TerminalSquare className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          API Inspector
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            expanded ? '' : 'rotate-180',
          )}
        />
      </button>

      {/* Latest call summary */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {latest ? (
          <span className="flex min-w-0 items-center gap-2 font-mono text-xs">
            <MethodChip method={latest.method} />
            <span className="truncate text-foreground">{latest.path}</span>
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">
            No calls yet — actions will appear here
          </span>
        )}
      </div>

      {/* Filter */}
      <FilterTabs value={filter} onChange={onFilter} />

      {/* Copy affordances act on the selected call */}
      <CopyAction
        label="Copy cURL"
        icon={<TerminalSquare className="h-3.5 w-3.5" />}
        value={selected ? buildCurl(selected) : ''}
        disabled={!selected}
      />
      <CopyAction
        label="Copy JSON"
        icon={<FileJson className="h-3.5 w-3.5" />}
        value={selected ? buildJson(selected) : ''}
        disabled={!selected}
      />

      <button
        type="button"
        onClick={onClear}
        disabled={!hasCalls}
        className="flex h-7 items-center gap-1.5 rounded-input px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Clear recorded calls"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear
      </button>

      <button
        type="button"
        onClick={onHide}
        className="flex h-7 w-7 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Hide API Inspector"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  )
}

function MethodChip({ method }: { method: ApiMethod }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-tag border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide',
        methodChipClass(method),
      )}
    >
      {method}
    </span>
  )
}

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterMode
  onChange: (f: FilterMode) => void
}) {
  const tabs: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'reads', label: 'Reads' },
    { key: 'writes', label: 'Writes' },
  ]
  return (
    <div
      role="tablist"
      aria-label="Filter calls"
      className="flex items-center gap-0.5 rounded-input border border-border bg-muted/40 p-0.5"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'rounded-[4px] px-2 py-1 font-mono text-[11px] transition-colors',
            value === t.key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function CopyAction({
  label,
  icon,
  value,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  value: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; fail quietly in the mock.
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className="hidden h-7 items-center gap-1.5 rounded-input border border-border px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : icon}
      {copied ? 'Copied' : label}
    </button>
  )
}

function CallList({
  calls,
  selectedId,
  onSelect,
}: {
  calls: ApiCall[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="w-[44%] max-w-sm shrink-0 overflow-y-auto border-r border-border">
      {calls.length === 0 ? (
        <p className="px-4 py-6 font-mono text-xs text-muted-foreground">
          No calls match this filter.
        </p>
      ) : (
        <ul>
          {calls.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/50',
                  selectedId === c.id && 'bg-muted/60',
                )}
              >
                <MethodChip method={c.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                  {c.path}
                </span>
                {c.illustrative ? (
                  <span
                    className="shrink-0 rounded-tag border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
                    title="Illustrative — the request that would be sent. PV APIs are not live yet."
                  >
                    illustrative
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        statusClass(c.status ?? 0),
                      )}
                    >
                      {c.status}
                    </span>
                    <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {c.latencyMs}ms
                    </span>
                  </>
                )}
                <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                  {formatTime(c.timestamp)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CallDetail({ call }: { call: ApiCall | null }) {
  if (!call) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground">
          Select a call to inspect its request and response.
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-4">
      {/* Request */}
      <DetailSection title="Request">
        <div className="flex items-center gap-2">
          <MethodChip method={call.method} />
          <code className="break-all font-mono text-[13px] text-foreground">
            {call.path}
          </code>
        </div>
        <div className="mt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Headers
          </p>
          <pre className="overflow-x-auto rounded-input border border-border bg-muted/40 p-2.5 font-mono text-[12px] leading-relaxed text-foreground">
            {Object.entries(call.requestHeaders)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}
          </pre>
        </div>
        {call.requestBody !== undefined && (
          <div className="mt-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Body
            </p>
            <pre className="overflow-x-auto rounded-input border border-border bg-muted/40 p-2.5 font-mono text-[12px] leading-relaxed text-foreground">
              {JSON.stringify(
                isUploadCall(call)
                  ? displayUploadBody(call.requestBody)
                  : call.requestBody,
                null,
                2,
              )}
            </pre>
          </div>
        )}
      </DetailSection>

      {/* Response — only for live calls. Illustrative entries get an honest
          placeholder instead of a fabricated status/body. */}
      <DetailSection title="Response">
        {call.illustrative ? (
          <p className="rounded-input border border-dashed border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-muted-foreground">
            No live response. This request was not sent — wire up the PV API to
            see a real status and body here.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  statusClass(call.status ?? 0),
                )}
              >
                {call.status}
              </span>
              <span className="text-muted-foreground">
                · {call.latencyMs}ms · {formatTime(call.timestamp)}
              </span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-input border border-border bg-muted/40 p-2.5 font-mono text-[12px] leading-relaxed text-foreground">
              {JSON.stringify(call.responseBody, null, 2)}
            </pre>
            {responseDownloadUrl(call.responseBody) && (
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                Signed URL — expires 15 min after issue.
              </p>
            )}
          </>
        )}
      </DetailSection>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}
