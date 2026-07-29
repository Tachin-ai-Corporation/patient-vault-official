import type { ApiEnv } from '@/lib/session-context'
import { cn } from '@/lib/utils'

/**
 * Environment identity colors: amber for staging, green for production. Solid
 * fills with fixed dark ink so contrast holds in both light and dark themes.
 *
 * Exported so any surface that needs the raw classes can stay in lockstep with
 * the badge itself.
 */
export function envBadgeClasses(env: ApiEnv): string {
  return env === 'production'
    ? 'bg-success text-[#202833]'
    : 'bg-warning text-[#202833]'
}

/**
 * The environment badge used by the header selector and by any environment-
 * scoped surface (e.g. the console API key card).
 *
 * Single source of truth on purpose: these badges are the primary signal for
 * "am I touching live patient data?", so staging amber and production green
 * must never drift between the header and the panels below it.
 */
export function EnvBadge({
  env,
  className,
}: {
  env: ApiEnv
  className?: string
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-tag px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        envBadgeClasses(env),
        className,
      )}
    >
      {env}
    </span>
  )
}
