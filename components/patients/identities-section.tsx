'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CheckCircle2, Eye, Loader2, Pencil, Plus, Power, PowerOff, RefreshCw, Trash2 } from 'lucide-react'
import { RecordSectionCard } from '@/components/patients/record-section-card'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { validateAndNormalizeExternalIdentity } from '@/lib/external-identity'
import {
  addIdentifier,
  deleteIdentifier,
  getIdentifier,
  listIdentifiers,
  patchIdentifier,
  type IdentifierStatus,
  type PatientIdentifier,
  type PatientIdentifierInput,
} from '@/lib/api/patient'

const EMPTY_INPUT: PatientIdentifierInput = { value: '', type: '' }

function authorityKeys(identifier: PatientIdentifier) {
  const organizationId = identifier.organization_id == null ? '' : String(identifier.organization_id)
  const externalSystemId = identifier.external_system_id == null ? '' : String(identifier.external_system_id)
  return { organizationId, externalSystemId, available: Boolean(organizationId && externalSystemId) }
}

function formatDate(value?: string | null) {
  if (!value) return 'Open-ended'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function IdentitiesSection({ patientId }: { patientId: string }) {
  const [status, setStatus] = useState<IdentifierStatus>('true')
  const { data, error, isLoading, mutate } = useSWR(
    `identifiers:${patientId}:${status}`,
    () => listIdentifiers(patientId, status),
    { revalidateOnFocus: false },
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PatientIdentifier | null>(null)
  const [draft, setDraft] = useState<PatientIdentifierInput>(EMPTY_INPUT)
  const [advanced, setAdvanced] = useState(false)
  const [detail, setDetail] = useState<PatientIdentifier | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PatientIdentifier | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorErrorField, setEditorErrorField] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const identifiers = data ?? []
  const summary = isLoading
    ? 'Loading identities'
    : `${identifiers.length} identit${identifiers.length === 1 ? 'y' : 'ies'}`

  function updateDraft(patch: Partial<PatientIdentifierInput>) {
    setDraft((current) => ({ ...current, ...patch }))
    setEditorError(null)
    setEditorErrorField(null)
  }

  function updateAuthority(
    field: 'authority_organization_id' | 'authority_organization_name' | 'authority_external_system_id' | 'authority_external_system_name',
    value: string,
  ) {
    const pairedField = {
      authority_organization_id: 'authority_organization_name',
      authority_organization_name: 'authority_organization_id',
      authority_external_system_id: 'authority_external_system_name',
      authority_external_system_name: 'authority_external_system_id',
    }[field] as keyof PatientIdentifierInput

    updateDraft({ [field]: value, ...(value ? { [pairedField]: '' } : {}) })
  }

  function closeEditor() {
    if (busy) return
    setEditorOpen(false)
    setEditorError(null)
    setEditorErrorField(null)
  }

  function openAdd() {
    setEditing(null)
    setDraft(EMPTY_INPUT)
    setAdvanced(false)
    setActionError(null)
    setEditorError(null)
    setSuccessMessage(null)
    setEditorOpen(true)
  }

  async function openEdit(identifier: PatientIdentifier) {
    const keys = authorityKeys(identifier)
    if (!keys.available) return
    setBusy(true)
    setActionError(null)
    try {
      const fresh = await getIdentifier(patientId, keys.organizationId, keys.externalSystemId)
      setEditing(fresh)
      setDraft({
        value: fresh.value,
        type: fresh.type ?? '',
        source_name: fresh.source_name ?? fresh.source ?? '',
        active_from: toDateTimeLocal(fresh.active_from),
        active_until: toDateTimeLocal(fresh.active_until),
      })
      setAdvanced(true)
      setEditorError(null)
      setSuccessMessage(null)
      setEditorOpen(true)
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function viewIdentifier(identifier: PatientIdentifier) {
    const keys = authorityKeys(identifier)
    if (!keys.available) return
    setBusy(true)
    setActionError(null)
    try {
      setDetail(await getIdentifier(patientId, keys.organizationId, keys.externalSystemId))
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function showEditorError(message: string, fieldId: string) {
    setEditorError(message)
    setEditorErrorField(fieldId)
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
    })
  }

  async function save() {
    const validation = validateAndNormalizeExternalIdentity(draft)
    if (!validation.ok) {
      showEditorError(validation.message, validation.fieldId)
      return
    }

    setBusy(true)
    setEditorError(null)
    setEditorErrorField(null)
    setActionError(null)
    try {
      if (editing) {
        const keys = authorityKeys(editing)
        await patchIdentifier(patientId, keys.organizationId, keys.externalSystemId, validation.body)
      } else {
        await addIdentifier(patientId, validation.body)
      }

      const success = editing ? 'External identity updated.' : 'External identity added.'
      setEditorOpen(false)
      setEditing(null)
      setDraft(EMPTY_INPUT)
      setSuccessMessage(success)
      void mutate()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 400 && validation.body.authority_organization_id) {
        showEditorError('This organization ID was not accepted. Enter an existing organization ID, use the organization name instead, or leave both organization fields blank.', 'identity-org-id')
      } else if (cause instanceof ApiError && cause.status === 400 && validation.body.authority_external_system_id) {
        showEditorError('This external system ID was not accepted. Enter an existing external system ID, use the external system name instead, or leave both external-system fields blank.', 'identity-system-id')
      } else {
        showEditorError((cause as Error).message, 'identity-value')
      }
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(identifier: PatientIdentifier) {
    const keys = authorityKeys(identifier)
    if (!keys.available) return
    setBusy(true)
    setActionError(null)
    try {
      await patchIdentifier(patientId, keys.organizationId, keys.externalSystemId, {
        active_until: identifier.active_until ? null : new Date().toISOString(),
      })
      await mutate()
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const keys = authorityKeys(pendingDelete)
    setBusy(true)
    setActionError(null)
    try {
      await deleteIdentifier(patientId, keys.organizationId, keys.externalSystemId)
      setPendingDelete(null)
      await mutate()
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <RecordSectionCard
        title="external identities"
        patientId={patientId}
        customFieldSection="external-identities"
        summary={summary}
        action={
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
            Add identity
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter identities" className="inline-flex rounded-input border border-border bg-muted/30 p-0.5">
            {([['true', 'Active'], ['false', 'Inactive'], ['all', 'All']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`rounded-input px-3 py-1 text-xs font-medium ${status === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Authority pair keys stay out of the URL until an item action is requested.</p>
        </div>

        {successMessage && (
          <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-input border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0 text-accent" aria-hidden="true" />{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        {actionError && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-input border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 rounded-input border border-border bg-muted/20 p-3">
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}><RefreshCw className="h-3.5 w-3.5" />Retry</Button>
          </div>
        ) : identifiers.length === 0 ? (
          <div className="rounded-input border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No external identities in this view</p>
            <p className="mt-1 text-sm text-muted-foreground">Link an ID from another system. Authority can be left blank to use API defaults.</p>
            <Button variant="outline" size="sm" onClick={openAdd} className="mt-4">Add identity</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {identifiers.map((identifier, index) => {
              const keys = authorityKeys(identifier)
              const inactive = Boolean(identifier.active_until)
              return (
                <article key={`${keys.organizationId}:${keys.externalSystemId}:${index}`} className={`flex flex-col gap-3 rounded-input border border-border p-3 sm:flex-row sm:items-center sm:justify-between ${inactive ? 'bg-muted/20 opacity-70' : 'bg-card'}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-sm font-semibold text-foreground">{identifier.value}</span>
                      {identifier.type && <span className="rounded-tag bg-muted px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{identifier.type}</span>}
                      <span className={`rounded-tag border px-2 py-0.5 text-[10px] uppercase ${inactive ? 'border-border text-muted-foreground' : 'border-accent/40 text-accent'}`}>{inactive ? 'Inactive' : 'Active'}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[identifier.organization_name || (keys.organizationId && `Org ${keys.organizationId}`), identifier.external_system_name || (keys.externalSystemId && `System ${keys.externalSystemId}`)].filter(Boolean).join(' · ') || 'Default CONEXT / Unknown authority'}
                    </p>
                    {identifier.source_name || identifier.source ? <p className="mt-1 text-xs text-muted-foreground">Source: {identifier.source_name || identifier.source}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => viewIdentifier(identifier)} disabled={!keys.available || busy} aria-label={`Fetch ${identifier.value}`} title={keys.available ? 'GET item' : 'Authority IDs were not returned'}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(identifier)} disabled={!keys.available || busy} aria-label={`Edit ${identifier.value}`} title="GET item, then PATCH update"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(identifier)} disabled={!keys.available || busy} aria-label={`${inactive ? 'Reactivate' : 'Deactivate'} ${identifier.value}`} title="PATCH activity">{inactive ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}</Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setPendingDelete(identifier)} disabled={!keys.available || busy} aria-label={`Delete ${identifier.value}`} className="text-muted-foreground hover:text-destructive" title="DELETE (soft-delete)"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </RecordSectionCard>

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editing ? 'Edit external identity' : 'Add external identity'}
        description={editing ? 'Replace this identity after reviewing its values.' : 'Required: identifier value. Every other field is optional; you may add an identity without opening authority details.'}
        className="max-w-2xl"
        footer={
          <>
            <div className="min-w-0 flex-1" aria-live="polite">
              {busy ? (
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                  Sending identity to 1health…
                </p>
              ) : editorError ? (
                <p role="alert" className="text-sm font-medium text-destructive">Couldn&apos;t save: {editorError}</p>
              ) : (
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Required:</span> Identifier value only</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={closeEditor} disabled={busy}>Cancel</Button>
              <Button onClick={save} disabled={busy} aria-busy={busy} className="min-w-32">
                {busy ? <><Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden="true" />Saving identity…</> : editing ? 'Replace identity' : 'Add identity'}
              </Button>
            </div>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Identifier value (required)" htmlFor="identity-value" error={editorErrorField === 'identity-value' ? editorError ?? undefined : undefined}>
              <TextInput id="identity-value" required aria-invalid={editorErrorField === 'identity-value'} aria-describedby={editorErrorField === 'identity-value' ? 'identity-editor-error' : undefined} invalid={editorErrorField === 'identity-value'} value={draft.value} onChange={(event) => updateDraft({ value: event.target.value })} placeholder="MRN-88821" className="font-mono" />
            </Field>
            <Field label="Type (optional)" htmlFor="identity-type">
              <Select id="identity-type" value={draft.type ?? ''} onChange={(event) => updateDraft({ type: event.target.value })}>
                <option value="">Unspecified</option>
                {['mrn', 'member_id', 'ssn', 'npi', 'passport', 'driver_license', 'custom'].map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
          </div>
          {!editing && (
            <button type="button" onClick={() => setAdvanced((value) => !value)} className="self-start text-sm font-medium text-accent hover:underline" aria-expanded={advanced}>{advanced ? 'Hide authority details' : 'Add authority details'}</button>
          )}
          {(advanced || editing) && (
            <div className="grid gap-3 rounded-input border border-border bg-muted/20 p-4 sm:grid-cols-2">
              {!editing && <>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <p className="text-sm font-medium text-foreground">Authority details are optional</p>
                  <p className="text-pretty text-xs leading-relaxed text-muted-foreground">Leave all four fields blank to use the API defaults. If you add an organization or external system, choose its name or its ID. A name may be new; an ID must already exist in 1health. Typing in one field clears the alternative beside it.</p>
                </div>
                <Field label="Organization ID — optional; existing numeric ID only" htmlFor="identity-org-id" error={editorErrorField === 'identity-org-id' ? editorError ?? undefined : undefined}><TextInput id="identity-org-id" inputMode="numeric" pattern="[0-9]*" aria-invalid={editorErrorField === 'identity-org-id'} invalid={editorErrorField === 'identity-org-id'} value={draft.authority_organization_id ?? ''} onChange={(event) => updateAuthority('authority_organization_id', event.target.value)} placeholder="e.g. 123" /></Field>
                <Field label="Organization name — optional" htmlFor="identity-org-name"><TextInput id="identity-org-name" value={draft.authority_organization_name ?? ''} onChange={(event) => updateAuthority('authority_organization_name', event.target.value)} placeholder="e.g. Legacy EHR" /></Field>
                <Field label="External system ID — optional; existing numeric ID only" htmlFor="identity-system-id" error={editorErrorField === 'identity-system-id' ? editorError ?? undefined : undefined}><TextInput id="identity-system-id" inputMode="numeric" pattern="[0-9]*" aria-invalid={editorErrorField === 'identity-system-id'} invalid={editorErrorField === 'identity-system-id'} value={draft.authority_external_system_id ?? ''} onChange={(event) => updateAuthority('authority_external_system_id', event.target.value)} placeholder="e.g. 456" /></Field>
                <Field label="External system name — optional" htmlFor="identity-system-name"><TextInput id="identity-system-name" value={draft.authority_external_system_name ?? ''} onChange={(event) => updateAuthority('authority_external_system_name', event.target.value)} placeholder="e.g. Epic" /></Field>
              </>}
              <Field label="Source (optional)" htmlFor="identity-source"><TextInput id="identity-source" value={draft.source_name ?? ''} onChange={(event) => updateDraft({ source_name: event.target.value })} placeholder="ADT import" /></Field>
              <div className="hidden sm:block" />
              <Field label="Active from (optional)" htmlFor="identity-from" error={editorErrorField === 'identity-from' ? editorError ?? undefined : undefined}><TextInput id="identity-from" type="datetime-local" aria-invalid={editorErrorField === 'identity-from'} invalid={editorErrorField === 'identity-from'} value={draft.active_from ?? ''} onChange={(event) => updateDraft({ active_from: event.target.value })} /></Field>
              <Field label="Active until (optional)" htmlFor="identity-until" error={editorErrorField === 'identity-until' ? editorError ?? undefined : undefined}><TextInput id="identity-until" type="datetime-local" aria-invalid={editorErrorField === 'identity-until'} invalid={editorErrorField === 'identity-until'} min={draft.active_from || undefined} value={draft.active_until ?? ''} onChange={(event) => updateDraft({ active_until: event.target.value })} /></Field>
              <div className="flex flex-col items-start gap-2 sm:col-span-2">
                <p className="text-pretty text-xs leading-relaxed text-muted-foreground">Dates are optional. The browser applies your selection immediately; there is no separate OK button. “Active until” cannot be earlier than “Active from”.</p>
                {(draft.active_from || draft.active_until) && <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft({ active_from: '', active_until: '' })}>Clear dates</Button>}
              </div>
            </div>
          )}
          {editorError && (
            <div id="identity-editor-error" role="alert" aria-live="assertive" className="rounded-input border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {editorError}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={detail != null} onClose={() => setDetail(null)} title="External identity details" description="Fresh response from the item GET endpoint.">
        {detail && <dl className="divide-y divide-border">{[
          ['Value', detail.value], ['Type', detail.type], ['Organization', detail.organization_name], ['Organization ID', detail.organization_id], ['External system', detail.external_system_name], ['External system ID', detail.external_system_id], ['Source', detail.source_name || detail.source], ['Active from', formatDate(detail.active_from)], ['Active until', formatDate(detail.active_until)],
        ].map(([label, value]) => <div key={String(label)} className="flex items-baseline justify-between gap-4 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="min-w-0 break-all text-right font-mono text-sm text-foreground">{value == null || value === '' ? '—' : String(value)}</dd></div>)}</dl>}
      </Modal>

      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Deactivate external identity"
        description="DELETE soft-deletes this authority pair and preserves it for history and deduplication audit."
        footer={<><Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button><Button onClick={confirmDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{busy ? 'Deactivating…' : 'Deactivate identity'}</Button></>}
      >
        <p className="break-all font-mono text-sm text-foreground">{pendingDelete?.value}</p>
      </Modal>
    </>
  )
}
