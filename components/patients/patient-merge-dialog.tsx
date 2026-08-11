'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { patientFullName, type Patient } from '@/lib/patient-data'
import {
  MERGE_FIELDS,
  buildMergePlan,
  patientMergeValue,
  type MergeField,
} from '@/lib/patient-merge'

type Props = {
  open: boolean
  patients: Patient[]
  onClose: () => void
}

export function PatientMergeDialog({ open, patients, onClose }: Props) {
  const [canonicalId, setCanonicalId] = useState(patients[0]?.id ?? '')
  const [mode, setMode] = useState<'record' | 'field'>('record')
  const [fieldSources, setFieldSources] = useState<Partial<Record<MergeField, string>>>({})

  const selectedCanonicalId = patients.some((p) => p.id === canonicalId)
    ? canonicalId
    : patients[0]?.id ?? ''
  const plan = useMemo(
    () =>
      patients.length >= 2 && selectedCanonicalId
        ? buildMergePlan(patients.map((p) => p.id), selectedCanonicalId, mode === 'field' ? fieldSources : {})
        : null,
    [fieldSources, mode, patients, selectedCanonicalId],
  )

  if (!open) return null

  function close() {
    setMode('record')
    setFieldSources({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="merge-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-container border border-border bg-background shadow-2xl sm:rounded-container">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">review only</p>
            <h2 id="merge-title" className="mt-1 text-xl font-semibold text-foreground">Compare potential duplicates</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the canonical record and review exactly which values would survive.</p>
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
                          <span className="mt-1 block text-xs font-normal text-accent">{selectedCanonicalId === patient.id ? 'Canonical record' : 'Merge into canonical'}</span>
                        </span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MERGE_FIELDS.map(({ key, label }) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{label}</th>
                    {patients.map((patient) => {
                      const sourceId = mode === 'record' ? selectedCanonicalId : fieldSources[key] ?? selectedCanonicalId
                      const chosen = sourceId === patient.id
                      return (
                        <td key={patient.id} className={`border-l border-border px-4 py-3 ${chosen ? 'bg-accent/10' : ''}`}>
                          <label className={`flex items-center gap-2 ${mode === 'field' ? 'cursor-pointer' : ''}`}>
                            {mode === 'field' && <input type="radio" name={`field-${key}`} checked={chosen} onChange={() => setFieldSources((current) => ({ ...current, [key]: patient.id }))} className="h-4 w-4 accent-primary" />}
                            <span className={chosen ? 'font-medium text-foreground' : 'text-muted-foreground'}>{patientMergeValue(patient, key)}</span>
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
                <pre className="mt-2 overflow-x-auto rounded-input bg-muted p-3 font-mono text-xs text-muted-foreground">{JSON.stringify(plan, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-6">
          <p className="max-w-2xl text-xs text-muted-foreground">No merge endpoint is documented. This comparison creates a reviewable plan but sends no API request.</p>
          <div className="flex items-center gap-2"><Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="button" disabled title="Pending documented patient merge API">Merge patients · Pending API</Button></div>
        </footer>
      </section>
    </div>
  )
}
