'use client'

import { Code2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// ---- Endpoint matrix data --------------------------------------------------

type Scope = 'collection' | 'item'
interface SupportedRow {
  method: string
  scope: Scope
  summary: string
}

// Endpoints the attachment resource supports. Informational only.
const SUPPORTED: SupportedRow[] = [
  { method: 'POST', scope: 'collection', summary: 'create, not idempotent' },
  { method: 'GET', scope: 'collection', summary: 'list, idempotent' },
  { method: 'GET', scope: 'item', summary: 'retrieve, idempotent' },
  { method: 'DELETE', scope: 'item', summary: 'soft-delete, idempotent' },
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

export function AttachApiSurface() {
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

      </PopoverContent>
    </Popover>
  )
}
