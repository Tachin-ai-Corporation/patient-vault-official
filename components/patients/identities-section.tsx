'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Eye, Pencil, Plus, Power, PowerOff, RefreshCw, Trash2 } from 'lucide-react'
import { RecordSectionCard } from '@/components/patients/record-section-card'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  addIdentifier,
  deleteIdentifier,
  getIdentifier,
  listIdentifiers,
  patchIdentifier,
  replaceIdentifier,
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

function toApiDate(value?: string | null) {
  return value ? new Date(value).toISOString() : null
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

  const identifiers = data ?? []
  const summary = isLoading
    ? 'Loading identities'
    : `${identifiers.length} identit${identifiers.length === 1 ? 'y' : 'ies'}`

  function openAdd() {
    setEditing(null)
    setDraft(EMPTY_INPUT)
    setAdvanced(false)
    setActionError(null)
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

  async function save() {
    if (!draft.value.trim()) {
      setActionError('Identifier value is required.')
      return
    }
    setBusy(true)
    setActionError(null)
    const body: PatientIdentifierInput = {
      ...draft,
      value: draft.value.trim(),
      type: draft.type?.trim() || undefined,
      authority_organization_id: draft.authority_organization_id?.trim() || undefined,
      authority_organization_name: draft.authority_organization_name?.trim() || undefined,
      authority_external_system_id: draft.authority_external_system_id?.trim() || undefined,
      authority_external_system_name: draft.authority_external_system_name?.trim() || undefined,
      source_name: draft.source_name?.trim() || undefined,
      active_from: toApiDate(draft.active_from),
      active_until: toApiDate(draft.active_until),
    }
    try {
      if (editing) {
        const keys = authorityKeys(editing)
        await replaceIdentifier(patientId, keys.organizationId, keys.externalSystemId, body)
      } else {
        await addIdentifier(patientId, body)
      }
      setEditorOpen(false)
      await mutate()
    } catch (cause) {
      setActionError((cause as Error).message)
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
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(identifier)} disabled={!keys.available || busy} aria-label={`Edit ${identifier.value}`} title="GET item, then PUT replacement"><Pencil className="h-3.5 w-3.5" /></Button>
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
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit external identity' : 'Add external identity'}
        description={editing ? 'PUT replaces the item at its authority pair.' : 'Only the value is required. Blank authority fields use the API defaults.'}
        className="max-w-2xl"
        footer={<><Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Replace identity' : 'Add identity'}</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Identifier value" htmlFor="identity-value">
              <TextInput id="identity-value" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="MRN-88821" className="font-mono" />
            </Field>
            <Field label="Type" htmlFor="identity-type">
              <Select id="identity-type" value={draft.type ?? ''} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
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
                <Field label="Organization ID" htmlFor="identity-org-id"><TextInput id="identity-org-id" value={draft.authority_organization_id ?? ''} onChange={(event) => setDraft({ ...draft, authority_organization_id: event.target.value })} /></Field>
                <Field label="Organization name" htmlFor="identity-org-name"><TextInput id="identity-org-name" value={draft.authority_organization_name ?? ''} onChange={(event) => setDraft({ ...draft, authority_organization_name: event.target.value })} placeholder="org_legacyehr" /></Field>
                <Field label="External system ID" htmlFor="identity-system-id"><TextInput id="identity-system-id" value={draft.authority_external_system_id ?? ''} onChange={(event) => setDraft({ ...draft, authority_external_system_id: event.target.value })} /></Field>
                <Field label="External system name" htmlFor="identity-system-name"><TextInput id="identity-system-name" value={draft.authority_external_system_name ?? ''} onChange={(event) => setDraft({ ...draft, authority_external_system_name: event.target.value })} placeholder="Epic" /></Field>
              </>}
              <Field label="Source" htmlFor="identity-source"><TextInput id="identity-source" value={draft.source_name ?? ''} onChange={(event) => setDraft({ ...draft, source_name: event.target.value })} placeholder="ADT import" /></Field>
              <div />
              <Field label="Active from" htmlFor="identity-from"><TextInput id="identity-from" type="datetime-local" value={draft.active_from ?? ''} onChange={(event) => setDraft({ ...draft, active_from: event.target.value })} /></Field>
              <Field label="Active until" htmlFor="identity-until"><TextInput id="identity-until" type="datetime-local" value={draft.active_until ?? ''} onChange={(event) => setDraft({ ...draft, active_until: event.target.value })} /></Field>
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
