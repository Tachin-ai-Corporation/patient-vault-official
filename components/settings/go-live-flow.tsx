'use client'

// The PRODUCTION GO-LIVE GATE — a deliberate human checkpoint. Production
// activation in a healthcare environment is intentionally never automated.
//
// SCOPE / SWAP POINTS (all mocked here):
//  - Credit card: a non-functional field group. NO real payment is processed.
//    In production this is a PCI-compliant card-capture (e.g. Stripe Elements).
//  - Project-name verification is confirmed client-side here; real
//    implementation checks it server-side against the project's legal record.
//  - Developer Agreement + BAA are clickwrap records; real implementation
//    persists an executed agreement with timestamp + version.
//  - The production secret key is generated client-side for display only and
//    authenticates nothing; real issuance happens server-side and returns the
//    secret exactly once.

import { useMemo, useState, type FormEvent } from 'react'
import { Check, CreditCard, ShieldCheck, KeyRound, Lock } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { CopyButton } from '@/components/ui/copy-button'

type Props = {
  open: boolean
  onClose: () => void
}

type Phase = 'readiness' | 'steps' | 'success'

const READINESS_ITEMS = [
  'My Sandbox integration is validated and working end to end.',
  'I understand production starts empty — no synthetic or test data carries over.',
]

// Client-side placeholder secret — shown once, authenticates nothing.
function generateLiveSecret(): string {
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let body = ''
  for (let i = 0; i < 32; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `pv_sk_live_${body}`
}

function maskLiveSecret(): string {
  // Show "pv_sk_live_" then dots.
  return `pv_sk_live_${'•'.repeat(24)}`
}

function StepShell({
  index,
  title,
  complete,
  children,
}: {
  index: number
  title: string
  complete: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
            complete
              ? 'border-success bg-success text-background'
              : 'border-border bg-background text-muted-foreground'
          }`}
        >
          {complete ? <Check className="h-3.5 w-3.5" /> : index}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {complete && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-success">
            complete
          </span>
        )}
      </div>
      <div className="pl-9">{children}</div>
    </div>
  )
}

export function GoLiveFlow({ open, onClose }: Props) {
  const { currentProject, session, activateProductionForProject } =
    useSession()
  const projectName = currentProject.name
  const partner = session.partner

  const [phase, setPhase] = useState<Phase>('readiness')

  // Readiness acknowledgements
  const [acks, setAcks] = useState<boolean[]>(
    () => READINESS_ITEMS.map(() => false),
  )
  const allAcked = acks.every(Boolean)

  // Step 1 — credit card (non-functional)
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' })
  // Step 2 — verify project legal name
  const [projectConfirm, setProjectConfirm] = useState('')
  // Steps 3 + 4 — clickwrap
  const [devAgreement, setDevAgreement] = useState(false)
  const [baa, setBaa] = useState(false)

  // Success — the production secret shown exactly once
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)

  const cardComplete =
    card.number.trim().length >= 12 &&
    card.exp.trim().length >= 4 &&
    card.cvc.trim().length >= 3
  const projectComplete =
    projectConfirm.trim().toLowerCase() === projectName.trim().toLowerCase()
  const allComplete = cardComplete && projectComplete && devAgreement && baa

  const completedCount = useMemo(
    () =>
      [cardComplete, projectComplete, devAgreement, baa].filter(Boolean).length,
    [cardComplete, projectComplete, devAgreement, baa],
  )

  function reset() {
    setPhase('readiness')
    setAcks(READINESS_ITEMS.map(() => false))
    setCard({ number: '', exp: '', cvc: '' })
    setProjectConfirm('')
    setDevAgreement(false)
    setBaa(false)
    setRevealedSecret(null)
  }

  function handleClose() {
    onClose()
    // Reset after the modal animates away so content doesn't flash.
    setTimeout(reset, 200)
  }

  function handleActivate() {
    if (!allComplete) return
    const secret = generateLiveSecret()
    // Persist only the masked form; the full secret lives in local state for
    // this one success screen and is discarded when the flow closes.
    activateProductionForProject(maskLiveSecret())
    setRevealedSecret(secret)
    setPhase('success')
  }

  const title =
    phase === 'success' ? 'Production is live' : 'Activate production'
  const description =
    phase === 'readiness'
      ? 'Activating production lets your app handle real patient data (PHI). This is a required human checkpoint — by policy, production activation is never automated.'
      : phase === 'steps'
        ? 'Complete all four steps to activate. Each is a deliberate, recorded confirmation.'
        : undefined

  let footer: React.ReactNode = null
  if (phase === 'readiness') {
    footer = (
      <>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={() => setPhase('steps')} disabled={!allAcked}>
          Continue
        </Button>
      </>
    )
  } else if (phase === 'steps') {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setPhase('readiness')}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {completedCount}/4
          </span>
          <Button
            onClick={handleActivate}
            disabled={!allComplete}
            className="bg-primary text-primary-foreground"
          >
            <ShieldCheck className="h-4 w-4" data-icon="inline-start" />
            Activate production
          </Button>
        </div>
      </>
    )
  } else {
    footer = (
      <Button
        onClick={handleClose}
        className="bg-primary text-primary-foreground"
      >
        Done
      </Button>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      className="max-w-xl"
      footer={footer}
    >
      {phase === 'readiness' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Before you continue, confirm you&apos;re ready. These are
            acknowledgements, not configuration.
          </p>
          <div className="flex flex-col gap-2.5">
            {READINESS_ITEMS.map((item, i) => (
              <label
                key={item}
                className="flex items-start gap-2.5 rounded-card border border-border bg-muted/30 p-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={acks[i]}
                  onChange={(e) =>
                    setAcks((prev) => {
                      const next = [...prev]
                      next[i] = e.target.checked
                      return next
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {phase === 'steps' && (
        <div className="flex flex-col gap-3">
          {/* Step 1 — credit card */}
          <StepShell index={1} title="Add a credit card" complete={cardComplete}>
            <div className="flex flex-col gap-3">
              {/* Partner credit applies at the payment step, when present. */}
              {partner && (
                <div className="flex items-start gap-2 rounded-input border border-teal/40 bg-teal/10 px-3 py-2 text-sm text-teal">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-relaxed">
                    Promotion applied:{' '}
                    <span className="font-mono font-medium">{partner}</span> —
                    system credits applied to this account.
                  </span>
                </div>
              )}
              <Field label="Card number" htmlFor="golive-cc-number">
                <TextInput
                  id="golive-cc-number"
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  value={card.number}
                  onChange={(e) =>
                    setCard((c) => ({ ...c, number: e.target.value }))
                  }
                  className="font-mono"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry" htmlFor="golive-cc-exp">
                  <TextInput
                    id="golive-cc-exp"
                    placeholder="MM/YY"
                    value={card.exp}
                    onChange={(e) =>
                      setCard((c) => ({ ...c, exp: e.target.value }))
                    }
                    className="font-mono"
                  />
                </Field>
                <Field label="CVC" htmlFor="golive-cc-cvc">
                  <TextInput
                    id="golive-cc-cvc"
                    inputMode="numeric"
                    placeholder="123"
                    value={card.cvc}
                    onChange={(e) =>
                      setCard((c) => ({ ...c, cvc: e.target.value }))
                    }
                    className="font-mono"
                  />
                </Field>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                No charge today. Free up to your patient ceiling.
              </p>
            </div>
          </StepShell>

          {/* Step 2 — verify project name */}
          <StepShell
            index={2}
            title="Verify project name"
            complete={projectComplete}
          >
            <Field
              label={`Type the legal name to confirm: ${projectName}`}
              htmlFor="golive-project-confirm"
            >
              <TextInput
                id="golive-project-confirm"
                placeholder={projectName}
                value={projectConfirm}
                onChange={(e) => setProjectConfirm(e.target.value)}
              />
            </Field>
          </StepShell>

          {/* Step 3 — Developer Agreement */}
          <StepShell
            index={3}
            title="Sign the Developer Agreement"
            complete={devAgreement}
          >
            <label className="flex items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={devAgreement}
                onChange={(e) => setDevAgreement(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="leading-relaxed text-muted-foreground">
                I agree to the{' '}
                <a
                  href="/developer-agreement"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Developer Agreement
                </a>
                .
              </span>
            </label>
          </StepShell>

          {/* Step 4 — BAA */}
          <StepShell index={4} title="Execute the BAA" complete={baa}>
            <label className="flex items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={baa}
                onChange={(e) => setBaa(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="leading-relaxed text-muted-foreground">
                BAA executed at production activation — one standard document,
                public at{' '}
                <a
                  href="/baa"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  /baa
                </a>
                , no negotiation.
              </span>
            </label>
          </StepShell>
        </div>
      )}

      {phase === 'success' && revealedSecret && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-card border border-success/40 bg-success/10 p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-background">
              <Check className="h-4 w-4" />
            </span>
            <p className="text-sm leading-relaxed text-foreground text-pretty">
              <span className="font-medium">{projectName}</span> is now in
              production. Your environment is live and started empty — add real
              patients when you&apos;re ready.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium text-foreground">
                Your production secret key
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-input border border-border bg-muted/50 px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                {revealedSecret}
              </code>
              <CopyButton value={revealedSecret} label="Copy production key" />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground text-pretty">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This is the only time the full key is shown. Store it somewhere
              safe now — afterwards it is permanently masked in the API Keys
              section.
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
