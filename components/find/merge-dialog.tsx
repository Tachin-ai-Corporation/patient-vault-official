'use client'

import { useMemo, useState } from 'react'
import { GitMerge, ShieldCheck } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { formatScore, type FindResult } from '@/lib/find-search'
import { patientFullName } from '@/lib/patient-data'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

type MergeDialogProps = {
  open: boolean
  // Snapshot of the selected result rows (patient + score) at the time the
  // merge action was invoked. Always 2 or more.
  selected: FindResult[]
  onCancel: () => void
  // Fired after a confirmed merge when the developer chooses to view the
  // consolidated record. The parent resolves the id against the live patient
  // list and opens it in the shared detail drawer.
  onView: (survivorId: string) => void
}

export function MergeDialog({
  open,
  selected,
  onCancel,
  onView,
}: MergeDialogProps) {
  const { mergePatients } = useSession()

  // Default survivor = the highest-score row. The developer can override:
  // the score informs, the human decides.
  const defaultSurvivorId = useMemo(() => {
    if (selected.length === 0) return ''
    return selected.reduce((best, r) => (r.score > best.score ? r : best))
      .patient.id
  }, [selected])

  const [survivorId, setSurvivorId] = useState(defaultSurvivorId)
  const [phase, setPhase] = useState<'review' | 'done'>('review')

  // Re-seed the survivor default whenever a fresh selection opens the dialog.
  const [seededFor, setSeededFor] = useState(defaultSurvivorId)
  if (open && seededFor !== defaultSurvivorId) {
    setSeededFor(defaultSurvivorId)
    setSurvivorId(defaultSurvivorId)
    setPhase('review')
  }

  const survivor =
    selected.find((r) => r.patient.id === survivorId)?.patient ?? null
  const mergedAway = selected.filter((r) => r.patient.id !== survivorId)

  if (!open || !survivor) return null

  function handleMerge() {
    mergePatients(
      survivorId,
      mergedAway.map((r) => r.patient.id),
    )
    setPhase('done')
  }

  const survivorName = patientFullName(survivor)

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={phase === 'review' ? 'Merge records' : 'Records merged'}
      description={
        phase === 'review'
          ? 'Consolidate these records into one canonical patient.'
          : undefined
      }
      className="max-w-2xl"
      footer={
        phase === 'review' ? (
          <>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              className="bg-primary text-primary-foreground"
            >
              <GitMerge className="h-4 w-4" data-icon="inline-start" />
              Merge records
            </Button>
          </>
        ) : (
          <>
            <span className="font-mono text-xs text-muted-foreground">
              {mergedAway.length} redirect{mergedAway.length === 1 ? '' : 's'}{' '}
              installed
            </span>
            <Button
              onClick={() => onView(survivor.id)}
              className="bg-primary text-primary-foreground"
            >
              Open {survivorName}
            </Button>
          </>
        )
      }
    >
      {phase === 'review' ? (
        <div className="flex flex-col gap-5">
          {/* Side-by-side record comparison */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {selected.map(({ patient: p, score }) => {
              const isSurvivor = p.id === survivorId
              return (
                <label
                  key={p.id}
                  className={`flex min-w-[220px] flex-1 cursor-pointer flex-col gap-3 rounded-card border p-4 transition-colors ${
                    isSurvivor
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="survivor"
                        checked={isSurvivor}
                        onChange={() => setSurvivorId(p.id)}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <span className="text-xs font-medium text-foreground">
                        {isSurvivor ? 'Survivor' : 'Make survivor'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatScore(score)}
                    </span>
                  </div>

                  <div>
                    <div className="font-medium text-foreground">
                      {patientFullName(p)}
                    </div>
                    <div className="font-mono text-[13px] text-accent">
                      {p.id}
                    </div>
                  </div>

                  <dl className="flex flex-col gap-1 text-sm">
                    <FieldRow label="date_of_birth">
                      <span className="font-mono text-[13px]">
                        {p.date_of_birth}
                      </span>
                    </FieldRow>
                    <FieldRow label="sex_at_birth">{p.sex_at_birth}</FieldRow>
                    <FieldRow label="contacts">{p.contacts.length}</FieldRow>
                    <FieldRow label="addresses">{p.addresses.length}</FieldRow>
                    <FieldRow label="attachments">
                      {p.attachment_count}
                    </FieldRow>
                  </dl>
                </label>
              )
            })}
          </div>

          {/* What happens — updates with the survivor choice */}
          <div className="rounded-card border border-border bg-muted/40 p-4">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              what happens
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-foreground">
              <li>
                <span className="font-medium">{survivorName}</span> (
                <span className="font-mono text-[13px] text-accent">
                  {survivor.id}
                </span>
                ) becomes the canonical record.
              </li>
              <li>
                The other {mergedAway.length} record
                {mergedAway.length === 1 ? '' : 's'} become permanent redirects
                (HTTP 308) to{' '}
                <span className="font-mono text-[13px] text-accent">
                  {survivor.id}
                </span>{' '}
                — their ids keep resolving.
              </li>
              <li>
                Contacts, addresses, and attachments from the merged record
                {mergedAway.length === 1 ? '' : 's'} move to the survivor.
              </li>
              <li>
                The merged record{mergedAway.length === 1 ? '' : 's'}&apos; names
                are preserved as aliases on the survivor.
              </li>
            </ul>
          </div>

          {/* Human-review framing */}
          <div className="flex items-start gap-2.5 rounded-card border border-border bg-card p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Merging is permanent and human-reviewed. Confirm only if these
              records are the same patient.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            <span className="font-medium text-foreground">{survivorName}</span>{' '}
            is now the canonical record. The merged ids resolve to it
            permanently:
          </p>

          {/* Mono result snippet — the API truth */}
          <pre className="overflow-x-auto rounded-card border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed text-foreground">
            {mergedAway.map((r) => (
              <div key={r.patient.id}>
                <span className="text-muted-foreground">GET</span> /patient/
                {r.patient.id}
                {'  '}
                <span className="text-accent">→ 308</span> Location: /patient/
                {survivor.id}
              </div>
            ))}
          </pre>

          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            Contacts, addresses, and attachments were moved to the survivor, and
            the merged name{mergedAway.length === 1 ? '' : 's'} {''}
            {mergedAway.length === 1 ? 'is' : 'are'} kept as alias
            {mergedAway.length === 1 ? '' : 'es'}.
          </p>
        </div>
      )}
    </Modal>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{children}</dd>
    </div>
  )
}
