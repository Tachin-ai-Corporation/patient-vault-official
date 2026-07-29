'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  FileSliders,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer } from '@/components/ui/drawer'
import { Field, TextInput } from '@/components/ui/field'
import { findEnvironment } from '@/lib/environments'
import { MOCK_CUSTOM_FIELD_NAMES } from '@/lib/mock-custom-fields'

const MOCK_OPAQUE_ACTIVATION_STATE = 'pv_state_7f4c29a1e6b8430db52a'
const TOTAL_STEPS = 3

type Step = 1 | 2 | 3

function buildRegistrationUrl(returnTo: string): string {
  const registrationUrl = new URL('https://app.1health.io/register')
  registrationUrl.searchParams.set('app', 'patient-vault')
  registrationUrl.searchParams.set('state', MOCK_OPAQUE_ACTIVATION_STATE)
  registrationUrl.searchParams.set('return_to', returnTo)
  return registrationUrl.toString()
}

function StepProgress({ step }: { step: Step }) {
  return (
    <div className="flex flex-col gap-2" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </p>
        <p className="text-xs text-muted-foreground">
          {step === 1 && 'Review fields'}
          {step === 2 && 'Accept agreement'}
          {step === 3 && 'Confirm activation'}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-hidden="true">
        {[1, 2, 3].map((number) => (
          <span
            key={number}
            className={
              number <= step
                ? 'h-1 rounded-full bg-primary'
                : 'h-1 rounded-full bg-muted'
            }
          />
        ))}
      </div>
    </div>
  )
}

function SummaryItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileSliders
  title: string
  description: string
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </li>
  )
}

export function GoToProduction() {
  const production = findEnvironment('production')
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [legalEntityName, setLegalEntityName] = useState('')

  if (production?.status !== 'none') return null

  const canContinueToConfirm =
    agreementAccepted && legalEntityName.trim().length >= 2

  function closeDrawer() {
    setOpen(false)
  }

  function openDrawer() {
    setStep(1)
    setOpen(true)
  }

  function activateProduction() {
    const destination = buildRegistrationUrl(window.location.href)
    window.location.assign(destination)
  }

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Go to production</CardTitle>
          <CardDescription className="max-w-2xl leading-relaxed">
            Activate a live environment when you are ready to work with real
            patient data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 md:grid-cols-3">
            <SummaryItem
              icon={FileSliders}
              title="Definitions copy"
              description="Your custom field definitions copy to production."
            />
            <SummaryItem
              icon={FileCheck2}
              title="Records stay separate"
              description="Patient records and documents do not copy across."
            />
            <SummaryItem
              icon={ShieldCheck}
              title="BAA required"
              description="A business associate agreement is required first."
            />
          </ul>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="button" onClick={openDrawer}>
            Activate production
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>

      <Drawer
        open={open}
        onClose={closeDrawer}
        title="Activate production"
        className="max-w-lg"
      >
        <div className="flex min-h-full flex-col">
          <div className="flex flex-1 flex-col gap-6 p-6">
            <StepProgress step={step} />

            {step === 1 && (
              <section className="flex flex-col gap-5" aria-labelledby="copy-fields-title">
                <div className="flex flex-col gap-1.5">
                  <h3 id="copy-fields-title" className="text-lg font-semibold text-foreground">
                    Custom fields to copy
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {MOCK_CUSTOM_FIELD_NAMES.length} custom field{' '}
                    {MOCK_CUSTOM_FIELD_NAMES.length === 1 ? 'definition' : 'definitions'} will copy to production.
                  </p>
                </div>

                {MOCK_CUSTOM_FIELD_NAMES.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No custom fields to copy.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {MOCK_CUSTOM_FIELD_NAMES.map((fieldName) => (
                      <li
                        key={fieldName}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground"
                      >
                        <Check className="text-success" aria-hidden="true" />
                        {fieldName}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-sm leading-relaxed text-muted-foreground">
                  Patient records and documents remain in staging and will not
                  copy to production.
                </p>
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-5" aria-labelledby="baa-title">
                <div className="flex flex-col gap-1.5">
                  <h3 id="baa-title" className="text-lg font-semibold text-foreground">
                    Business associate agreement
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Production access requires an accepted BAA for the legal
                    entity operating this vault.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                  <Checkbox
                    id="accept-baa"
                    checked={agreementAccepted}
                    onCheckedChange={(checked) =>
                      setAgreementAccepted(checked === true)
                    }
                    aria-describedby="baa-help"
                  />
                  <label
                    htmlFor="accept-baa"
                    className="text-sm leading-relaxed text-foreground"
                  >
                    I accept the business associate agreement.
                  </label>
                </div>

                <Field label="Legal entity name" htmlFor="legal-entity-name">
                  <TextInput
                    id="legal-entity-name"
                    name="legalEntityName"
                    value={legalEntityName}
                    onChange={(event) => setLegalEntityName(event.target.value)}
                    placeholder="Example Health, Inc."
                    autoComplete="organization"
                    aria-describedby="legal-entity-help"
                  />
                </Field>
                <p id="legal-entity-help" className="text-xs leading-relaxed text-muted-foreground">
                  Enter at least two characters using the organization&apos;s
                  legal name.
                </p>

                <p id="baa-help" className="text-sm text-muted-foreground">
                  Review the full{' '}
                  <Link
                    href="/baa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    business associate agreement
                  </Link>
                  .
                </p>
              </section>
            )}

            {step === 3 && (
              <section className="flex flex-col gap-5" aria-labelledby="confirm-title">
                <div className="flex flex-col gap-1.5">
                  <h3 id="confirm-title" className="text-lg font-semibold text-foreground">
                    Ready to activate production
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Continue to 1health to finish registration for{' '}
                    <span className="font-medium text-foreground">
                      {legalEntityName.trim()}
                    </span>
                    .
                  </p>
                </div>
                <ul className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="text-success" aria-hidden="true" />
                    {MOCK_CUSTOM_FIELD_NAMES.length} custom field definitions queued
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-success" aria-hidden="true" />
                    Business associate agreement accepted
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-success" aria-hidden="true" />
                    Patient records and documents remain separate
                  </li>
                </ul>
              </section>
            )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border p-5">
            {step === 1 ? (
              <Button type="button" variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((step - 1) as Step)}
              >
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>
            )}

            {step === 1 && (
              <Button type="button" onClick={() => setStep(2)}>
                Continue
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                disabled={!canContinueToConfirm}
                onClick={() => setStep(3)}
              >
                Continue to step 3
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 3 && (
              <Button type="button" onClick={activateProduction}>
                Activate production
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
          </footer>
        </div>
      </Drawer>
    </>
  )
}
