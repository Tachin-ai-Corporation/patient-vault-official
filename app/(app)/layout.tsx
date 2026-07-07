import { Suspense } from 'react'
import { SessionProvider } from '@/lib/session-context'
import { ApiInspectorProvider } from '@/lib/api-inspector'
import { DcpGateProvider } from '@/lib/dcp-context'
import { AppShell } from '@/components/app-shell'

// The authenticated Patient Vault console. All session/tenant/patient providers
// and the console chrome live here so that the public marketing surface at "/"
// (which renders under the root layout only) never mounts them and makes zero
// API calls.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={null}>
      <SessionProvider>
        <ApiInspectorProvider>
          <DcpGateProvider>
            <AppShell>{children}</AppShell>
          </DcpGateProvider>
        </ApiInspectorProvider>
      </SessionProvider>
    </Suspense>
  )
}
