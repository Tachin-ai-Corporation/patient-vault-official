'use client'

import { useState } from 'react'
import { Check, ChevronDown, Database, ExternalLink } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { EnvBadge } from '@/components/env-badge'
import { useTheme } from '@/components/theme-provider'
import { withAuthParams } from '@/lib/auth-branding'
import { useSession, type ApiEnv } from '@/lib/session-context'
import {
  ENVIRONMENTS,
  environmentId,
  type EnvironmentRecord,
  type EnvironmentStatus,
} from '@/lib/environments'
import { cn } from '@/lib/utils'

// One-line row copy. Kept here rather than in the mocked data module so that
// module stays a pure `{ name, status, keyPrefix }` catalog.
const DESCRIPTIONS: Record<ApiEnv, string> = {
  staging: 'Test data. Writes are reversible and unaudited.',
  production: 'Live patient records. Every access is audited.',
}

// The dot encodes provisioning status. An `active` environment takes its
// identity color so it matches the badge; everything else is neutral or a
// warning/error tone.
function dotClasses(env: ApiEnv, status: EnvironmentStatus): string {
  switch (status) {
    case 'active':
      return env === 'production' ? 'bg-success' : 'bg-warning'
    case 'pending':
      return 'bg-warning/60'
    case 'suspended':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/40'
  }
}

function EnvironmentRow({
  env,
  selected,
  signInUrl,
  actionLabel,
  available,
  onSelect,
}: {
  env: EnvironmentRecord
  selected: boolean
  signInUrl: string
  actionLabel: string
  available: boolean
  onSelect: () => void
}) {
  const id = environmentId(env)

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={!available}
      onClick={available && !selected ? onSelect : undefined}
      onKeyDown={(event) => {
        if (available && !selected && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onSelect()
        }
      }}
      tabIndex={available && !selected ? 0 : -1}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-input px-2 py-2 text-left',
        !selected && 'bg-muted/30',
        available && !selected && 'cursor-pointer hover:bg-muted',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          selected ? dotClasses(id, 'active') : 'bg-muted-foreground/40',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{env.name}</span>
          {selected && (
            <Check
              className="h-4 w-4 shrink-0 text-teal"
              aria-label="Selected"
            />
          )}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground text-pretty">
          {selected
            ? DESCRIPTIONS[id]
            : available
              ? 'Active session available. Select to switch.'
              : 'Sign in required. Each environment signs in separately.'}
        </span>
        {!available && (
          <a
            href={signInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            {actionLabel}
            <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        )}
      </span>
    </div>
  )
}

/**
 * Vault + environment selector for the console header. Renders a bordered pill
 * showing the vault name and the active environment, and opens a menu listing
 * every environment from the catalog. The authenticated backend environment
 * is selected; the other row starts a sign-in to that environment.
 */
export function EnvironmentSelector() {
  const {
    currentProject,
    currentEnv,
    environmentSessions,
    productionAccountState,
    setActiveEnvironment,
  } = useSession()
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const signInUrls: Record<ApiEnv, string> = {
    staging: withAuthParams(
      'https://pv.demo.1health.io/login?openApp=Patient%20Vault',
      theme,
    ),
    production: withAuthParams(
      productionAccountState === 'not_registered'
        ? 'https://1health.app.1health.io/register?openApp=Patient%20Vault'
        : 'https://1health.app.1health.io/login?openApp=Patient%20Vault',
      theme,
    ),
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`Environment: ${currentEnv}. Change environment`}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-button border border-border bg-background px-2.5 py-1.5',
            'text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
          )}
        >
          <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[12ch] truncate font-medium text-foreground sm:max-w-[20ch]">
            {currentProject.name}
          </span>
          <EnvBadge env={currentEnv} />
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 gap-0 p-0">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">Environment</p>
            <p className="text-xs text-muted-foreground">
              This console reflects your authenticated environment.
            </p>
          </div>
          <div role="listbox" aria-label="Environment" className="p-1.5">
            {ENVIRONMENTS.map((environment) => {
              const id = environmentId(environment)
              const selected = id === currentEnv

              return (
                <EnvironmentRow
                  key={environment.name}
                  env={environment}
                  selected={selected}
                  available={environmentSessions[id === 'production' ? 'prod' : 'demo']}
                  signInUrl={signInUrls[id]}
                  actionLabel={
                    id === 'production' && productionAccountState === 'not_registered'
                      ? 'Create production account'
                      : `Sign in to ${environment.name}`
                  }
                  onSelect={() => {
                    void setActiveEnvironment(id === 'production' ? 'prod' : 'demo')
                    setOpen(false)
                  }}
                />
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
  )
}
