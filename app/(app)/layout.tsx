import { Suspense } from 'react'
import { cookies, headers } from 'next/headers'
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
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const admission = sessionAdmission((name) => cookieStore.get(name)?.value ?? null)
  if (!admission) {
    const pathname =
      requestHeaders.get('x-pathname') ??
      requestHeaders.get('x-invoke-path') ??
      requestHeaders.get('next-url') ??
      '/patients'
    const preservedSearch = requestHeaders.get('x-search')
    const invokeQuery = requestHeaders.get('x-invoke-query')
    let query = preservedSearch?.startsWith('?') ? preservedSearch : ''

    if (!query && invokeQuery && !pathname.includes('?')) {
      try {
        const values = JSON.parse(invokeQuery) as Record<string, string | string[]>
        const params = new URLSearchParams()
        Object.entries(values).forEach(([key, value]) => {
          const entries = Array.isArray(value) ? value : [value]
          entries.forEach((entry) => params.append(key, entry))
        })
        query = params.size ? `?${params.toString()}` : ''
      } catch {
        query = ''
      }
    }

    const candidate = `${pathname}${query}`
    const returnTo = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/patients'
    redirect(`/?returnTo=${encodeURIComponent(returnTo)}`)
  }
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
