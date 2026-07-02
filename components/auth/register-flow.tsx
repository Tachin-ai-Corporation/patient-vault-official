'use client'

import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Field, TextInput } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

type Step = 'email' | 'code' | 'terms'

// A 6-digit, mono, box-per-digit code entry. Accepts any 6 digits (mock).
function CodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function setDigit(index: number, digit: string) {
    const clean = digit.replace(/\D/g, '').slice(-1)
    const next = value.split('')
    next[index] = clean
    const joined = next.join('').slice(0, 6)
    onChange(joined)
    if (clean && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted)
      inputs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-full rounded-input border border-input bg-background text-center font-mono text-lg text-foreground transition-colors focus-visible:border-aqua/60"
        />
      ))}
    </div>
  )
}

function Clickwrap({
  id,
  checked,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-input border border-border bg-muted/40 p-3 text-sm text-foreground"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="leading-relaxed">{children}</span>
    </label>
  )
}

export function RegisterFlow() {
  const router = useRouter()
  const { register } = useSession()

  const [step, setStep] = useState<Step>('email')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submitEmail(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name to continue.')
      return
    }
    if (!email.trim()) {
      setError('Enter an email to continue.')
      return
    }
    if (!password.trim()) {
      setError('Choose a password to continue.')
      return
    }
    // MOCK — no real email is sent. SWAP POINT: real email OTP delivery.
    setError(null)
    setStep('code')
  }

  function submitCode(e: FormEvent) {
    e.preventDefault()
    // Accept any 6 digits (mock).
    if (code.length < 6) {
      setError('Enter the 6-digit code.')
      return
    }
    setError(null)
    setStep('terms')
  }

  function completeRegistration(e: FormEvent) {
    e.preventDefault()
    if (!terms || !privacy) return
    // MOCK — provisions the user's first project in Staging (0 patients,
    // named "{First} {Last}'s Patient Vault") and establishes a session. Any
    // dcp partner code on this URL is already carried into session state, so
    // the 25,000 ceiling + partner code persist through to Settings.
    register(firstName, lastName, email)
    router.replace('/patients')
  }

  return (
    <div className="mt-8">
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {(['email', 'code', 'terms'] as Step[]).map((s, i) => {
          const order: Step[] = ['email', 'code', 'terms']
          const active = order.indexOf(step) >= i
          return (
            <span
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                active ? 'bg-accent' : 'bg-muted'
              }`}
            />
          )
        })}
      </div>

      {step === 'email' && (
        <form onSubmit={submitEmail} className="flex flex-col gap-4" noValidate>
          <p className="text-center text-sm text-muted-foreground text-pretty">
            Tell us who you are.
          </p>
          <div className="flex gap-3">
            <Field
              label="First name"
              htmlFor="register-first"
              className="flex-1"
            >
              <TextInput
                id="register-first"
                autoComplete="given-name"
                placeholder="Neil"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  setError(null)
                }}
              />
            </Field>
            <Field
              label="Last name"
              htmlFor="register-last"
              className="flex-1"
            >
              <TextInput
                id="register-last"
                autoComplete="family-name"
                placeholder="Sethi"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  setError(null)
                }}
              />
            </Field>
          </div>
          <Field label="Work email" htmlFor="register-email">
            <TextInput
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@yourcompany.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
            />
          </Field>
          <Field label="Password" htmlFor="register-password">
            <TextInput
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
            />
          </Field>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            Send code
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={submitCode} className="flex flex-col gap-4" noValidate>
          <p className="text-center text-sm text-muted-foreground text-pretty">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <CodeInput value={code} onChange={setCode} />
          {error && (
            <p className="text-center text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full">
            Verify
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setCode('')}
          >
            Resend code
          </Button>
        </form>
      )}

      {step === 'terms' && (
        <form
          onSubmit={completeRegistration}
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="rounded-input border border-accent/30 bg-accent/10 p-3 text-[13px] leading-relaxed text-foreground text-pretty">
            You&apos;re starting in Staging — synthetic test data only, no real
            patient data (PHI) permitted. Your BAA is executed later, when you
            activate Production.
          </p>

          <Clickwrap id="terms" checked={terms} onChange={setTerms}>
            I agree to the{' '}
            <Link
              href="/terms"
              className="text-accent underline underline-offset-4"
            >
              Terms &amp; Conditions
            </Link>
            .
          </Clickwrap>

          <Clickwrap id="privacy" checked={privacy} onChange={setPrivacy}>
            I agree to the{' '}
            <Link
              href="/privacy"
              className="text-accent underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </Clickwrap>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!terms || !privacy}
          >
            Create account
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
