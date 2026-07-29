'use client'

import { ApiInspectorProvider } from '@/lib/api-inspector'
import { SessionProvider } from '@/lib/session-context'
import { ConsoleView } from '@/components/console/console-view'
import { TopNav } from '@/components/top-nav'

export default function ReturnHarnessPage() {
  return (
    <SessionProvider>
      <ApiInspectorProvider>
        <TopNav />
        <ConsoleView />
      </ApiInspectorProvider>
    </SessionProvider>
  )
}
