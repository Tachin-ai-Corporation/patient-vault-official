'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  // Portals require the DOM; only render after mount to stay SSR-safe.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  // Rendered through a portal to <body> so the fixed overlay can never be
  // trapped by an ancestor that establishes a containing block (e.g. a
  // transformed or backdrop-filtered parent).
  return createPortal(
    // Scrollable overlay: when the dialog is taller than the viewport the
    // whole overlay scrolls, so the top of the dialog always stays reachable.
    // `min-h-full` keeps it centered when the content is short. This avoids the
    // flexbox centering + overflow bug that clips the top off-screen.
    // Outside-click closes the dialog. The click handler lives on the
    // scroll/centering container (which covers the whole overlay and sits above
    // the decorative backdrop), and the dialog itself stops propagation — so
    // any click that isn't inside the dialog bubbles up here and closes it.
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div
        className="fixed inset-0 bg-[#10151c]/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="relative flex min-h-full items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-card shadow-2xl',
          'duration-200 ease-[var(--ease-fluid)] animate-in fade-in-0 zoom-in-95',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-card-foreground text-balance">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
      </div>
    </div>,
    document.body,
  )
}
