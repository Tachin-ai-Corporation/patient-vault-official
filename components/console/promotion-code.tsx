'use client'

import { useState } from 'react'
import { Check, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'

// ---- Demo-only partner codes ----------------------------------------------
// UI STUB: this does NOT wire real billing. Entering a valid demo code only
// changes the illustrative status line below the input. The actual
// go-to-market allotment resolves server-side against the developer account
// from the entered code.
// SWAP POINT: in production, Apply POSTs the code and the server returns the
// resolved partner + allotment.
// Only VERGE is live for now. Combustion Ventures partners use the Verge code
// too — there is no separate CV code yet.
const PARTNER_NAMES: Record<string, string> = {
  VERGE: 'Verge Fund',
}

const STANDARD_STATUS =
  'Standard tier · 1,000 patients free, then $1/patient/year.'
// The number shown here is illustrative only; the real allotment resolves
// server-side against the developer account from the entered code.
const PROMO_STATUS =
  'Partner terms active · 25,000 patients free, then $1/patient/year.'

export function PromotionCode() {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleApply() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    if (normalized in PARTNER_NAMES) {
      setApplied(normalized)
      setError(null)
      setCode('')
    } else {
      setApplied(null)
      setError('Code not recognized.')
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border border-border bg-muted text-accent">
          <Tag className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Partner code
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Enter your partner code to activate your channel&apos;s go-to-market
            terms.
          </p>
        </div>
      </div>

      {/* Input + Apply */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Field
            label="Partner code"
            htmlFor="promo-code"
            error={error ?? undefined}
          >
            <TextInput
              id="promo-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleApply()
                }
              }}
              placeholder="Enter partner code"
              autoCapitalize="characters"
              className="font-mono"
            />
          </Field>
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={code.trim().length === 0}
        >
          Apply
        </Button>
      </div>

      {/* Status line */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {applied && (
          <span className="inline-flex items-center gap-1.5 rounded-tag border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <Check className="h-3.5 w-3.5" />
            Applied · {PARTNER_NAMES[applied]}
          </span>
        )}
        <p className="text-sm text-muted-foreground">
          {applied ? PROMO_STATUS : STANDARD_STATUS}
        </p>
      </div>
    </section>
  )
}
