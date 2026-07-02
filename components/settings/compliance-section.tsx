'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  AlertTriangle,
  Minus,
  ExternalLink,
  FileArchive,
  Loader2,
} from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'

type PostureState = 'done' | 'action' | 'na'

type ChecklistItem = {
  id: string
  label: string
  detail: string
  state: PostureState
  // Optional link rendered alongside the item (e.g. /baa, audit view).
  link?: { href: string; label: string; external?: boolean }
}

function StateChip({ state }: { state: PostureState }) {
  if (state === 'done') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-tag border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
        <Check className="h-3 w-3" />
        Done
      </span>
    )
  }
  if (state === 'action') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-tag border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
        <AlertTriangle className="h-3 w-3" />
        Action needed
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-tag border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      Not applicable
    </span>
  )
}

// Date-range options for the evidence packet. Default is the last 30 days.
const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
]

type PacketState = 'idle' | 'generating' | 'ready'

// Static policy statements — exact wording, environment-aware. These are
// informational policy text only: no deletion controls, timers, or durations.
const RETENTION_STATEMENTS = {
  staging: [
    'Staging vaults are for synthetic data only — no PHI is ever permitted in staging.',
    'A staging vault with no API or console activity for 30 days is deleted, after advance notice.',
  ],
  production: [
    'Production data is retained until you request deletion or terminate your account. Patient Vault does not delete production data on a timer.',
    'On deletion or termination, Patient Vault returns or destroys production data per your BAA, subject to applicable HIPAA and state medical-record retention requirements.',
    'A patient cannot be hard-deleted while another vault or entity holds an active reference to that record. Such records are tombstoned, not removed, until all references are released.',
  ],
} as const

export function ComplianceSection() {
  const { session, currentProject, isProductionActivated } = useSession()
  const { currentEnv } = session

  // SWAP POINT: in production, posture state is derived from real server-side
  // signals (BAA execution record, infra attestations, audit pipeline health,
  // key issuance policy). Here, items that have a real session signal read it
  // (BAA + Developer Agreement track production activation); the rest are
  // static attestations reflecting how Patient Vault is built.
  const items = useMemo<ChecklistItem[]>(() => {
    const productionGate: PostureState = isProductionActivated
      ? 'done'
      : 'action'
    const productionGateDetail = isProductionActivated
      ? 'Executed for this project at production activation.'
      : 'Required before production. Executed at the go-live checkpoint.'

    return [
      {
        id: 'baa',
        label: 'BAA executed',
        detail: productionGateDetail,
        state: productionGate,
        link: { href: '/baa', label: 'View BAA' },
      },
      {
        id: 'env-separation',
        label: 'Environment separation',
        detail:
          'Staging and production are isolated — synthetic data never carries over to production.',
        state: 'done',
      },
      {
        id: 'audit-logging',
        label: 'Audit logging active',
        detail:
          'Every Store, Attach, Find, and Get is logged to an append-only audit stream.',
        state: 'done',
        link: { href: '/agent-access', label: 'View audit log' },
      },
      {
        id: 'keys-server-side',
        label: 'Keys server-side only',
        detail:
          'Patient Vault issues secret keys only — there is no client-side or publishable key.',
        state: 'done',
      },
      {
        id: 'encryption',
        label: 'Encryption in transit and at rest',
        detail:
          'All connections use TLS; stored data is encrypted at rest.',
        state: 'done',
      },
      {
        id: 'no-phi-staging',
        label: 'No PHI in staging',
        detail:
          'Staging permits synthetic data only — never real protected health information.',
        state: 'done',
      },
      {
        id: 'developer-agreement',
        label: 'Developer Agreement signed',
        detail: productionGateDetail,
        state: productionGate,
      },
      {
        id: 'data-retention',
        label: 'Data retention policy — Active',
        detail:
          'A documented retention policy governs how staging and production data are kept and released.',
        state: 'done',
      },
    ]
  }, [isProductionActivated])

  const total = items.length
  const completeCount = items.filter((i) => i.state === 'done').length

  // ---- evidence packet (mock) ----
  const [range, setRange] = useState('30')
  const [packet, setPacket] = useState<PacketState>('idle')

  function handleGenerate() {
    // MOCK — no real file is produced. SWAP POINT: in production this bundles
    // the real audit log for the selected range + posture attestations + the
    // executed BAA into a downloadable, tamper-evident archive (server-side).
    setPacket('generating')
    setTimeout(() => setPacket('ready'), 1400)
  }

  function handleRangeChange(value: string) {
    setRange(value)
    // Re-generation is required if the range changes after a packet was built.
    if (packet === 'ready') setPacket('idle')
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
        05 · compliance
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        Compliance
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
        Your posture for {currentProject.name}. These items reflect how Patient
        Vault is built and what this project has completed — share the
        evidence packet for a security review or procurement.
      </p>

      {/* Summary line */}
      <p className="mt-4 text-sm text-foreground">
        <span className="font-mono tabular-nums text-foreground">
          {completeCount}
        </span>{' '}
        of{' '}
        <span className="font-mono tabular-nums text-foreground">{total}</span>{' '}
        items complete for{' '}
        <span className="font-mono text-accent">{currentEnv}</span>.
      </p>

      {/* Checklist */}
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 bg-background px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                {item.detail}
              </p>
              {item.link && (
                <Link
                  href={item.link.href}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-4 hover:underline"
                >
                  {item.link.label}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <StateChip state={item.state} />
          </li>
        ))}
      </ul>

      {/* Data retention — static, environment-aware policy statements */}
      <div className="mt-5 rounded-card border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Data retention</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {(RETENTION_STATEMENTS[currentEnv] ?? RETENTION_STATEMENTS.staging).map(
            (statement) => (
              <li
                key={statement}
                className="text-sm leading-relaxed text-muted-foreground text-pretty"
              >
                {statement}
              </li>
            ),
          )}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
          Full terms are in the Developer Agreement and{' '}
          <Link
            href="/baa"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            BAA
          </Link>
          .
        </p>
      </div>

      {/* Evidence / audit packet */}
      <div className="mt-5 rounded-card border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">
          Evidence packet
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Generate a compliance evidence packet — audit log for the selected
          range, posture attestations, and the executed BAA — for a security
          review or procurement.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="packet-range"
              className="text-xs font-medium text-muted-foreground"
            >
              Date range
            </label>
            <select
              id="packet-range"
              value={range}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="h-9 rounded-button border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={packet === 'generating'}
            className="bg-primary text-primary-foreground"
          >
            {packet === 'generating' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
                Generating…
              </>
            ) : (
              <>
                <FileArchive className="h-4 w-4" data-icon="inline-start" />
                Download audit packet
              </>
            )}
          </Button>

          {packet === 'ready' && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <Check className="h-4 w-4" />
              Packet ready
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
