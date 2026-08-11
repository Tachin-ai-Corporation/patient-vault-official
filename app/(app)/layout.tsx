import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SessionProvider } from '@/lib/session-context'
import { sessionAdmission } from '@/lib/session-environments'
import { ApiInspectorProvider } from '@/lib/api-inspector'
import { DcpGateProvider } from '@/lib/dcp-context'
import { AppShell } from '@/components/app-shell'

// The authenticated Patient Vault console. All session/tenant/patient providers
// and the console chrome live here so that the public marketing surface at "/"
// (which renders under the root layout only) never mounts them and makes zero
// API calls.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const admission = sessionAdmission((name) => cookieStore.get(name)?.value ?? null)
  if (!admission) redirect('/')
  const initialEnvironment = admission === 'resolving' ? null : admission

  return (
    <Suspense fallback={null}>
      <SessionProvider initialEnvironment={initialEnvironment}>
        <ApiInspectorProvider>
          <DcpGateProvider>
            <AppShell>{children}</AppShell>
          </DcpGateProvider>
        </ApiInspectorProvider>
      </SessionProvider>
    </Suspense>
  )
}
