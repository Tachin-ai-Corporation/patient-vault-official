'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { CreateRecordCustomFields, PatientCustomFields, type CreateCustomFieldsHandle } from '@/components/patients/patient-custom-fields'
import { RecordSectionCard } from '@/components/patients/record-section-card'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  addAlias,
  deleteAlias,
  getAlias,
  listAliases,
  patchAlias,
  replaceAlias,
  type PatientAlias,
  type PatientAliasInput,
} from '@/lib/api/patient'

const TYPES = ['maiden', 'nickname', 'preferred', 'previous', 'legal_change', 'alias'] as const
const EMPTY: PatientAliasInput = { type: 'alias', alias: '', firstName: '', lastName: '', fullName: '', effectiveFrom: '', effectiveTo: '' }

function cleanText(value?: string | null) {
  const trimmed = value?.trim() ?? ''
  return trimmed.toLowerCase() === 'n/a' ? '' : trimmed
}

function cleanDate(value?: string | null) {
  if (!value || value.startsWith('1970-01-01')) return ''
  return value.slice(0, 10)
}

function displayName(item: PatientAlias) {
  const fullName = cleanText(item.fullName)
  const nameParts = [cleanText(item.firstName), cleanText(item.lastName)].filter(Boolean).join(' ')
  return fullName || nameParts || cleanText(item.alias) || 'Untitled alias'
}

function clean(input: PatientAliasInput): PatientAliasInput {
  return {
    type: input.type,
    alias: cleanText(input.alias) || null,
    firstName: cleanText(input.firstName) || null,
    lastName: cleanText(input.lastName) || null,
    fullName: cleanText(input.fullName) || null,
    effectiveFrom: cleanDate(input.effectiveFrom) || null,
    effectiveTo: cleanDate(input.effectiveTo) || null,
  }
}

export function AliasesSection({ patientId }: { patientId: string }) {
  const { data, error, isLoading, mutate } = useSWR(`aliases:${patientId}`, () => listAliases(patientId), { revalidateOnFocus: false })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PatientAlias | null>(null)
  const [draft, setDraft] = useState<PatientAliasInput>(EMPTY)
  const [detail, setDetail] = useState<PatientAlias | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PatientAlias | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const createCustomFieldsRef = useRef<CreateCustomFieldsHandle>(null)
  const aliases = data ?? []

  function openAdd() {
    setEditing(null)
    setDraft(EMPTY)
    setActionError(null)
    setEditorError(null)
    setEditorOpen(true)
  }

  async function openEdit(item: PatientAlias) {
    setBusy(true)
    setActionError(null)
    try {
      const fresh = await getAlias(patientId, String(item.id))
      setEditing(fresh)
      setDraft({
        type: TYPES.includes(fresh.type as PatientAliasInput['type']) ? fresh.type as PatientAliasInput['type'] : 'alias',
        alias: cleanText(fresh.alias), firstName: cleanText(fresh.firstName), lastName: cleanText(fresh.lastName),
        fullName: cleanText(fresh.fullName), effectiveFrom: cleanDate(fresh.effectiveFrom), effectiveTo: cleanDate(fresh.effectiveTo),
      })
      setEditorError(null)
      setEditorOpen(true)
    } catch (cause) { setActionError((cause as Error).message) } finally { setBusy(false) }
  }

  async function view(item: PatientAlias) {
    setBusy(true)
    setActionError(null)
    try { setDetail(await getAlias(patientId, String(item.id))) }
    catch (cause) { setActionError((cause as Error).message) }
    finally { setBusy(false) }
  }

  function validate() {
    if (!TYPES.includes(draft.type)) return 'Select a valid alias type.'
    if (![draft.alias, draft.firstName, draft.lastName, draft.fullName].some((value) => cleanText(value))) return 'Enter at least one of: alias or nickname, first name, last name, or full name.'
    if (draft.effectiveFrom && draft.effectiveTo && draft.effectiveTo < draft.effectiveFrom) return 'Effective to must be on or after effective from.'
    return null
  }

  async function save() {
    const validation = validate()
    if (validation) { setEditorError(validation); return }
    setBusy(true)
    setEditorError(null)
    try {
      const body = clean(draft)
      if (editing) {
        await replaceAlias(patientId, String(editing.id), body)
      } else {
        createCustomFieldsRef.current?.validate()
        const created = await addAlias(patientId, body)
        await createCustomFieldsRef.current?.save(created.id)
      }
      setEditorOpen(false)
      await mutate()
    } catch (cause) { setEditorError((cause as Error).message) } finally { setBusy(false) }
  }

  async function endToday(item: PatientAlias) {
    setBusy(true)
    setActionError(null)
    try { await patchAlias(patientId, String(item.id), { effectiveTo: new Date().toISOString().slice(0, 10) }); await mutate() }
    catch (cause) { setActionError((cause as Error).message) }
    finally { setBusy(false) }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    setActionError(null)
    try { await deleteAlias(patientId, String(pendingDelete.id)); setPendingDelete(null); await mutate() }
    catch (cause) { setActionError((cause as Error).message) }
    finally { setBusy(false) }
  }

  return <>
    <RecordSectionCard title="aliases" patientId={patientId} customFieldSection="aliases" summary={isLoading ? 'Loading aliases' : `${aliases.length} alias${aliases.length === 1 ? '' : 'es'}`} action={
      <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5" data-icon="inline-start" />Add alias</Button>
    }>
      {actionError && <div role="alert" className="mb-4 rounded-input border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">{actionError}</div>}
      {isLoading ? <div className="flex flex-col gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        : error ? <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{(error as Error).message}</p><Button variant="outline" size="sm" onClick={() => mutate()}><RefreshCw className="h-3.5 w-3.5" />Retry</Button></div>
        : aliases.length === 0 ? <div className="rounded-input border border-dashed border-border px-4 py-8 text-center"><p className="text-sm font-medium text-foreground">No aliases on file</p><p className="mt-1 text-sm text-muted-foreground">Add a nickname, maiden name, preferred name, or previous legal name.</p></div>
        : <div className="divide-y divide-border">{aliases.map((item) => <article key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-foreground">{displayName(item)}</span><span className="rounded-tag bg-muted px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{item.type || 'alias'}</span></div>{cleanText(item.alias) && cleanText(item.alias) !== displayName(item) && <p className="mt-1 text-xs text-muted-foreground">Alias: {cleanText(item.alias)}</p>}{(cleanDate(item.effectiveFrom) || cleanDate(item.effectiveTo)) && <p className="mt-1 text-xs text-muted-foreground">{cleanDate(item.effectiveFrom) || '—'} → {cleanDate(item.effectiveTo) || 'Current'}</p>}</div>
          <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => view(item)} disabled={busy} aria-label={`View ${displayName(item)}`}><Eye className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} disabled={busy} aria-label={`Edit ${displayName(item)}`}><Pencil className="h-3.5 w-3.5" /></Button>{!item.effectiveTo && <Button variant="ghost" size="sm" onClick={() => endToday(item)} disabled={busy}>End today</Button>}<Button variant="ghost" size="icon-sm" onClick={() => setPendingDelete(item)} disabled={busy} aria-label={`Deactivate ${displayName(item)}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></div>
        </article>)}</div>}
    </RecordSectionCard>

    <Modal open={editorOpen} onClose={() => { setEditorOpen(false); setEditorError(null) }} title={editing ? 'Edit alias' : 'Add alias'} description={editing ? 'Update this alternate patient name.' : 'Create an alternate patient name.'} className="max-w-2xl" footer={<><Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Replace alias' : 'Add alias'}</Button></>}>
      {editorError && <div role="alert" className="rounded-input border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">{editorError}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="alias-type"><Select id="alias-type" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as PatientAliasInput['type'] })}>{TYPES.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</Select></Field>
        <Field label="Alias or nickname" htmlFor="alias-value"><TextInput id="alias-value" value={draft.alias ?? ''} onChange={(event) => setDraft({ ...draft, alias: event.target.value })} placeholder="Mari" /></Field>
        <Field label="First name" htmlFor="alias-first"><TextInput id="alias-first" value={draft.firstName ?? ''} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} /></Field>
        <Field label="Last name" htmlFor="alias-last"><TextInput id="alias-last" value={draft.lastName ?? ''} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} /></Field>
        <Field label="Full name" htmlFor="alias-full"><TextInput id="alias-full" value={draft.fullName ?? ''} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} /></Field><div />
        <Field label="Effective from" htmlFor="alias-from"><TextInput id="alias-from" type="date" value={draft.effectiveFrom ?? ''} onChange={(event) => setDraft({ ...draft, effectiveFrom: event.target.value })} /></Field>
        <Field label="Effective to" htmlFor="alias-to"><TextInput id="alias-to" type="date" value={draft.effectiveTo ?? ''} onChange={(event) => setDraft({ ...draft, effectiveTo: event.target.value })} /></Field>
      </div>
      {!editing && (
        <CreateRecordCustomFields ref={createCustomFieldsRef} sectionKey="aliases" patientId={patientId} disabled={busy} />
      )}
      {editing && (
        <PatientCustomFields
          sectionKey="aliases"
          patientId={patientId}
          instanceId={editing.id}
          allowDefinitionCreation={false}
        />
      )}
    </Modal>

    <Modal open={detail != null} onClose={() => setDetail(null)} title="Alias details" description="Fresh response from the alias item GET endpoint.">{detail && <dl className="divide-y divide-border">{[['Name', displayName(detail)], ['Alias', detail.alias], ['Type', detail.type], ['Effective from', detail.effectiveFrom], ['Effective to', detail.effectiveTo], ['Alias ID', detail.id]].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-right font-mono text-sm text-foreground">{value || '—'}</dd></div>)}</dl>}</Modal>
    <Modal open={pendingDelete != null} onClose={() => setPendingDelete(null)} title="Deactivate alias" description="DELETE soft-deletes this alias while preserving its audit history." footer={<><Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button><Button onClick={confirmDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{busy ? 'Deactivating…' : 'Deactivate alias'}</Button></>}><p className="text-sm text-foreground">{pendingDelete ? displayName(pendingDelete) : ''}</p></Modal>
  </>
}
