'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { patientFullName, type Patient } from '@/lib/patient-data'
import { listAddresses, listContacts, type AddressDTO, type ContactDTO } from '@/lib/api/patient'
import {
  MERGE_FIELDS,
  buildMergePlan,
  isMergeFieldIdentical,
  patientMergeValue,
  type MergeField,
  type RelationKind,
  type RelationSelection,
} from '@/lib/patient-merge'

type PatientRelations = {
  patientId: string
  addresses: AddressDTO[]
  contacts: ContactDTO[]
}

type RelationItem = {
  id: string
  label: string
  detail: string
}

const RELATION_SECTIONS: ReadonlyArray<{ kind: RelationKind; label: string }> = [
  { kind: 'addresses', label: 'Addresses' },
  { kind: 'contacts', label: 'Contacts' },
]

async function loadRelations(patientIds: string[]): Promise<PatientRelations[]> {
  return Promise.all(patientIds.map(async (patientId) => {
    const [addresses, contacts] = await Promise.all([
      listAddresses(patientId),
      listContacts(patientId),
    ])
    return { patientId, addresses, contacts }
  }))
}

function relationItem(kind: RelationKind, value: AddressDTO | ContactDTO): RelationItem {
  if (kind === 'addresses') {
    const address = value as AddressDTO
    return {
      id: String(address.id),
      label: [address.line1, address.line2].filter(Boolean).join(', '),
      detail: [address.city, address.state, address.postalCode, address.country].filter(Boolean).join(' '),
    }
  }
  const contact = value as ContactDTO
  return {
    id: String(contact.id),
    label: contact.value,
    detail: [contact.type, contact.label].filter(Boolean).join(' · '),
  }
}

type Props = {
  open: boolean
  patients: Patient[]
  onClose: () => void
}

export function PatientMergeDialog({ open, patients, onClose }: Props) {
  const [canonicalId, setCanonicalId] = useState(patients[0]?.id ?? '')
  const [mode, setMode] = useState<'record' | 'field'>('record')
  const [fieldSources, setFieldSources] = useState<Partial<Record<MergeField, string>>>({})
  const [relationKeeps, setRelationKeeps] = useState<Record<string, boolean>>({})
  const patientIds = useMemo(() => patients.map((patient) => patient.id), [patients])
  const { data: relations, error: relationsError, isLoading: relationsLoading } = useSWR(
    open && patientIds.length >= 2 ? ['patient-merge-relations', ...patientIds] : null,
    () => loadRelations(patientIds),
  )

  const selectedCanonicalId = patients.some((p) => p.id === canonicalId)
    ? canonicalId
    : patients[0]?.id ?? ''
  const relationSelections = useMemo(() => {
    const result: Record<RelationKind, RelationSelection[]> = { addresses: [], contacts: [] }
    for (const relation of relations ?? []) {
      for (const kind of ['addresses', 'contacts'] as const) {
        for (const value of relation[kind]) {
          const itemId = String(value.id)
          const key = `${kind}:${relation.patientId}:${itemId}`
          result[kind].push({
            patientId: relation.patientId,
            itemId,
            keep: mode === 'record' ? relation.patientId === selectedCanonicalId : relationKeeps[key] !== false,
          })
        }
      }
    }
    return result
  }, [mode, relationKeeps, relations, selectedCanonicalId])
  const plan = useMemo(
    () =>
      patients.length >= 2 && selectedCanonicalId
        ? buildMergePlan(patientIds, selectedCanonicalId, mode === 'field' ? fieldSources : {}, relationSelections)
        : null,
    [fieldSources, mode, patientIds, relationSelections, selectedCanonicalId],
  )

  if (!open) return null

  function close() {
    setMode('record')
    setCanonicalId(patients[0]?.id ?? '')
    setFieldSources({})
    setRelationKeeps({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="merge-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-container border border-border bg-background shadow-2xl sm:rounded-container">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">review only</p>
            <h2 id="merge-title" className="mt-1 text-xl font-semibold text-foreground">Compare potential duplicates</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the canonical record and review exactly which values would survive. Losing patient IDs would return a permanent HTTP 308 redirect to the canonical ID.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close merge review"><X /></Button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 rounded-card border border-border bg-card p-1">
            <button type="button" onClick={() => setMode('record')} className={`rounded-button px-3 py-2 text-sm font-medium ${mode === 'record' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Whole record</button>
            <button type="button" onClick={() => setMode('field')} className={`rounded-button px-3 py-2 text-sm font-medium ${mode === 'field' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Field by field</button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-card border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-muted-foreground">Field</th>
                  {patients.map((patient) => (
                    <th key={patient.id} className="min-w-52 border-l border-border px-4 py-3 text-left align-top">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="radio" name="canonical" checked={selectedCanonicalId === patient.id} onChange={() => setCanonicalId(patient.id)} className="mt-0.5 h-4 w-4 accent-primary" />
                        <span>
                          <span className="block font-semibold text-foreground">{patientFullName(patient)}</span>
                          <span className="mt-1 block font-mono text-xs font-normal text-muted-foreground">{patient.id}</span>
                          {patient.updated_at && <span className="mt-1 block text-xs font-normal text-muted-foreground">Updated {patient.updated_at}</span>}
                          <span className="mt-1 block text-xs font-normal text-accent">{selectedCanonicalId === patient.id ? 'Canonical record' : 'Merge into canonical'}</span>
                        </span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MERGE_FIELDS.map(({ key, label }) => {
                  const identical = isMergeFieldIdentical(patients, key)
                  return (
                    <tr key={key} className={`border-b border-border last:border-0 ${identical ? 'bg-muted/25' : ''}`}>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        {label}
                        {identical && <span className="ml-2 font-normal">Identical</span>}
                      </th>
                      {patients.map((patient) => {
                        const sourceId = mode === 'record' ? selectedCanonicalId : fieldSources[key] ?? selectedCanonicalId
                        const chosen = sourceId === patient.id
                        const showChoice = mode === 'field' && !identical
                        return (
                          <td key={patient.id} className={`border-l border-border px-4 py-3 ${chosen && !identical ? 'bg-accent/10' : ''}`}>
                            <label className={`flex items-center gap-2 ${showChoice ? 'cursor-pointer' : ''}`}>
                              {mode === 'record' && !identical && (
                                <input type="radio" checked={chosen} disabled readOnly aria-label={`${label} from ${patientFullName(patient)}`} className="h-4 w-4 accent-primary" />
                              )}
                              {showChoice && (
                                <input type="radio" name={`field-${key}`} checked={chosen} onChange={() => setFieldSources((current) => ({ ...current, [key]: patient.id }))} className="h-4 w-4 accent-primary" />
                              )}
                              <span className={identical ? 'text-muted-foreground' : chosen ? 'font-medium text-foreground' : 'text-muted-foreground'}>{patientMergeValue(patient, key)}</span>
                            </label>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {RELATION_SECTIONS.map(({ kind, label }) => (
              <section key={kind} className="rounded-card border border-border bg-card p-4" aria-labelledby={`merge-${kind}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 id={`merge-${kind}`} className="text-sm font-semibold text-foreground">{label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {mode === 'record' ? 'Only items on the canonical record survive.' : 'Keep items from any selected record on the canonical record.'}
                    </p>
                  </div>
                  {relationsLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
                </div>
                {relationsError ? (
                  <p className="mt-3 text-sm text-destructive">Unable to load documented {label.toLowerCase()}.</p>
                ) : !relationsLoading && (relations ?? []).every((relation) => relation[kind].length === 0) ? (
                  <p className="mt-3 text-sm text-muted-foreground">No {label.toLowerCase()} returned.</p>
                ) : (
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {(relations ?? []).map((relation) => {
                      const patient = patients.find((value) => value.id === relation.patientId)
                      return (
                        <div key={relation.patientId} className="rounded-input border border-border bg-muted/20 p-3">
                          <p className="text-xs font-medium text-foreground">{patient ? patientFullName(patient) : relation.patientId}</p>
                          <div className="mt-2 flex flex-col gap-2">
                            {relation[kind].length === 0 ? <p className="text-xs text-muted-foreground">None</p> : relation[kind].map((value) => {
                              const item = relationItem(kind, value)
                              const selectionKey = `${kind}:${relation.patientId}:${item.id}`
                              const kept = mode === 'record' ? relation.patientId === selectedCanonicalId : relationKeeps[selectionKey] !== false
                              return (
                                <label key={item.id} className={`flex items-start gap-2 rounded-input border border-border p-2 ${kept ? 'bg-accent/10' : 'bg-background'}`}>
                                  {mode === 'field' ? (
                                    <input type="checkbox" checked={kept} onChange={(event) => setRelationKeeps((current) => ({ ...current, [selectionKey]: event.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                                  ) : (
                                    <input type="checkbox" checked={kept} disabled readOnly aria-label={`${kept ? 'Keep' : 'Discard'} ${item.label}`} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block break-words text-xs font-medium text-foreground">{item.label || 'Untitled item'}</span>
                                    {item.detail && <span className="mt-0.5 block break-words text-xs text-muted-foreground">{item.detail}</span>}
                                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{item.id} · {kept ? 'survives' : 'not kept'}</span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
            <p className="text-xs text-muted-foreground">Aliases and Identifiers are omitted because the repository endpoint catalog does not document GET operations for those relations.</p>
          </div>

          {plan && (
            <div className="mt-5 rounded-card border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Redirect summary</h3>
              <div className="mt-3 flex flex-col gap-2">
                {plan.redirects.map((redirect) => (
                  <code key={redirect.from} className="break-all rounded-input bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{redirect.status} {redirect.from} → {redirect.to}</code>
                ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-accent">View merge plan payload</summary>
                <div className="mt-2 flex items-start gap-2 rounded-input bg-muted p-3">
                  <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-xs text-muted-foreground">{JSON.stringify(plan, null, 2)}</pre>
                  <CopyButton value={JSON.stringify(plan, null, 2)} label="Copy merge plan JSON" />
                </div>
              </details>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-6">
          <div className="max-w-2xl text-xs text-muted-foreground">
            <p>No merge endpoint is documented. This comparison creates a reviewable plan but sends no API request.</p>
            {plan && <p className="mt-1 font-mono">{plan.redirects.map(({ from, to }) => `${from} → ${to}`).join(' · ')}</p>}
          </div>
          <div className="flex items-center gap-2"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="button" disabled title="Pending documented patient merge API">Pending API</Button></div>
        </footer>
      </section>
    </div>
  )
}
