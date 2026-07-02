'use client'

import { Users, FileText, Activity } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { collectAttachments } from '@/lib/patient-data'

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl tabular-nums text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// Aggregated, vault-scoped numbers. These are derived from the live in-session
// data so the headline counts are real; richer time-series analytics are a
// placeholder until wired. SWAP POINT: real aggregates come from the analytics
// service rather than the in-memory store.
export function AnalyticsSummary() {
  const { session, currentProject, patients } = useSession()
  const documentCount = collectAttachments(patients).length
  const pct = Math.min(
    100,
    Math.round((currentProject.patientCount / session.freeCeiling) * 100),
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat
        icon={Users}
        label="patients"
        value={currentProject.patientCount.toLocaleString()}
        sub={`${pct}% of ${session.freeCeiling.toLocaleString()} ceiling`}
      />
      <Stat
        icon={FileText}
        label="documents"
        value={documentCount.toLocaleString()}
        sub="across all patients in this vault"
      />
      <Stat
        icon={Activity}
        label="environment"
        value={session.currentEnv}
        sub="active environment for this vault"
      />
    </div>
  )
}
