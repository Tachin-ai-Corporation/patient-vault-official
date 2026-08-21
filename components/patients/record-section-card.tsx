'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { PatientCustomFields } from '@/components/patients/patient-custom-fields'
import { CUSTOM_FIELD_SECTIONS } from '@/lib/api/custom-fields'

type RecordSectionCardProps = {
  // Section name, rendered mono/uppercase to match the design system.
  title: string
  // One-line primary summary shown while collapsed (the calm default).
  summary: ReactNode
  // Full detail, revealed when expanded.
  children: ReactNode
  // Optional header-right action (e.g. "Add contact" / "Edit"). Always visible
  // so empty sections still expose their add affordance without expanding.
  action?: ReactNode
  // Collapsed by default each visit — nothing is persisted.
  defaultOpen?: boolean
  patientId?: string
  customFieldSection?: string
  // For record-scoped sections (e.g. documents), the BO instance id that owns
  // the custom values. Omitted for patient-scoped sections.
  customFieldInstanceId?: string | number
}

export function RecordSectionCard({
  title,
  summary,
  children,
  action,
  defaultOpen = false,
  patientId,
  customFieldSection,
}: RecordSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const sectionId = customFieldSection ? `custom-fields-${customFieldSection}` : undefined
  // Record-scoped sections (e.g. documents) own custom values per sub-record,
  // so their fields live inside each record's detail UI — not this shared
  // section-level slot. Only render the slot for patient-scoped sections.
  const sectionMeta = customFieldSection ? CUSTOM_FIELD_SECTIONS.find((item) => item.key === customFieldSection) : undefined
  const showSharedCustomFields = Boolean(patientId && customFieldSection && sectionMeta?.scope !== 'record')

  useEffect(() => {
    if (!sectionId || window.location.hash !== `#${sectionId}`) return
    setOpen(true)
    window.requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [sectionId])

  return (
    <section id={sectionId} className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? 'rotate-90' : ''
            }`}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            {!open && (
              <span className="truncate text-sm text-foreground">{summary}</span>
            )}
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {open && (
        <div className="border-t border-border px-4 py-4">
          {children}
          {showSharedCustomFields && (
            <PatientCustomFields patientId={patientId!} sectionKey={customFieldSection!} />
          )}
        </div>
      )}
    </section>
  )
}
