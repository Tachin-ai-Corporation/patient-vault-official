'use client'

import { useState } from 'react'
import { Code2, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { probeAttachEndpoint } from '@/lib/api/documents'

// ---- Endpoint matrix data --------------------------------------------------

type Scope = 'collection' | 'item'
type ProbeMethod = 'PUT' | 'PATCH' | 'POST' | 'DELETE'

interface SupportedRow {
  method: string
  scope: Scope
  summary: string
}

interface RejectedRow {
  method: ProbeMethod
  scope: Scope
  reason: string
}

// Endpoints the attachment resource supports. Informational only.
const SUPPORTED: SupportedRow[] = [
  { method: 'POST', scope: 'collection', summary: 'create, not idempotent' },
  { method: 'GET', scope: 'collection', summary: 'list, idempotent' },
  { method: 'GET', scope: 'item', summary: 'retrieve, idempotent' },
  { method: 'DELETE', scope: 'item', summary: 'soft-delete, idempotent' },
]

// Methods that return 405 by design. Each is sendable so the live 405 shows
// up in the API Inspector exactly as an integrator's backend would see it.
const REJECTED: RejectedRow[] = [
  {
    method: 'PUT',
    scope: 'collection',
    reason: 'collections are append-only',
  },
  {
    method: 'PATCH',
    scope: 'collection',
    reason: 'collections are append-only',
  },
  {
    method: 'DELETE',
    scope: 'collection',
    reason: 'no mass-delete',
  },
  {
    method: 'PUT',
    scope: 'item',
    reason: 'uploaded files are immutable (re-attach via POST for a new version)',
  },
  {
    method: 'PATCH',
    scope: 'item',
    reason: 'uploaded files are immutable (re-attach via POST for a new version)',
  },
  {
    method: 'POST',
    scope: 'item',
    reason: 'uploaded files are immutable (re-attach via POST for a new version)',
  },
]

// Display-only path template for a scope.
function pathFor(scope: Scope): string {
  return scope === 'collection'
    ? '/patient/{id}/attach'
    : '/patient/{id}/attach/{documentId}'
}

// Tailwind color hint per method, kept subtle and within the token palette.
function methodClass(method: string): string {
  switch (method) {
    case 'GET':
      return 'text-accent'
    case 'POST':
      return 'text-foreground'
    case 'DELETE':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

// ---- Component -------------------------------------------------------------

export function AttachApiSurface({
  patientId,
  sampleDocumentId,
}: {
  patientId: string
  /** A real document id to exercise item-scope probes when one exists. */
  sampleDocumentId?: string
}) {
  // Per-row send state, keyed by `${method}:${scope}`.
  const [state, setState] = useState<
    Record<string, { sending: boolean; status?: number; failed?: boolean }>
  >({})

  async function send(row: RejectedRow) {
    const key = `${row.method}:${row.scope}`
    setState((s) => ({ ...s, [key]: { sending: true } }))
    try {
      const status = await probeAttachEndpoint(
        patientId,
        row.method,
        row.scope,
        sampleDocumentId,
      )
      setState((s) => ({ ...s, [key]: { sending: false, status } }))
    } catch {
      // Network-level failure (the expected 405 does NOT throw). Mark failed.
      setState((s) => ({ ...s, [key]: { sending: false, failed: true } }))
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <Code2 className="h-3.5 w-3.5" data-icon="inline-start" />
        API surface
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">
            Attachment API surface
          </p>
          <p className="text-xs text-muted-foreground">
            Endpoint matrix for the attachment resource
          </p>
        </div>

        {/* Supported */}
        <div className="px-3 py-2.5">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Supported
          </p>
          <ul className="flex flex-col gap-1.5">
            {SUPPORTED.map((row) => (
              <li
                key={`${row.method}:${row.scope}`}
                className="flex items-baseline gap-2 text-[13px]"
              >
                <span
                  className={`w-14 shrink-0 font-mono text-[11px] font-semibold uppercase ${methodClass(
                    row.method,
                  )}`}
                >
                  {row.method}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] text-foreground">
                    {pathFor(row.scope)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.summary}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Returns 405 by design */}
        <div className="border-t border-border px-3 py-2.5">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Returns 405 by design
          </p>
          <ul className="flex flex-col gap-2">
            {REJECTED.map((row) => {
              const key = `${row.method}:${row.scope}`
              const st = state[key]
              return (
                <li key={key} className="flex items-start gap-2 text-[13px]">
                  <span className="w-14 shrink-0 pt-0.5 font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                    {row.method}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12px] text-foreground">
                      {pathFor(row.scope)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.reason}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    {st?.status != null && (
                      <span className="font-mono text-[11px] font-semibold text-destructive">
                        {st.status}
                      </span>
                    )}
                    {st?.failed && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        error
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={st?.sending}
                      onClick={() => send(row)}
                    >
                      {st?.sending ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        'Send'
                      )}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Each Send issues the real request through the API client — the 405
            appears live in the API Inspector.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
