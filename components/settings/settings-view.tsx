'use client'

import { useState, type FormEvent } from 'react'
import { CreditCard, Rocket, Check } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { GoLiveFlow } from '@/components/settings/go-live-flow'
import { ApiKeysSection } from '@/components/settings/api-keys-section'
import { ComplianceSection } from '@/components/settings/compliance-section'
import { DeleteProjectSection } from '@/components/settings/delete-project-section'
import { environmentLabel } from '@/lib/environments'

function EnvironmentChip({ env }: { env: 'staging' | 'production' }) {
  const isProd = env === 'production'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-tag border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${
        isProd
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isProd ? 'bg-success' : 'bg-muted-foreground'
        }`}
      />
      {environmentLabel(env)}
    </span>
  )
}

function SectionCard({
  step,
  title,
  description,
  children,
}: {
  step: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {step}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Shows the active partner code (dcp) and lets a developer who arrived without
// one enter a code to claim system credits and raise the ceiling to 25,000.
// NOTE: the partner-credit *label* shown at the payment/terms step belongs to
// the separate Production go-live gate — it is intentionally NOT built here.
function PartnerClaim({
  partner,
  onClaim,
}: {
  partner: string | null
  onClaim: (code: string) => void
}) {
  const [code, setCode] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    onClaim(code)
    setCode('')
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {partner ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-success" />
          Partner credits active —{' '}
          <span className="font-mono text-accent">{partner}</span> (ceiling
          raised to <span className="font-mono text-foreground">25,000</span>)
        </p>
      ) : (
        <p className="text-sm text-muted-foreground text-pretty">
          Arrived without a partner code? Enter one to claim system credits and
          raise your ceiling to{' '}
          <span className="font-mono text-foreground">25,000</span>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <Field label="Partner code" htmlFor="partner-code" className="flex-1">
          <TextInput
            id="partner-code"
            placeholder="e.g. verge"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
          />
        </Field>
        <Button type="submit" variant="outline" disabled={!code.trim()}>
          {partner ? 'Update code' : 'Claim credits'}
        </Button>
      </form>
    </div>
  )
}

// Editable project name. Renames the current project in session, which the
// switcher and breadcrumb read from, so the change reflects immediately.
function ProjectName({
  name,
  onSave,
}: {
  name: string
  onSave: (name: string) => void
}) {
  const [value, setValue] = useState(name)
  const [saved, setSaved] = useState(false)
  const trimmed = value.trim()
  const dirty = trimmed !== name

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    onSave(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Field label="Project name" htmlFor="project-name" className="flex-1">
        <TextInput
          id="project-name"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
          aria-invalid={!trimmed}
        />
        {!trimmed && (
          <p className="mt-1 text-xs text-destructive">
            Project name cannot be empty.
          </p>
        )}
      </Field>
      <Button type="submit" variant="outline" disabled={!trimmed || !dirty}>
        {saved ? (
          <>
            <Check className="h-4 w-4" data-icon="inline-start" />
            Saved
          </>
        ) : (
          'Save'
        )}
      </Button>
    </form>
  )
}

export function SettingsView() {
  const {
    session,
    currentProject,
    isProductionActivated,
    claimPartner,
    renameCurrentProject,
  } = useSession()
  const [goLiveOpen, setGoLiveOpen] = useState(false)

  const { currentEnv, freeCeiling, partner } = session
  const count = currentProject.patientCount
  const pct = Math.min(100, Math.round((count / freeCeiling) * 100))
  const isProd = isProductionActivated

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Usage, billing, and the checkpoint for moving {currentProject.name} to
          production.
        </p>
      </div>

      {/* 0. Project */}
      <SectionCard
        step="00 · project"
        title="Project"
        description="The display name for this project, shown in the switcher and breadcrumb."
      >
        <ProjectName
          key={currentProject.id}
          name={currentProject.name}
          onSave={renameCurrentProject}
        />
      </SectionCard>

      {/* 1. Usage */}
      <SectionCard step="01 · usage" title="Usage">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Environment</span>
          <EnvironmentChip env={currentEnv} />
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Patients</span>
          <span className="text-sm">
            <span className="font-mono tabular-nums text-foreground">
              {count.toLocaleString()}
            </span>
            <span className="font-mono text-muted-foreground">
              {' '}
              / {freeCeiling.toLocaleString()}
            </span>
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={freeCeiling}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <PartnerClaim partner={partner} onClaim={claimPartner} />
      </SectionCard>

      {/* 2. Billing */}
      <SectionCard step="02 · billing" title="Billing">
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Free up to{' '}
          <span className="font-mono text-foreground">
            {freeCeiling.toLocaleString()}
          </span>{' '}
          patients. Beyond the ceiling, pricing is{' '}
          <span className="font-mono text-foreground">$1</span> per patient per
          year.
        </p>
        {/* MOCK — real implementation: "Add payment method" opens a real
            payment processor (e.g. Stripe) card-capture flow and persists the
            billing source server-side. SWAP POINT: this button is inert here. */}
        <Button variant="outline" className="mt-4">
          <CreditCard className="h-4 w-4" data-icon="inline-start" />
          Add payment method
        </Button>
      </SectionCard>

      {/* 3. Production checkpoint */}
      <SectionCard
        step="03 · production checkpoint"
        title="Production checkpoint"
        description="Moving to production is a required human checkpoint — intentionally not autonomous. Four steps must be completed before the environment can switch."
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Sandbox</span>
            <span className="text-border">→</span>
            <span className={isProd ? 'text-success' : 'text-foreground'}>
              production
            </span>
          </div>
          {isProd ? (
            <span className="inline-flex items-center gap-2 rounded-button border border-success/40 bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
              <Rocket className="h-4 w-4" />
              Production active
            </span>
          ) : (
            <Button
              onClick={() => setGoLiveOpen(true)}
              className="bg-primary text-primary-foreground"
            >
              <Rocket className="h-4 w-4" data-icon="inline-start" />
              Switch to production
            </Button>
          )}
        </div>
      </SectionCard>

      {/* 4. API keys */}
      <ApiKeysSection />

      {/* 5. Compliance */}
      <ComplianceSection />

      {/* 6. Danger zone — separated destructive (Pulse) area */}
      <DeleteProjectSection />

      <GoLiveFlow open={goLiveOpen} onClose={() => setGoLiveOpen(false)} />
    </div>
  )
}
