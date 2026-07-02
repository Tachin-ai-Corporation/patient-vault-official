'use client'

import { useMemo, useState } from 'react'
import { GitMerge } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { MergeDialog } from '@/components/find/merge-dialog'
import { patientFullName, type Patient } from '@/lib/patient-data'
import type { FindResult } from '@/lib/find-search'

type PatientMergeDialogProps = {
  open: boolean
  // The patient this record page is showing — always pre-selected and the
  // default survivor.
  patient: Patient
  // Other patients in the project that can be merged with it.
  candidates: Patient[]
  onClose: () => void
  // Navigate to the survivor's record page after a confirmed merge.
  onMerged: (survivorId: string) => void
}

export function PatientMergeDialog({
  open,
  patient,
  candidates,
  onClose,
  onMerged,
}: PatientMergeDialogProps) {
  const [filter, setFilter] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // Snapshot handed to the reused MergeDialog once the developer continues.
  const [snapshot, setSnapshot] = useState<FindResult[] | null>(null)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (p) =>
        patientFullName(p).toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    )
  }, [candidates, filter])

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleContinue() {
    const others = candidates.filter((p) => picked.has(p.id))
    if (others.length === 0) return
    // Build the FindResult[] the merge flow expects. The current patient gets
    // the top score so it defaults to survivor (pre-selected).
    const results: FindResult[] = [
      { patient, score: 1 },
      ...others.map((p) => ({ patient: p, score: 0.9 })),
    ]
    setSnapshot(results)
  }

  function reset() {
    setFilter('')
    setPicked(new Set())
    setSnapshot(null)
  }

  // Once a snapshot exists, hand off to the shared MergeDialog (same flow as Find).
  if (snapshot && snapshot.length >= 2) {
    return (
      <MergeDialog
        open={open}
        selected={snapshot}
        onCancel={() => {
          reset()
          onClose()
        }}
        onView={(survivorId) => {
          reset()
          onMerged(survivorId)
        }}
      />
    )
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Merge records"
      description="Select the duplicate records to consolidate with this patient. This patient is pre-selected and defaults to the survivor."
      className="max-w-lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={picked.size === 0}
            className="bg-primary text-primary-foreground"
          >
            <GitMerge className="h-4 w-4" data-icon="inline-start" />
            Continue
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Pre-selected patient (locked) */}
        <div className="flex items-center justify-between gap-3 rounded-card border border-primary bg-primary/5 p-3">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {patientFullName(patient)}
            </span>
            <span className="block font-mono text-[13px] text-accent">
              {patient.id}
            </span>
          </div>
          <span className="shrink-0 rounded-tag bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            This record
          </span>
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground text-pretty">
            No other records in this project to merge with.
          </p>
        ) : (
          <>
            <Field label="Find duplicates" htmlFor="merge-filter">
              <TextInput
                id="merge-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by name or id"
              />
            </Field>
            <div className="max-h-64 overflow-y-auto rounded-card border border-border">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No matching records.
                </p>
              ) : (
                filtered.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={picked.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                      aria-label={`Select ${patientFullName(p)} to merge`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {patientFullName(p)}
                      </span>
                      <span className="block font-mono text-[13px] text-muted-foreground">
                        {p.id} · {p.date_of_birth}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
