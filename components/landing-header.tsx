'use client'

import { Suspense } from 'react'
import { SharedHeader } from '@/components/shared-header'
import { SessionProvider } from '@/lib/session-context'
import type { SessionEnvironment } from '@/lib/session-environments'

export function LandingHeader({
  initialEnvironment,
}: {
  initialEnvironment: SessionEnvironment | null
}) {
  if (!initialEnvironment) return <SharedHeader />

  return (
    <Suspense fallback={null}>
      <SessionProvider initialEnvironment={initialEnvironment}>
        <SharedHeader authenticated />
      </SessionProvider>
    </Suspense>
  )
}
