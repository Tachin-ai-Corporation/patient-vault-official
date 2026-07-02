'use client'

import { useState } from 'react'
import { useSession, type ApiEnv } from '@/lib/session-context'
import { GoLiveFlow } from '@/components/settings/go-live-flow'

// Top-level Staging ↔ Production toggle for the selected project. Staging is
// freely selectable; selecting Production before the project has activated
// production opens the go-live human checkpoint instead of switching.
export function EnvToggle() {
  const { session, isProductionActivated, setCurrentEnv } = useSession()
  const { currentEnv } = session
  const [goLiveOpen, setGoLiveOpen] = useState(false)

  function select(env: ApiEnv) {
    if (env === 'production' && !isProductionActivated) {
      setGoLiveOpen(true)
      return
    }
    setCurrentEnv(env)
  }

  const envs: ApiEnv[] = ['staging', 'production']

  return (
    <>
      <div
        role="tablist"
        aria-label="Environment"
        className="inline-flex items-center gap-1 rounded-button border border-border bg-muted p-1"
      >
        {envs.map((env) => {
          const active = env === currentEnv
          const isProd = env === 'production'
          return (
            <button
              key={env}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => select(env)}
              className={`flex items-center gap-1.5 rounded-input px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                active
                  ? isProd
                    ? 'bg-success text-background shadow-sm'
                    : 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  active
                    ? isProd
                      ? 'bg-background'
                      : 'bg-success'
                    : isProd && !isProductionActivated
                      ? 'bg-muted-foreground/50'
                      : 'bg-muted-foreground'
                }`}
              />
              {env}
            </button>
          )
        })}
      </div>

      <GoLiveFlow open={goLiveOpen} onClose={() => setGoLiveOpen(false)} />
    </>
  )
}
