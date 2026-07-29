'use client'

import { useState } from 'react'
import { Check, ChevronDown, Database } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { GoLiveFlow } from '@/components/settings/go-live-flow'
import { EnvBadge } from '@/components/env-badge'
import { useSession, type ApiEnv } from '@/lib/session-context'
import {
  ENVIRONMENTS,
  environmentId,
  isSelectable,
  type EnvironmentRecord,
  type EnvironmentStatus,
} from '@/lib/environments'
import { useProductionStatus } from '@/lib/production-status'
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

// Trailing affordance for environments that cannot be selected yet.
function trailingLabel(status: EnvironmentStatus): string | null {
  switch (status) {
    case 'none':
      return 'Set up'
    case 'pending':
      return 'Pending'
    case 'suspended':
      return 'Suspended'
    default:
      return null
  }
}

function EnvironmentRow({
  env,
  selected,
  onSelect,
  onSetUp,
}: {
  env: EnvironmentRecord
  selected: boolean
  onSelect: (id: ApiEnv) => void
  onSetUp: () => void
}) {
  const id = environmentId(env)
  const selectable = isSelectable(env)
  const label = trailingLabel(env.status)
  // `none` is actionable (it starts go-live); pending/suspended are inert.
  const actionable = selectable || env.status === 'none'

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={!actionable}
      onClick={() => (selectable ? onSelect(id) : onSetUp())}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-input px-2 py-2 text-left transition-colors',
        actionable ? 'hover:bg-muted/60' : 'cursor-default opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          dotClasses(id, env.status),
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {env.name}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground text-pretty">
          {DESCRIPTIONS[id]}
        </span>
      </span>

      {selected && selectable && (
        <Check
          className="mt-0.5 h-4 w-4 shrink-0 text-teal"
          aria-label="Selected"
        />
      )}
      {label && (
        <span
          className={cn(
            'mt-0.5 shrink-0 rounded-tag px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
            env.status === 'none'
              ? 'bg-teal/15 text-teal'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {label}
        </span>
      )}
    </button>
  )
}

/**
 * Vault + environment selector for the console header. Renders a bordered pill
 * showing the vault name and the active environment, and opens a menu listing
 * every environment from the mocked catalog.
 *
 * Switching is pure app state (`setCurrentEnv`) — no navigation, no loading.
 */
export function EnvironmentSelector() {
  const { currentProject, currentEnv, setCurrentEnv } = useSession()
  const [open, setOpen] = useState(false)
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const productionStatus = useProductionStatus()

  function select(id: ApiEnv) {
    setCurrentEnv(id)
    setOpen(false)
  }

  function startSetUp() {
    setOpen(false)
    setGoLiveOpen(true)
  }

  return (
    <>
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
              Choose which vault this console reads and writes.
            </p>
          </div>
          <div role="listbox" aria-label="Environment" className="p-1.5">
            {ENVIRONMENTS.map((environment) => {
              const id = environmentId(environment)
              const selected = id === currentEnv
              const env =
                id === 'production'
                  ? {
                      ...environment,
                      // The authenticated backend wins over stale local setup
                      // status so Production renders selected, not "Set up".
                      status: selected ? ('active' as const) : productionStatus,
                    }
                  : environment

              return (
                <EnvironmentRow
                  key={env.name}
                  env={env}
                  selected={selected}
                  onSelect={select}
                  onSetUp={startSetUp}
                />
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <GoLiveFlow open={goLiveOpen} onClose={() => setGoLiveOpen(false)} />
    </>
  )
}
