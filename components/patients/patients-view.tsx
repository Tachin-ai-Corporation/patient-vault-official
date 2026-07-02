'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Trash2, Search, X } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { type Patient } from '@/lib/patient-data'
import { runFind, type FindQuery } from '@/lib/find-search'
import { useColumnVisibility } from '@/lib/grid-columns'
import { SEED_PATIENTS } from '@/lib/seed-data'
import type { SeedProgress } from '@/lib/api/patient'
import { Button } from '@/components/ui/button'
import { PatientsGrid } from '@/components/patients/patients-grid'
import { ColumnsMenu } from '@/components/patients/columns-menu'
import { PatientsEmptyState } from '@/components/patients/patients-empty-state'
import { AddPatientModal, type NewPatientDraft } from '@/components/patients/add-patient-modal'
import { ClearModal } from '@/components/patients/clear-modal'
import { SeedProgressModal } from '@/components/patients/seed-progress-modal'

export function PatientsView() {
  const {
    currentProject,
    patients,
    patientsLoading,
    createPatientRecord,
    addPatientContact,
    addPatientAddress,
    deletePatient,
    seedSampleData,
    reloadPatients,
  } = useSession()
  const router = useRouter()

  const [addOpen, setAddOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Seed progress modal state.
  const [seedOpen, setSeedOpen] = useState(false)
  const [seedCreated, setSeedCreated] = useState(0)
  const [seedStatus, setSeedStatus] = useState('')
  const [seedDone, setSeedDone] = useState(false)

  const [notice, setNotice] = useState<string | null>(null)

  // No developer-defined custom columns (custom fields are not part of the v3
  // API), so the grid uses only the fixed base columns.
  const { allColumns, isVisible, toggle, selectAll, reset } =
    useColumnVisibility([])
  const [find, setFind] = useState('')

  const count = patients.length

  // Client-side Find over the loaded page of patients.
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

  // Seed a hard-coded batch of synthetic patients against the real vault, with
  // a live progress modal. Each patient's contacts, addresses, and optional
  // deceased marker are created via their own v3 API calls.
  async function handleSeedSample() {
    setSeedOpen(true)
    setSeedDone(false)
    setSeedCreated(0)
    setSeedStatus('Starting…')
    try {
      const created = await seedSampleData(SEED_PATIENTS, (p: SeedProgress) => {
        setSeedCreated(p.index)
        setSeedStatus(p.label)
      })
      setSeedCreated(created)
      setSeedStatus(`Created ${created} patients`)
      setSeedDone(true)
      showNotice(`${created} patients created`)
    } catch (e) {
      setSeedStatus((e as Error).message || 'Seeding failed')
      setSeedDone(true)
    }
  }

  async function handleAdd(draft: NewPatientDraft) {
    try {
      const created = await createPatientRecord(draft.patient)
      if (draft.contact) await addPatientContact(created.id, draft.contact)
      if (draft.address) await addPatientAddress(created.id, draft.address)
      await reloadPatients()
      showNotice(
        `Added ${draft.patient.firstName} ${draft.patient.lastName}`,
      )
    } catch (e) {
      showNotice((e as Error).message || 'Failed to add patient')
    }
  }

  // Clear = delete every loaded patient one-by-one (no bulk endpoint exists).
  async function handleClear() {
    setClearing(true)
    try {
      for (const p of patients) {
        await deletePatient(p.id)
      }
      await reloadPatients()
      setFind('')
      showNotice('Cleared the vault')
    } catch (e) {
      showNotice((e as Error).message || 'Failed to clear vault')
    } finally {
      setClearing(false)
      setClearOpen(false)
    }
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
            patient{count === 1 ? '' : 's'} in {currentProject.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {count > 0 && (
            <>
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" data-icon="inline-start" />
                Add patient
              </Button>
              <Button variant="outline" onClick={handleSeedSample}>
                <Sparkles className="h-4 w-4" data-icon="inline-start" />
                Seed sample data
              </Button>
              <Button variant="destructive" onClick={() => setClearOpen(true)}>
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
      {patientsLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-input bg-muted" />
          ))}
        </div>
      ) : count === 0 ? (
        <PatientsEmptyState
          projectName={currentProject.name}
          onSeed={handleSeedSample}
          onAdd={() => setAddOpen(true)}
        />
      ) : (
        <>
          {/* In-grid Find */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
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
              {visible.length} match{visible.length === 1 ? '' : 'es'} for{' '}
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
        onClose={() => (clearing ? undefined : setClearOpen(false))}
        onConfirm={handleClear}
        projectName={currentProject.name}
        count={count}
      />
      <SeedProgressModal
        open={seedOpen}
        total={SEED_PATIENTS.length}
        created={seedCreated}
        status={seedStatus}
        done={seedDone}
        onClose={() => setSeedOpen(false)}
      />
    </div>
  )
}
