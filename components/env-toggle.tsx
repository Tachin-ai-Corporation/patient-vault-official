'use client'

import { environmentLabel } from '@/lib/environments'
import { useSession, type ApiEnv } from '@/lib/session-context'
import { cn } from '@/lib/utils'

// Read-only reflection of the backend-authenticated environment. Changing
// environments requires a separate authentication flow.
export function EnvToggle() {
  const { currentEnv } = useSession()
  const envs: ApiEnv[] = ['staging', 'production']

  return (
    <div
      role="tablist"
      aria-label="Authenticated environment"
      className="inline-flex items-center gap-1 rounded-button border border-border bg-muted p-1"
    >
      {envs.map((env) => {
        const active = env === currentEnv
        return (
          <button
            key={env}
            role="tab"
            aria-selected={active}
            type="button"
            disabled={!active}
            className={cn(
              'flex items-center gap-1.5 rounded-input px-3 py-1 font-mono text-[11px] uppercase tracking-wider',
              active
                ? env === 'production'
                  ? 'bg-success text-background shadow-sm'
                  : 'bg-background text-foreground shadow-sm'
                : 'cursor-not-allowed text-muted-foreground opacity-60',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full',
                active
                  ? env === 'production'
                    ? 'bg-background'
                    : 'bg-success'
                  : 'bg-muted-foreground/50',
              )}
            />
            {environmentLabel(env)}
          </button>
        )
      })}
    </div>
  )
}
