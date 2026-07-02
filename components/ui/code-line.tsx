import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/utils'

// A single mono line with a trailing copy button. Used for endpoint URLs,
// scopes, OAuth values, and spec paths across the console.
export function CodeLine({
  value,
  prefix,
  label,
  className,
}: {
  value: string
  // Optional non-copied prefix shown before the value (e.g. an HTTP verb).
  prefix?: string
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-input border border-border bg-muted/50 px-3 py-2',
        className,
      )}
    >
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
        {prefix && <span className="text-accent">{prefix} </span>}
        {value}
      </code>
      <CopyButton value={value} label={label ?? 'Copy'} />
    </div>
  )
}
