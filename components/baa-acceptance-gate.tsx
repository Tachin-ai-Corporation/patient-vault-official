'use client'

import { useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { baaContent, BAA_VERSION } from '@/components/agreement'
import { signOut } from '@/lib/auth-client'
import { isHipaaCoveredEntity, type BaaEntityType, type BaaStatus } from '@/lib/baa-agreements'
import { useSession } from '@/lib/session-context'

type EntityType = BaaEntityType | null

async function statusFetcher(url: string): Promise<BaaStatus> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Unable to verify BAA status.')
  return body
}

export function BaaAcceptanceGate({ children }: { children: ReactNode }) {
  const { currentEnv, currentProject, session } = useSession()
  const isProduction = currentEnv === 'production'
  const { data, error, isLoading, mutate } = useSWR<BaaStatus>(
    isProduction ? '/api/agreements/baa' : null,
    statusFetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true, shouldRetryOnError: false },
  )
  const [confirmed, setConfirmed] = useState(false)
  const [entityType, setEntityType] = useState<EntityType>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  if (!isProduction || data?.accepted) return <>{children}</>

  async function acceptBaa() {
    if (!data?.pendingIds.length || !entityType || !confirmed || accepting) return
    setAccepting(true)
    setAcceptError(null)
    try {
      const response = await fetch('/api/agreements/baa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: data.pendingIds,
          hipaaCoveredEntity: isHipaaCoveredEntity(entityType),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'The BAA could not be accepted.')
      const verified = await mutate()
      if (!verified?.accepted) throw new Error('Acceptance could not be verified. Please try again.')
    } catch (caught) {
      setAcceptError(caught instanceof Error ? caught.message : 'The BAA could not be accepted.')
    } finally {
      setAccepting(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    window.location.replace('/')
  }

  if (isLoading || (!data && !error)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <span className="flex h-11 w-11 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">1h</span>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Verifying your Production agreement…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <section className="w-full max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm" aria-labelledby="baa-error-title">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">1h</span>
          <h1 id="baa-error-title" className="mt-5 text-xl font-semibold text-foreground">BAA verification required</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error.message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => void mutate()} className="h-10 rounded-button bg-primary px-5 text-sm font-medium text-primary-foreground">Retry</button>
            <button type="button" onClick={() => void handleSignOut()} className="h-10 rounded-button border border-border px-5 text-sm font-medium text-foreground">Sign out</button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">1h</span>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Production setup</p>
              <p className="text-sm font-medium text-foreground">{currentProject.name}</p>
            </div>
          </div>
          <button type="button" onClick={() => void handleSignOut()} className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:self-auto">Sign out</button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <section className="overflow-hidden rounded-card border border-border bg-card" aria-labelledby="baa-title">
            <div className="border-b border-border px-5 py-5 sm:px-7">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Required before accessing Production</p>
              <h1 id="baa-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground text-balance">Business Associate Agreement</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Review the agreement for your Production organization before continuing.</p>
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-5 py-6 sm:px-7" tabIndex={0} aria-label="Business Associate Agreement text">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85">{baaContent}</pre>
            </div>
          </section>

          <aside className="flex flex-col gap-5 rounded-card border border-border bg-card p-5 sm:p-6" aria-labelledby="acceptance-title">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{BAA_VERSION} · Effective 2026</p>
              <h2 id="acceptance-title" className="mt-2 text-lg font-semibold text-foreground">Accept for {currentProject.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">You are signing as {session.user.name}. Only an organization administrator may accept this agreement.</p>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-foreground">Your organization is a</legend>
              {([
                ['covered', 'HIPAA Covered Entity', 'A health plan, healthcare clearinghouse, or qualifying healthcare provider.'],
                ['non-covered', 'Non-covered Entity', 'A service provider handling PHI for a Covered Entity.'],
              ] as const).map(([value, label, description]) => (
                <label key={value} className="flex cursor-pointer gap-3 rounded-input border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" name="entity-type" value={value} checked={entityType === value} onChange={() => setEntityType(value)} className="mt-1 h-4 w-4 accent-primary" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-input bg-muted/50 p-3">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span className="text-sm leading-relaxed text-foreground">I have reviewed this BAA and have authority to accept it on behalf of {currentProject.name}.</span>
            </label>

            {acceptError && <p role="alert" className="rounded-input border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{acceptError}</p>}

            <button type="button" disabled={!confirmed || !entityType || accepting} onClick={() => void acceptBaa()} className="mt-auto h-11 rounded-button bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-45">
              {accepting ? 'Accepting and verifying…' : 'Accept BAA and continue'}
            </button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">Acceptance is recorded by 1health for this Production organization.</p>
          </aside>
        </div>
      </div>
    </main>
  )
}
