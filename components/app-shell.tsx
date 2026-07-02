'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TopBar } from '@/components/top-bar'
import { TopNav } from '@/components/top-nav'
import { ProjectOnboarding } from '@/components/project-onboarding'
import { ApiInspectorPanel } from '@/components/api-inspector/api-inspector-panel'
import { useSession } from '@/lib/session-context'

// Routes that render bare (no console chrome) and never require auth.
const AUTH_ROUTES = new Set(['/login', '/register'])

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, authHydrated, session } = useSession()

  const isAuthRoute = AUTH_ROUTES.has(pathname)

  // Auth gate: send unauthenticated users on app routes to /login. Wait for
  // hydration so we don't redirect before the persisted session is read.
  useEffect(() => {
    if (authHydrated && !isAuthenticated && !isAuthRoute) {
      router.replace('/login')
    }
  }, [authHydrated, isAuthenticated, isAuthRoute, router])

  // Login / register: full-screen branded pages, no sidebar or top bar.
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Avoid flashing the console (or a premature redirect) before we know auth.
  if (!authHydrated || !isAuthenticated) {
    return null
  }

  // Safe state: no projects (e.g. just deleted the last one). Render the
  // onboarding screen instead of console chrome so nothing reads a dangling
  // currentProjectId.
  if (session.projects.length === 0) {
    return <ProjectOnboarding />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <TopNav />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
      {/* Global API Inspector — present across all authenticated pages. */}
      <ApiInspectorPanel />
    </div>
  )
}
