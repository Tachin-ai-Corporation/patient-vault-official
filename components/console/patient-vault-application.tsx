'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { Check, Clipboard, ExternalLink, ImagePlus, Pencil, Save, ShieldCheck } from 'lucide-react'
import { EnvBadge } from '@/components/env-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, TextInput } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { createConsoleApplication, getConsoleApplication, updateConsoleApplication } from '@/lib/api/console-application'
import { useSession } from '@/lib/session-context'

const MAX_ICON_SIZE = 5 * 1024 * 1024
const ICON_TYPES = ['image/png', 'image/svg+xml', 'image/webp']

type AppFormProps = {
  initial?: { name: string; url: string; description?: string }
  submitLabel: string
  onCancel?: () => void
  onSubmit: (form: FormData) => Promise<void>
}

function ApplicationForm({ initial, submitLabel, onCancel, onSubmit }: AppFormProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iconName, setIconName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const icon = form.get('icon')
    if (icon instanceof File && icon.size) {
      if (!ICON_TYPES.includes(icon.type)) return setError('Logo must be a PNG, SVG, or WebP file.')
      if (icon.size > MAX_ICON_SIZE) return setError('Logo must be 5 MB or smaller.')
    }
    try {
      setPending(true)
      await onSubmit(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the application.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form ref={formRef} className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Application name" htmlFor="application-name">
          <TextInput id="application-name" name="name" defaultValue={initial?.name} maxLength={50} required placeholder="Patient Vault" />
        </Field>
        <Field label="Application URL" htmlFor="application-url">
          <TextInput id="application-url" name="url" type="url" defaultValue={initial?.url} maxLength={2000} required placeholder="https://patient-vault.example.com" />
        </Field>
      </div>
      <Field label="Description" htmlFor="application-description">
        <Textarea id="application-description" name="description" defaultValue={initial?.description} maxLength={1000} rows={3} placeholder="Internal application used to manage Patient Vault custom fields." />
      </Field>
      <Field label="Logo (optional)" htmlFor="application-icon">
        <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60" htmlFor="application-icon">
          <ImagePlus aria-hidden="true" />
          <span className="flex flex-col gap-0.5"><span className="font-medium text-foreground">{iconName || 'Choose a logo'}</span><span>PNG, SVG, or WebP, up to 5 MB</span></span>
        </label>
        <input id="application-icon" name="icon" className="sr-only" type="file" accept="image/png,image/svg+xml,image/webp" onChange={(event) => setIconName(event.target.files?.[0]?.name ?? '')} />
      </Field>
      {error && <Alert variant="destructive"><AlertTitle>Application was not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={pending}><Save data-icon="inline-start" aria-hidden="true" />{pending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  )
}

export function PatientVaultApplication() {
  const { currentEnv } = useSession()
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const { data, error, isLoading, mutate } = useSWR(['console-application', currentEnv], () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const application = data?.application

  useEffect(() => {
    setEditing(false)
    setCopied(false)
  }, [currentEnv])

  async function save(form: FormData) {
    const result = application ? await updateConsoleApplication(currentEnv, form) : await createConsoleApplication(currentEnv, form)
    await mutate(result, false)
    setEditing(false)
  }

  async function copyId() {
    if (!application) return
    await navigator.clipboard.writeText(String(application.id))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section aria-labelledby="patient-vault-app-title">
      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><ShieldCheck aria-hidden="true" /></div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2"><CardTitle id="patient-vault-app-title" className="text-lg text-balance">Patient Vault application</CardTitle><EnvBadge env={currentEnv} /></div>
                <CardDescription className="max-w-2xl text-pretty">One private application owns this vault&apos;s reusable custom-field definitions.</CardDescription>
              </div>
            </div>
            {application && !editing && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil data-icon="inline-start" aria-hidden="true" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="h-32 rounded-lg bg-muted/40" aria-label="Loading application" /> : error ? (
            <Alert variant="destructive"><AlertTitle>Application unavailable</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
          ) : !application ? (
            <div className="flex flex-col gap-5"><Alert><ShieldCheck aria-hidden="true" /><AlertTitle>Application setup required</AlertTitle><AlertDescription>Create the single application for this environment before defining custom fields. It will be private and unavailable to patient launchers.</AlertDescription></Alert><ApplicationForm submitLabel="Create application" onSubmit={save} /></div>
          ) : editing ? (
            <ApplicationForm initial={application} submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={save} />
          ) : (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1"><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Name</dt><dd className="font-medium text-foreground">{application.name}</dd></div>
                <div className="flex flex-col gap-1"><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">State</dt><dd className="font-medium text-foreground">{application.state || 'DRAFT'}</dd></div>
                <div className="flex flex-col gap-1 sm:col-span-2"><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Application URL</dt><dd><a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={application.url} target="_blank" rel="noreferrer">{application.url}<ExternalLink aria-hidden="true" className="size-3.5" /></a></dd></div>
                {application.description && <div className="flex flex-col gap-1 sm:col-span-2"><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Description</dt><dd className="text-sm leading-relaxed text-muted-foreground">{application.description}</dd></div>}
              </dl>
              <div className="flex min-w-48 flex-col gap-2 rounded-lg border bg-muted/30 p-4"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Application ID</span><div className="flex items-center justify-between gap-3"><strong className="font-mono text-xl text-foreground">{application.id}</strong><Button type="button" variant="ghost" size="icon" onClick={copyId} aria-label="Copy application ID">{copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}</Button></div><p className="text-xs leading-relaxed text-muted-foreground">Environment-specific. Added automatically to custom-field API calls.</p></div>
            </div>
          )}
        </CardContent>
        {application && !editing && <CardFooter className="border-t text-xs text-muted-foreground">The v2 application API is restricted to Console. Patient screens never receive or call it.</CardFooter>}
      </Card>
    </section>
  )
}
