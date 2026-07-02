'use client'

import { useEffect, useState } from 'react'
import { Check, FileText, Lock, UserRound } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'

export function DeveloperProfile() {
  const { session, updateUserName } = useSession()
  const { user } = session

  const [first, setFirst] = useState(user.first_name)
  const [last, setLast] = useState(user.last_name)
  const [saved, setSaved] = useState(false)

  // Keep the form in sync if the underlying user changes elsewhere.
  useEffect(() => {
    setFirst(user.first_name)
    setLast(user.last_name)
  }, [user.first_name, user.last_name])

  const dirty =
    first.trim() !== user.first_name || last.trim() !== user.last_name
  const valid = first.trim().length > 0 && last.trim().length > 0

  function handleSave() {
    if (!valid || !dirty) return
    updateUserName(first, last)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border border-border bg-muted text-accent">
          <UserRound className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Developer profile
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Update your name. Your email is set by your identity provider and
            can&apos;t be changed here.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First name" htmlFor="dev-first">
          <TextInput
            id="dev-first"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="Neil"
          />
        </Field>
        <Field label="Last name" htmlFor="dev-last">
          <TextInput
            id="dev-last"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Sethi"
          />
        </Field>
      </div>

      {/* Email — visible but locked */}
      <div className="mt-3">
        <Field label="Email" htmlFor="dev-email">
          <div className="relative">
            <TextInput
              id="dev-email"
              value={user.email}
              readOnly
              disabled
              aria-describedby="dev-email-locked"
              className="cursor-not-allowed pr-9 text-muted-foreground"
            />
            <Lock
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </Field>
        <p id="dev-email-locked" className="mt-1 text-xs text-muted-foreground">
          Email is managed by your identity provider and cannot be edited.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={!valid || !dirty}>
          <Check className="h-4 w-4" data-icon="inline-start" />
          Save changes
        </Button>
        {saved && (
          <span role="status" className="text-sm text-muted-foreground">
            Saved.
          </span>
        )}
      </div>

      {/* Signed legal agreements */}
      <div className="mt-5 border-t border-border pt-4">
        <a
          href="/terms"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          <FileText className="h-4 w-4" />
          View your signed Terms &amp; Conditions and Privacy Policy
        </a>
      </div>
    </section>
  )
}
