'use client'

import { type ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SharedHeader } from '@/components/shared-header'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'
import { ApiInspectorPanel } from '@/components/api-inspector/api-inspector-panel'
import { ProductionRail } from '@/components/production-rail'
import { BaaAcceptanceGate } from '@/components/baa-acceptance-gate'
import { useSession } from '@/lib/session-context'

// Developers launched on the shared bootstrap tenant get their own org
// provisioned automatically before the console is usable.
const BOOTSTRAP_TENANT_ID = 1

// The /auth route renders bare (no console chrome) — it handles the 1health
// launch-payload exchange itself.
const BARE_ROUTES = new Set(['/auth'])

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isLoading, error, user, refresh } = useSession()

  // Back/forward-cache guard. After sign-out we hard-navigate to "/", but the
  // browser can keep this authenticated page alive in the bfcache and restore it
  // instantly when the user hits Back or returns from the 1health login — with
  // stale in-memory session state, so the app *looks* logged in even though the
  // cookies are gone. (Closing the whole window drops the bfcache, which is why
  // that "fixes" it.) A persisted `pageshow` means we were restored from
  // bfcache: force a full reload so the server re-evaluates the now-cleared
  // cookies and routes to the correct page.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  if (BARE_ROUTES.has(pathname)) {
    return <>{children}</>
  }

  // Session bootstrapping: identity is established by the 1health launch
  // (cookies set at /auth). While myself/tenant load, show a light splash.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
            1h
          </span>
          <p className="text-sm text-muted-foreground">Loading your vault…</p>
        </div>
      </div>
    )
  }

  // No valid session (missing/expired token). Point the developer back to the
  // 1health launch instead of a mock login screen.
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
            1h
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            Session required
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Your 1health session could not be loaded. Please relaunch this app
            from 1health to continue.
          </p>
          <a
            href="/auth"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Go to sign in
          </a>
        </div>
      </div>
    )
  }

  // First-run provisioning: a developer whose session is still on the shared
  // bootstrap tenant gets their own org + API key created automatically before
  // the console is shown. Dismissing the key panel refreshes the session, which
  // moves them onto their new tenant and unmounts this overlay.
  if (user && user.tenantContext?.id === BOOTSTRAP_TENANT_ID) {
    return <OnboardingOverlay user={user} onDone={() => void refresh()} />
  }

  return (
    <BaaAcceptanceGate>
      <div className="min-h-screen bg-background">
        {/* Self-gating: renders only while Production is the active environment. */}
        <ProductionRail />
        <div className="flex min-h-screen flex-col">
          <SharedHeader authenticated />
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
        {/* Floating API Inspector — fixed-position, only renders once the
            authenticated console is shown (not on bare/onboarding screens). */}
        <ApiInspectorPanel />
      </div>
    </BaaAcceptanceGate>
  )
}
