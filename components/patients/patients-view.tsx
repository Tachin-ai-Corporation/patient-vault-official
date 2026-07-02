'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Trash2, Search, X, Columns3 } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { useApiEmitter } from '@/lib/api-inspector'
import {
  generateSyntheticPatient,
  patientFullName,
  type Patient,
} from '@/lib/patient-data'
import { runFind, type FindQuery } from '@/lib/find-search'
import { useCustomFields } from '@/lib/custom-fields-context'
import {
  customFieldColumnKey,
  useColumnVisibility,
  type GridColumn,
} from '@/lib/grid-columns'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PatientsGrid } from '@/components/patients/patients-grid'
import { ColumnsMenu } from '@/components/patients/columns-menu'
import { PatientsEmptyState } from '@/components/patients/patients-empty-state'
import { AddPatientModal } from '@/components/patients/add-patient-modal'
import { ClearModal } from '@/components/patients/clear-modal'
import { FieldBuilderModal } from '@/components/patients/field-builder-modal'

// Sample-data seed: a single, fixed-size batch of synthetic patients. The
// empty state's one button calls this directly — no configuration step.
const SAMPLE_SEED_COUNT = 17

// Per-record delay so seeding reads like records streaming into the vault one
// at a time (~150–350ms each → roughly 3–5s for the full batch).
function seedDelay() {
  return 150 + Math.floor(Math.random() * 200)
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function PatientsView() {
  const {
    session,
    currentProject,
    patients,
    addPatient,
    clearPatients,
  } = useSession()
  const emit = useApiEmitter()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  // Number of synthetic patients written so far in the current seed run, plus
  // the live status line shown beside the progress bar.
  const [seedCreated, setSeedCreated] = useState(0)
  const [seedStatus, setSeedStatus] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  // Column visibility: derive toggleable columns from the current custom fields
  // and merge with the fixed base columns. Selection persists to localStorage.
  const { fields } = useCustomFields()
  const customColumns: GridColumn[] = fields.map((f) => ({
    key: customFieldColumnKey(f.id),
    label: f.name,
  }))
  const { allColumns, isVisible, toggle, selectAll, reset } =
    useColumnVisibility(customColumns)
  // In-grid Find: a single free-text query run against the current patients.
  const [find, setFind] = useState('')

  const count = patients.length

  // Filter the grid via the Find primitive. Empty query shows everything.
  const visible = useMemo<Patient[]>(() => {
    const q = find.trim()
    if (!q) return patients
    const query: FindQuery = {
      given_name: '',
      family_name: '',
      date_of_birth: '',
      any: q,
      exact: false,
    }
    return runFind(patients, query).map((r) => r.patient)
  }, [patients, find])

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(null), 3000)
  }

  // Seed a fixed sample batch directly (no modal). Records are written into the
  // vault one at a time so the UI reads like a real, streaming server operation
  // rather than an instant canned dump.
  //
  // Seeding is a demo convenience, NOT a real endpoint — there is no POST /seed
  // on the PV API. So instead of logging a single fictional /seed call, we log
  // the actual sequence of v3 writes that creating each patient maps to, in
  // creation order and interleaved as the seed progresses:
  //   1. POST /v3/patient                          — the demographic record
  //   2. POST /v3/patient/{patientId}/contact      — one per contact point
  //   3. POST /v3/patient/{patientId}/address      — one per address
  // The {patientId} in the contact/address paths is the id the preceding
  // POST /v3/patient would return, so the call dependency reads correctly.
  // SWAP POINT: in production each emit() gets a liveResponse from the real
  // round-trip; today they are illustrative (no live PV backend).
  async function handleSeedSample() {
    if (seeding) return
    setSeeding(true)
    setSeedCreated(0)
    setSeedStatus(`Creating patient 1 of ${SAMPLE_SEED_COUNT}…`)

    for (let i = 1; i <= SAMPLE_SEED_COUNT; i++) {
      const patient = generateSyntheticPatient('general')
      setSeedStatus(
        `Creating patient ${i} of ${SAMPLE_SEED_COUNT}… ${patientFullName(patient)} — demographics, contact, address`,
      )
      // Each addPatient prepends to the store, so the new row streams into the
      // grid immediately on this render.
      addPatient(patient)
      setSeedCreated(i)

      // 1) The demographic record.
      emit({
        method: 'POST',
        path: '/v3/patient',
        requestBody: {
          given_name: patient.given_name,
          family_name: patient.family_name,
          date_of_birth: patient.date_of_birth,
          sex_at_birth: patient.sex_at_birth,
          gender_identity: patient.gender_identity,
          pronouns: patient.pronouns,
          preferred_language: patient.preferred_language,
        },
      })
      // 2) One call per contact point (email/phone) — never batched.
      for (const contact of patient.contacts) {
        emit({
          method: 'POST',
          path: `/v3/patient/${patient.id}/contact`,
          requestBody: {
            system: contact.system,
            value: contact.value,
            use: contact.use,
          },
        })
      }
      // 3) One call per address — never batched.
      for (const address of patient.addresses) {
        emit({
          method: 'POST',
          path: `/v3/patient/${patient.id}/address`,
          requestBody: {
            use: address.use,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
          },
        })
      }

      await sleep(seedDelay())
    }

    // Settle: briefly hold the completed state before tearing down the bar.
    setSeedStatus(`${SAMPLE_SEED_COUNT} patients created`)
    await sleep(1000)
    setSeeding(false)
    setSeedStatus('')
    showNotice(`${SAMPLE_SEED_COUNT} patients created`)
  }

  function handleAdd(patient: Patient) {
    addPatient(patient)
    showNotice(`Added ${patient.given_name} ${patient.family_name}`)
    // SWAP POINT: in production, pass liveResponse from the real POST /patient.
    emit({
      method: 'POST',
      path: '/patient',
      requestBody: {
        given_name: patient.given_name,
        family_name: patient.family_name,
        date_of_birth: patient.date_of_birth,
        sex_at_birth: patient.sex_at_birth,
        preferred_language: patient.preferred_language,
      },
    })
  }

  function handleClear() {
    clearPatients()
    setClearOpen(false)
    setFind('')
    showNotice('Cleared the vault')
    // SWAP POINT: in production, pass liveResponse from the real DELETE /patients.
    emit({
      method: 'DELETE',
      path: '/patients',
      requestBody: { project: currentProject.id },
    })
  }

  // Record the Find call when the developer runs a query. SWAP POINT: in
  // production, pass liveResponse from the real POST /find round-trip.
  function emitFind(q: string) {
    if (!q.trim()) return
    emit({
      method: 'POST',
      path: '/find',
      requestBody: { any: q.trim(), exact: false },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            patients
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Patients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">
              {count.toLocaleString()}
            </span>{' '}
            patient{count === 1 ? '' : 's'}
          </p>
        </div>

        {/* Action toolbar. The field builder is always available (you can
            customize the schema before adding any records); the data actions
            appear once the vault has patients. */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFieldsOpen(true)}>
            <Columns3 className="h-4 w-4" data-icon="inline-start" />
            Fields
          </Button>
          {count > 0 && (
            <>
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-primary text-primary-foreground"
                disabled={seeding}
              >
                <Plus className="h-4 w-4" data-icon="inline-start" />
                Add patient
              </Button>
              <Button
                variant="outline"
                onClick={handleSeedSample}
                disabled={seeding}
              >
                <Sparkles className="h-4 w-4" data-icon="inline-start" />
                Seed sample data
              </Button>
              <Button
                variant="destructive"
                onClick={() => setClearOpen(true)}
                disabled={seeding}
              >
                <Trash2 className="h-4 w-4" data-icon="inline-start" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation notice */}
      {notice && (
        <div
          role="status"
          className="rounded-input border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm"
        >
          {notice}
        </div>
      )}

      {/* Body */}
      {count === 0 && !seeding ? (
        <PatientsEmptyState
          projectName={currentProject.name}
          onSeed={handleSeedSample}
          onAdd={() => setAddOpen(true)}
        />
      ) : seeding ? (
        <>
          {/* Seeding affordance: a determinate progress bar that fills as each
              synthetic record is written, with a per-record status line. */}
          <div className="rounded-input border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-foreground"
              >
                {seedStatus}
              </p>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {seedCreated}/{SAMPLE_SEED_COUNT}
              </span>
            </div>
            <Progress
              value={(seedCreated / SAMPLE_SEED_COUNT) * 100}
              className="mt-3"
              aria-label="Seeding progress"
            />
          </div>

          {/* Rows stream in here as each patient is created. */}
          <PatientsGrid
            patients={visible}
            onSelect={(p) => router.push(`/patients/${p.id}`)}
            isVisible={isVisible}
          />
        </>
      ) : (
        <>
          {/* In-grid Find: a search affordance over the table, not a page. */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              emitFind(find)
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find patients by name, date of birth, or id"
                aria-label="Find patients"
                className="w-full rounded-input border border-border bg-card py-2 pl-9 pr-9 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
              />
              {find && (
                <button
                  type="button"
                  onClick={() => setFind('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4" data-icon="inline-start" />
              Find
            </Button>
            <ColumnsMenu
              columns={allColumns}
              isVisible={isVisible}
              onToggle={toggle}
              onSelectAll={selectAll}
              onReset={reset}
            />
          </form>

          {find.trim() && (
            <p className="-mt-2 font-mono text-xs text-muted-foreground">
              {visible.length} match{visible.length === 1 ? '' : 'es'} for
              {' '}
              <span className="text-foreground">{find.trim()}</span>
            </p>
          )}

          <PatientsGrid
            patients={visible}
            onSelect={(p) => router.push(`/patients/${p.id}`)}
            isVisible={isVisible}
          />
        </>
      )}

      {/* Modals */}
      <AddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <ClearModal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        projectName={currentProject.name}
        count={count}
      />
      <FieldBuilderModal
        open={fieldsOpen}
        onClose={() => setFieldsOpen(false)}
      />
    </div>
  )
}
