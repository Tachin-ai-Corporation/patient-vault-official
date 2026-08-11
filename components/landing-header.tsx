'use client'

import { Suspense } from 'react'
import { SharedHeader } from '@/components/shared-header'
import { SessionProvider } from '@/lib/session-context'

export function LandingHeader({ authenticated }: { authenticated: boolean }) {
  if (!authenticated) return <SharedHeader />

  return (
    <Suspense fallback={null}>
      <SessionProvider>
        <SharedHeader authenticated />
      </SessionProvider>
    </Suspense>
  )
}
