'use client'

// LIVE AUDIT DASHBOARD — a near-real-time preview of what the API captures on
// every call, scoped to the current project + environment.
//
// MOCK: events are synthesized on the client every few seconds to simulate a
// live feed. SWAP POINT: in production this reads from an asynchronous,
// append-only audit stream (canonical-log-line style) — polled on an interval
// or pushed over SSE/WebSocket. Replace `synthesizeEvent` + the interval with
// a subscription to that stream; the table/drawer rendering stays the same.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, Radio, FileDown, Archive } from 'lucide-react'
import { environmentLabel } from '@/lib/environments'
import { useSession } from '@/lib/session-context'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'

type Verb = 'Store' | 'Attach' | 'Find' | 'Get'
type ActorKind = 'developer-key' | 'agent'

type AuditEvent = {
  id: string
  ts: number // epoch ms
  verb: Verb
  method: 'GET' | 'POST'
  endpoint: string
  actorKind: ActorKind
  actor: string
  status: number
  latencyMs: number
  resourceId: string
  scopes: string[]
}

const WINDOWS = [
  { key: '1h', label: 'Last 1 hour', ms: 60 * 60 * 1000 },
  { key: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
] as const

type WindowKey = (typeof WINDOWS)[number]['key']

// API-shaped templates per verb. Endpoints/methods are fixed; ids vary.
const VERB_SHAPES: Record<
  Verb,
  { method: 'GET' | 'POST'; endpoint: string; idPrefix: string; scope: string }
> = {
  Store: { method: 'POST', endpoint: 'POST /patient', idPrefix: 'pat', scope: 'patient:write' },
  Attach: { method: 'POST', endpoint: 'POST /attachment', idPrefix: 'att', scope: 'attachment:write' },
  Find: { method: 'POST', endpoint: 'POST /find', idPrefix: 'qry', scope: 'patient:read' },
  Get: { method: 'GET', endpoint: 'GET /patient/{id}', idPrefix: 'pat', scope: 'patient:read' },
}

const AGENTS = ['agent:claude', 'agent:chatgpt', 'agent:cursor']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randHex(len: number): string {
  let s = ''
  const chars = '0123456789abcdef'
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

let SEQ = 0

// Synthesize a single plausible audit event at time `ts` for the given project.
function synthesizeEvent(ts: number, project: string): AuditEvent {
  const verb = pick<Verb>(['Find', 'Get', 'Store', 'Attach', 'Find', 'Get'])
  const shape = VERB_SHAPES[verb]

  // Mostly 200s, occasional 4xx, rare 5xx.
  const roll = Math.random()
  let status = 200
  if (roll > 0.97) status = pick([500, 502])
  else if (roll > 0.85) status = pick([400, 401, 403, 422, 404])

  const actorKind: ActorKind = Math.random() > 0.5 ? 'agent' : 'developer-key'
  const actor =
    actorKind === 'agent' ? pick(AGENTS) : `key:pv_sk_…${randHex(4)}`

  // Find returns a query id; others reference a resource id.
  const resourceId = `${shape.idPrefix}_${randHex(8)}`

  return {
    id: `evt_${randHex(10)}_${SEQ++}`,
    ts,
    verb,
    method: shape.method,
    endpoint: shape.endpoint,
    actorKind,
    actor,
    status,
    latencyMs:
      verb === 'Find'
        ? 40 + Math.floor(Math.random() * 180)
        : 8 + Math.floor(Math.random() * 70),
    resourceId,
    scopes: [shape.scope, 'project:scoped'],
  }
}

function statusTone(status: number) {
  if (status < 300)
    return 'border-success/40 bg-success/10 text-success'
  if (status < 500)
    return 'border-warning/40 bg-warning/10 text-warning'
  return 'border-destructive/40 bg-destructive/10 text-destructive'
}

function fmtClock(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const PAGE_SIZE = 12

export function AuditDashboard() {
  const { session } = useSession()
  const project = session.currentProjectId
  const env = session.currentEnv

  const [windowKey, setWindowKey] = useState<WindowKey>('1h')
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  const newestIdRef = useRef<string | null>(null)

  const windowMs = WINDOWS.find((w) => w.key === windowKey)!.ms

  // Seed a backlog spread across the current window, then reset whenever the
  // project/env/window changes (the audit feed is scoped to project +
  // environment).
  useEffect(() => {
    const now = Date.now()
    const seeded: AuditEvent[] = []
    for (let i = 0; i < PAGE_SIZE * 2; i++) {
      // spread the backlog over the first ~80% of the window
      const ts = now - Math.floor((windowMs * 0.8 * (i + 1)) / (PAGE_SIZE * 2))
      seeded.push(synthesizeEvent(ts, project))
    }
    seeded.sort((a, b) => b.ts - a.ts)
    setEvents(seeded)
    setVisible(PAGE_SIZE)
    newestIdRef.current = seeded[0]?.id ?? null
  }, [project, env, windowMs])

  // Live stream: prepend a fresh event every few seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      const ev = synthesizeEvent(Date.now(), project)
      newestIdRef.current = ev.id
      setEvents((prev) => [ev, ...prev].slice(0, 400))
    }, 3500)
    return () => clearInterval(interval)
  }, [project, env])

  const loadOlder = useCallback(() => {
    setVisible((v) => v + PAGE_SIZE)
  }, [])

  // Only show events inside the active window, newest first.
  const now = Date.now()
  const windowed = events.filter((e) => now - e.ts <= windowMs)
  const shown = windowed.slice(0, visible)
  const hasOlder = windowed.length > visible

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center rounded-button border border-border bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Audit time window"
        >
          {WINDOWS.map((w) => {
            const active = w.key === windowKey
            return (
              <button
                key={w.key}
                role="tab"
                aria-selected={active}
                onClick={() => setWindowKey(w.key)}
                className={
                  active
                    ? 'rounded-[8px] bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm'
                    : 'rounded-[8px] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
                }
              >
                {w.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {env} · {project}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-tag border border-accent/40 bg-accent/10 px-2 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              live
            </span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Radio className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            audit stream · append-only
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">timestamp</th>
                <th className="px-4 py-2 font-medium">verb</th>
                <th className="px-4 py-2 font-medium">endpoint</th>
                <th className="px-4 py-2 font-medium">actor</th>
                <th className="px-4 py-2 font-medium">project</th>
                <th className="px-4 py-2 font-medium">status</th>
                <th className="px-4 py-2 text-right font-medium">latency</th>
                <th className="px-4 py-2 font-medium">resource id</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const isNewest = e.id === newestIdRef.current
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`cursor-pointer border-b border-border/60 text-[13px] text-foreground transition-colors last:border-0 hover:bg-muted/40 ${
                      isNewest ? 'animate-in fade-in slide-in-from-top-1 duration-300' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted-foreground">
                      {fmtClock(e.ts)}
                    </td>
                    <td className="px-4 py-2">{e.verb}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-foreground">
                      {e.endpoint}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className="font-mono text-[12px] text-foreground">
                        {e.actor}
                      </span>
                      <span className="ml-1.5 rounded-tag bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                        {e.actorKind === 'agent' ? 'agent' : 'key'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-accent">
                      {project}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-tag border px-1.5 py-0.5 font-mono text-[11px] ${statusTone(
                          e.status,
                        )}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {e.latencyMs}ms
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-accent">
                      {e.resourceId}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {windowed.length} events in window
          </span>
          {hasOlder ? (
            <Button variant="outline" size="sm" onClick={loadOlder}>
              Load older
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Start of window
            </span>
          )}
        </div>
      </div>

      {/* Compliance tier */}
      <div className="rounded-card border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-input border border-border bg-background">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-foreground">
              Full audit history — 6-year retention &amp; export
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">
              The 1-hour and 24-hour windows above are a free live preview.
              HIPAA-defensible retention and export are part of the Compliance
              tier — enable it to keep the complete append-only history and pull
              it on demand. Pricing lives in Settings → billing.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <FileDown className="h-4 w-4" data-icon="inline-start" />
                Export audit log
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Archive className="h-4 w-4" data-icon="inline-start" />
                Extend retention to 6 years
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                compliance tier
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer — metadata only, no PHI payloads. */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.verb} · ${selected.resourceId}` : 'Audit entry'}
      >
        {selected && (
          <div className="flex flex-col gap-6 px-5 py-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] text-accent">
                  {selected.id}
                </span>
                <span
                  className={`ml-auto inline-flex rounded-tag border px-1.5 py-0.5 font-mono text-[11px] ${statusTone(
                    selected.status,
                  )}`}
                >
                  {selected.status}
                </span>
              </div>
              <div className="rounded-input border border-border bg-muted/50 px-3 py-2">
                <code className="font-mono text-[13px] text-foreground">
                  {selected.endpoint}
                </code>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                Audit entries are append-only — they record that a call
                happened, never the patient data involved. Metadata only; no PHI
                payloads are ever stored here.
              </p>
            </div>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Entry
              </h3>
              <div className="divide-y divide-border">
                <DetailRow label="Timestamp">
                  <span className="font-mono text-[13px]">
                    {new Date(selected.ts).toISOString()}
                  </span>
                </DetailRow>
                <DetailRow label="Verb">{selected.verb}</DetailRow>
                <DetailRow label="Method">
                  <span className="font-mono text-[13px]">{selected.method}</span>
                </DetailRow>
                <DetailRow label="Status">
                  <span className="font-mono text-[13px]">{selected.status}</span>
                </DetailRow>
                <DetailRow label="Latency">
                  <span className="font-mono text-[13px]">
                    {selected.latencyMs}ms
                  </span>
                </DetailRow>
                <DetailRow label="Resource id">
                  <span className="font-mono text-[13px] text-accent">
                    {selected.resourceId}
                  </span>
                </DetailRow>
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Actor &amp; project
              </h3>
              <div className="divide-y divide-border">
                <DetailRow label="Actor">
                  <span className="font-mono text-[13px]">{selected.actor}</span>
                </DetailRow>
                <DetailRow label="Actor type">
                  {selected.actorKind === 'agent'
                    ? 'Agent (OAuth token)'
                    : 'Developer key'}
                </DetailRow>
                <DetailRow label="Project">
                  <span className="font-mono text-[13px] text-accent">
                    {project}
                  </span>
                </DetailRow>
                <DetailRow label="Environment">
                  <span className="font-mono text-[13px]">
                    {environmentLabel(env)}
                  </span>
                </DetailRow>
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Request shape
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Field names only — values are never captured.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.scopes.map((s) => (
                  <span
                    key={s}
                    className="rounded-tag border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm text-foreground">
        {children}
      </span>
    </div>
  )
}
