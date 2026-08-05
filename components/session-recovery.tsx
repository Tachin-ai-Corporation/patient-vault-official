'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, ShieldAlert } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session-context'
import {
  ENVIRONMENT_CONFIG,
  type SessionEnvironment,
} from '@/lib/session-environments'
import { hasEnvironmentSession } from '@/lib/auth-client'
import { withAuthParams } from '@/lib/auth-branding'

export type SessionRecoveryStatus =
  | 'idle'
  | 'required'
  | 'waiting'
  | 'retrying'
  | 'error'

export function isSessionRequiredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /no valid .*1health session|no connected base url|authenticate via \/auth/i.test(
    message,
  )
}

export function useSessionRecovery() {
  const { activeEnvironment, setActiveEnvironment } = useSession()
  const { theme } = useTheme()
  const [status, setStatus] = useState<SessionRecoveryStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const environmentRef = useRef<SessionEnvironment>(activeEnvironment)
  const retryRef = useRef<(() => Promise<void>) | null>(null)
  const checkingRef = useRef(false)

  const reset = useCallback(() => {
    retryRef.current = null
    checkingRef.current = false
    setStatus('idle')
    setMessage(null)
  }, [])

  const requireAuthentication = useCallback(
    (retry: () => Promise<void>, error?: unknown) => {
      environmentRef.current = activeEnvironment
      retryRef.current = retry
      setMessage(
        error instanceof Error
          ? error.message
          : `Your ${ENVIRONMENT_CONFIG[activeEnvironment].label.toLowerCase()} session is no longer active.`,
      )
      setStatus('required')
    },
    [activeEnvironment],
  )

  const checkForSession = useCallback(async () => {
    if (checkingRef.current || !retryRef.current) return
    const environment = environmentRef.current
    if (!hasEnvironmentSession(environment)) return

    checkingRef.current = true
    setStatus('retrying')
    setMessage(null)
    const retry = retryRef.current
    retryRef.current = null

    try {
      const selected = await setActiveEnvironment(environment)
      if (!selected) throw new Error('The new session could not be activated.')
      await retry()
      setStatus('idle')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The task could not be completed.')
      setStatus('error')
    } finally {
      checkingRef.current = false
    }
  }, [setActiveEnvironment])

  const openAuthentication = useCallback(() => {
    const environment = environmentRef.current
    const url = withAuthParams(ENVIRONMENT_CONFIG[environment].loginUrl, theme)
    const authWindow = window.open('about:blank', '_blank')
    if (!authWindow) {
      setMessage('Your browser blocked the sign-in window. Allow pop-ups, then try again.')
      setStatus('error')
      return
    }
    authWindow.opener = null
    authWindow.location.assign(url)
    setStatus('waiting')
    setMessage(null)
  }, [theme])

  useEffect(() => {
    if (status !== 'waiting') return

    const check = () => void checkForSession()
    const interval = window.setInterval(check, 1000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    check()

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [checkForSession, status])

  return {
    status,
    message,
    environment: environmentRef.current,
    requireAuthentication,
    openAuthentication,
    checkForSession,
    reset,
  }
}

export function SessionRecoveryNotice({
  status,
  message,
  environment,
  onAuthenticate,
  onCheck,
}: {
  status: Exclude<SessionRecoveryStatus, 'idle'>
  message: string | null
  environment: SessionEnvironment
  onAuthenticate: () => void
  onCheck: () => void
}) {
  const label = ENVIRONMENT_CONFIG[environment].label
  const busy = status === 'retrying'

  return (
    <div
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className="rounded-input border border-border bg-muted/50 p-4"
    >
      <div className="flex items-start gap-3">
        {busy ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {status === 'retrying'
                ? 'Session restored — completing your task'
                : status === 'waiting'
                  ? `Waiting for ${label} sign-in`
                  : status === 'error'
                    ? 'Could not resume your task'
                    : 'Session required'}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {message ??
                (status === 'waiting'
                  ? 'Finish signing in in the new tab, then return here. This task will continue automatically.'
                  : `Sign in to ${label} to continue. Your work in this dialog will be kept.`)}
            </p>
          </div>
          {!busy && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={onAuthenticate}>
                <ExternalLink className="h-3.5 w-3.5" data-icon="inline-start" />
                {status === 'waiting' ? 'Open sign-in again' : `Sign in to ${label}`}
              </Button>
              {status === 'waiting' && (
                <Button type="button" size="sm" variant="outline" onClick={onCheck}>
                  I&apos;ve signed in
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
