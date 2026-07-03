'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import type { DeceasedInput } from '@/lib/api/patient'

// Standard NCHS "manner of death" classifications, plus an unset option.
const MANNER_OPTIONS = [
  '',
  'natural',
  'accident',
  'suicide',
  'homicide',
  'pending',
  'undetermined',
] as const

type DeceasedDraft = {
  deceasedDate: string
  deceasedTime: string
  manner: string
  cause: string
  placeOfDeath: string
  notes: string
}

const EMPTY: DeceasedDraft = {
  deceasedDate: '',
  deceasedTime: '',
  manner: '',
  cause: '',
  placeOfDeath: '',
  notes: '',
}

type DeceasedModalProps = {
  open: boolean
  // When provided, the modal edits the existing death record (PATCH); otherwise
  // it marks the patient deceased for the first time (POST).
  initial?: Partial<DeceasedInput> | null
  onClose: () => void
  onSave: (body: DeceasedInput) => void
}

export function DeceasedModal({
  open,
  initial = null,
  onClose,
  onSave,
}: DeceasedModalProps) {
  const isEdit = initial != null
  const [draft, setDraft] = useState<DeceasedDraft>(EMPTY)

  useEffect(() => {
    if (!open) return
    setDraft(
      initial
        ? {
            deceasedDate: initial.deceasedDate ?? '',
            deceasedTime: initial.deceasedTime ?? '',
            manner: initial.manner ?? '',
            cause: initial.cause ?? '',
            placeOfDeath: initial.placeOfDeath ?? '',
            notes: initial.notes ?? '',
          }
        : EMPTY,
    )
  }, [open, initial])

  function handleSubmit() {
    // Only send filled optional fields; deceasedDate is the one required field.
    const body: DeceasedInput = { deceasedDate: draft.deceasedDate }
    if (draft.deceasedTime) body.deceasedTime = draft.deceasedTime
    if (draft.manner) body.manner = draft.manner
    if (draft.cause) body.cause = draft.cause
    if (draft.placeOfDeath) body.placeOfDeath = draft.placeOfDeath
    if (draft.notes) body.notes = draft.notes
    onSave(body)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit death record' : 'Mark deceased'}
      description="Date of death is required and cannot be in the future or before the date of birth."
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!draft.deceasedDate}
            className="bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4" data-icon="inline-start" />
            {isEdit ? 'Save record' : 'Mark deceased'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of death" htmlFor="dc-date">
          <TextInput
            id="dc-date"
            type="date"
            value={draft.deceasedDate}
            onChange={(e) =>
              setDraft({ ...draft, deceasedDate: e.target.value })
            }
            invalid={!draft.deceasedDate}
          />
        </Field>
        <Field label="Time of death" htmlFor="dc-time">
          <TextInput
            id="dc-time"
            type="time"
            value={draft.deceasedTime}
            onChange={(e) =>
              setDraft({ ...draft, deceasedTime: e.target.value })
            }
          />
        </Field>
        <Field label="Manner" htmlFor="dc-manner">
          <Select
            id="dc-manner"
            value={draft.manner}
            onChange={(e) => setDraft({ ...draft, manner: e.target.value })}
          >
            {MANNER_OPTIONS.map((o) => (
              <option key={o || 'none'} value={o}>
                {o || '—'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Place of death" htmlFor="dc-place">
          <TextInput
            id="dc-place"
            value={draft.placeOfDeath}
            onChange={(e) =>
              setDraft({ ...draft, placeOfDeath: e.target.value })
            }
            placeholder="Hospital, city"
          />
        </Field>
        <Field label="Cause" htmlFor="dc-cause" className="col-span-2">
          <TextInput
            id="dc-cause"
            value={draft.cause}
            onChange={(e) => setDraft({ ...draft, cause: e.target.value })}
            placeholder="Immediate cause of death"
          />
        </Field>
        <Field label="Notes" htmlFor="dc-notes" className="col-span-2">
          <textarea
            id="dc-notes"
            rows={3}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Additional context"
            className="w-full rounded-input border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-aqua/60"
          />
        </Field>
      </div>
    </Modal>
  )
}
