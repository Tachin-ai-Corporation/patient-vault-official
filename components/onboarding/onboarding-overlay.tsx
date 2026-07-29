'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  Check,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Vault,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { signOut } from '@/lib/auth-client'
import type { UserInfo } from '@/lib/api/user'
import {
  createApiToken,
  createTenant,
  findExistingVaultId,
  matchExistingVaultId,
  switchTenant,
  type ApiToken,
} from '@/lib/api/onboarding'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

type StepId = 'org' | 'switch' | 'key'

type StepState = {
  id: StepId
  label: string
  activeLabel: string
  doneLabel: string
  icon: typeof Building2
  status: StepStatus
}

// First-run provisioning: the developer has no Patient Vault yet.
const INITIAL_STEPS: StepState[] = [
  {
    id: 'org',
    label: 'Create your organization',
    activeLabel: 'Creating your organization…',
    doneLabel: 'Organization created',
    icon: Building2,
    status: 'pending',
  },
  {
    id: 'switch',
    label: 'Switch to your organization',
    activeLabel: 'Switching to your organization…',
    doneLabel: 'Switched to your organization',
    icon: RefreshCw,
    status: 'pending',
  },
  {
    id: 'key',
    label: 'Generate your API key',
    activeLabel: 'Generating your API key…',
    doneLabel: 'API key generated',
    icon: KeyRound,
    status: 'pending',
  },
]

// Returning developer: a Patient Vault already exists, so we only switch back
// into it — no org creation, no new API key.
const RETURNING_STEPS: StepState[] = [
  {
    id: 'switch',
    label: 'Open your organization',
    activeLabel: 'Opening your organization…',
    doneLabel: 'Organization ready',
    icon: RefreshCw,
    status: 'pending',
  },
]

function vaultName(user: UserInfo): string {
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  const base = full || user.username || 'My'
  return `${base}'s Patient Vault`
}

export function OnboardingOverlay({
  user,
  onDone,
}: {
  user: UserInfo
  /** Called when the developer dismisses the key panel — refreshes the session. */
  onDone: () => void
}) {
  // A returning developer already has a Patient Vault, discoverable inline from
  // `myself.tenants` (any tenant whose name contains "patient vault"). When they
  // do, we skip creation + key generation entirely and only switch back into the
  // existing org.
  const name = vaultName(user)
  const returningVaultId = useMemo(
    () => matchExistingVaultId(user.tenants ?? []),
    [user.tenants],
  )
  const isReturning = returningVaultId != null

  const [steps, setSteps] = useState<StepState[]>(
    isReturning ? RETURNING_STEPS : INITIAL_STEPS,
  )
  const [apiKey, setApiKey] = useState<ApiToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const startedRef = useRef(false)

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    // Clear this app's session server + client side, then hard-navigate to the
    // public page so the user is never trapped in the setup gate. `replace`
    // drops this authenticated page from history so Back can't restore it.
    await signOut()
    window.location.replace('/')
  }, [])

  const setStatus = useCallback((id: StepId, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }, [])

  const run = useCallback(async () => {
    setError(null)
    setDebug(null)

    // Returning developer — the org already exists (found inline in
    // `myself.tenants`). Never re-create it or mint a duplicate API key; just
    // switch back into the vault and drop straight into the console.
    if (returningVaultId != null) {
      setStatus('switch', 'active')
      const switched = await switchTenant(returningVaultId)
      if (!switched.success) {
        setStatus('switch', 'error')
        setError(switched.error ?? 'Could not open your organization.')
        if (switched.debug) setDebug(switched.debug)
        return
      }
      setStatus('switch', 'done')
      // Session now points at the real vault — leave the setup gate.
      onDone()
      return
    }

    // First-run developer — provision a new vault.
    // Step 1 — create the org. Guard once more against a vault that exists but
    // wasn't listed in `myself.tenants` (stale payload) so we never duplicate.
    setStatus('org', 'active')
    let tenantId = await findExistingVaultId()

    if (!tenantId) {
      const created = await createTenant({
        name,
        primaryCorporateEmail: user.email,
      })
      if (!created.success || !created.tenantId) {
        setStatus('org', 'error')
        setError(created.error ?? 'Could not create your organization.')
        return
      }
      tenantId = created.tenantId
    }
    setStatus('org', 'done')

    // Step 2 — switch tenant (persists the new org-scoped token)
    setStatus('switch', 'active')
    const switched = await switchTenant(tenantId)
    if (!switched.success) {
      setStatus('switch', 'error')
      setError(switched.error ?? 'Could not switch to your organization.')
      if (switched.debug) setDebug(switched.debug)
      return
    }
    setStatus('switch', 'done')

    // Step 3 — create API key
    setStatus('key', 'active')
    const key = await createApiToken('Patient Vault API Key')
    if (!key.success || !key.token) {
      setStatus('key', 'error')
      setError(key.error ?? 'Could not generate your API key.')
      return
    }
    setStatus('key', 'done')
    setApiKey(key.token)
  }, [name, onDone, returningVaultId, setStatus, user])

  useEffect(() => {
    // Guard against React Strict Mode double-invoke — these steps POST real
    // resources and must run exactly once.
    if (startedRef.current) return
    startedRef.current = true
    void run()
  }, [run])

  const retry = useCallback(() => {
    setSteps(isReturning ? RETURNING_STEPS : INITIAL_STEPS)
    setApiKey(null)
    setDebug(null)
    void run()
  }, [isReturning, run])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10151c]/70 p-4 backdrop-blur-sm">
      <div className="relative flex min-h-full w-full max-w-lg items-center justify-center">
        <div className="w-full overflow-hidden rounded-card border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
                1h
              </span>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-card-foreground">
                  {apiKey
                    ? 'Your workspace is ready'
                    : isReturning
                      ? 'Opening your workspace'
                      : 'Setting up your workspace'}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                  {apiKey
                    ? 'Save your API key below to start making requests.'
                    : isReturning
                      ? 'Welcome back — restoring your organization.'
                      : 'This runs automatically — no action needed yet.'}
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-5">
            <ol className="flex flex-col gap-3">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </ol>

            {error && (
              <div className="mt-5 rounded-card border border-destructive/40 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-sm leading-relaxed text-destructive text-pretty">
                    {error}
                  </p>
                </div>
                {debug && (
                  <div className="mt-3 flex items-start gap-2 rounded-input border border-border bg-background px-3 py-2">
                    <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {debug}
                    </code>
                    <CopyButton value={debug} label="Copy diagnostic details" />
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
                  <RefreshCw className="h-3.5 w-3.5" data-icon="inline-start" />
                  Try again
                </Button>
              </div>
            )}

            {/* One-time key reveal */}
            {apiKey && (
              <div className="mt-5 rounded-card border border-accent/40 bg-accent/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                  shown once — copy it now
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-input border border-border bg-background px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                    {apiKey.tokenValue}
                  </code>
                  <CopyButton value={apiKey.tokenValue} label="Copy API key" />
                </div>
                <ul className="mt-3 flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Vault className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Store this somewhere safe — a password manager like 1Password.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>You won&apos;t be able to see this key again after you continue.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Footer — a sign-out escape hatch is always available so the user is
              never trapped in the setup gate, alongside the contextual action. */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" />
              ) : (
                <LogOut className="h-3.5 w-3.5" data-icon="inline-start" />
              )}
              Sign out
            </Button>
            {apiKey && (
              <Button onClick={onDone}>
                <Check className="h-4 w-4" data-icon="inline-start" />
                I&apos;ve saved my key
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepRow({ step }: { step: StepState }) {
  const Icon = step.icon
  const label =
    step.status === 'active'
      ? step.activeLabel
      : step.status === 'done'
        ? step.doneLabel
        : step.label

  return (
    <li className="flex items-center gap-3">
      <span
        className={
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border transition-colors ' +
          (step.status === 'done'
            ? 'border-success/40 bg-success/10 text-success'
            : step.status === 'active'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : step.status === 'error'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-muted text-muted-foreground')
        }
      >
        {step.status === 'active' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : step.status === 'done' ? (
          <Check className="h-4 w-4" />
        ) : step.status === 'error' ? (
          <X className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
      <span
        className={
          'text-sm ' +
          (step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground')
        }
      >
        {label}
      </span>
    </li>
  )
}
