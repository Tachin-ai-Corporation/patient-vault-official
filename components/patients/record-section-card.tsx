'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

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
}

export function RecordSectionCard({
  title,
  summary,
  children,
  action,
  defaultOpen = false,
}: RecordSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-card border border-border bg-card">
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
        <div className="border-t border-border px-4 py-4">{children}</div>
      )}
    </section>
  )
}
