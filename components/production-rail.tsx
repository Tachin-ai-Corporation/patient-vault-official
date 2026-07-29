'use client'

import { useSession } from '@/lib/session-context'

/**
 * A persistent green rail pinned across the very top of the console whenever
 * the active environment is Production, so live patient data is never edited
 * unknowingly. Renders nothing in any other environment.
 *
 * Fixed rather than in-flow so it stays visible while scrolling without
 * shifting the sticky TopBar/TopNav offsets (top-0 / top-16).
 */
export function ProductionRail() {
  const { currentEnv } = useSession()

  if (currentEnv !== 'production') return null

  return (
    <div
      role="status"
      aria-label="Production environment"
      data-testid="production-rail"
      className="fixed inset-x-0 top-0 z-40 h-[3px] bg-success"
    />
  )
}
