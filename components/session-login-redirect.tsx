'use client'

import { useEffect } from 'react'
import { useTheme } from '@/components/theme-provider'
import { withAuthParams } from '@/lib/auth-branding'
import { saveLoginIntent, validateLoginIntent } from '@/lib/login-intent'
import { ENVIRONMENT_CONFIG } from '@/lib/session-environments'

export function SessionLoginRedirect({ returnTo }: { returnTo: string }) {
  const { theme } = useTheme()

  useEffect(() => {
    const destination = validateLoginIntent(returnTo)
    if (!destination) return

    saveLoginIntent(destination)
    window.location.replace(withAuthParams(ENVIRONMENT_CONFIG.demo.loginUrl, theme))
  }, [returnTo, theme])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="font-mono text-sm text-muted-foreground" role="status">
        Redirecting to 1health sign in…
      </p>
    </main>
  )
}
