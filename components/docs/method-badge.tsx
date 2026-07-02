import { cn } from '@/lib/utils'

// Color-coded HTTP verb badge. Colors map to the navy/cyan theme tokens:
// GET → aqua/blue, POST → success green, PUT/PATCH → warning amber, DELETE → red.
const METHOD_STYLES: Record<string, string> = {
  GET: 'border-info/40 bg-info/15 text-info',
  POST: 'border-success/40 bg-success/15 text-success',
  PUT: 'border-warning/40 bg-warning/15 text-warning',
  PATCH: 'border-warning/40 bg-warning/15 text-warning',
  DELETE: 'border-destructive/40 bg-destructive/15 text-destructive',
}

export function MethodBadge({
  method,
  className,
}: {
  method: string
  className?: string
}) {
  const upper = method.toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-tag border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase leading-none tracking-wide',
        METHOD_STYLES[upper] ?? 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      {upper}
    </span>
  )
}
