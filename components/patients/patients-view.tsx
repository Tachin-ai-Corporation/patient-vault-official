'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Trash2, Search, X, List, GitMerge } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { patientFullName, type Patient } from '@/lib/patient-data'
import {
  EMPTY_PATIENT_FIND,
  buildPatientFindPath,
  hasPatientFindCriteria,
  patientFindPreview,
  type PatientFindCriteria,
} from '@/lib/patient-find'
import { useColumnVisibility } from '@/lib/grid-columns'
import { SEED_PATIENTS } from '@/lib/seed-data'
import { findPatients, type FindCandidate, type SeedProgress } from '@/lib/api/patient'
import { Button } from '@/components/ui/button'
import { PatientsGrid } from '@/components/patients/patients-grid'
import { ColumnsMenu } from '@/components/patients/columns-menu'
import { PatientsEmptyState } from '@/components/patients/patients-empty-state'
import { AddPatientModal, type NewPatientDraft } from '@/components/patients/add-patient-modal'
import { ClearModal } from '@/components/patients/clear-modal'
import { SeedProgressModal } from '@/components/patients/seed-progress-modal'
import { PatientMergeDialog } from '@/components/patients/patient-merge-dialog'
import {
  isSessionRequiredError,
  useSessionRecovery,
} from '@/components/session-recovery'

export function PatientsView() {
  const {
    currentProject,
    currentEnv,
    patients,
    patientsLoading,
    createPatientRecord,
    addPatientContact,
    addPatientAddress,
    deletePatient,
    seedSampleData,
    reloadPatients,
    listAllPatients,
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
  const seedRecovery = useSessionRecovery()
  const addProgressRef = useRef(
    new WeakMap<
      NewPatientDraft,
      { patientId?: string; contactAdded?: boolean; addressAdded?: boolean }
    >(),
  )

  const [notice, setNotice] = useState<string | null>(null)

  // No developer-defined custom columns (custom fields are not part of the v3
  // API), so the grid uses only the fixed base columns.
  const { allColumns, isVisible, toggle, selectAll, reset } =
    useColumnVisibility([])
  const [criteria, setCriteria] = useState<PatientFindCriteria>(EMPTY_PATIENT_FIND)
  const [candidates, setCandidates] = useState<FindCandidate[] | null>(null)
  const [quickFilter, setQuickFilter] = useState('')
  const [finding, setFinding] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [selectedMergeIds, setSelectedMergeIds] = useState<Set<string>>(new Set())

  const count = patients.length
  const canFind = hasPatientFindCriteria(criteria)
  const findPath = buildPatientFindPath(criteria)

  const findMeta = useMemo(() => {
    if (!candidates) return undefined
    return new Map(
      candidates.map((candidate) => [
        String(candidate.id),
        { score: candidate.score, matchedOn: candidate.matchedOn ?? [] },
      ]),
    )
  }, [candidates])

  const visible = useMemo(() => {
    const source = candidates
      ? candidates
          .map((candidate) => patients.find((patient) => patient.id === String(candidate.id)))
          .filter((patient): patient is Patient => patient != null)
      : patients
    const query = quickFilter.trim().toLowerCase()
    if (!query) return source
    return source.filter((patient) =>
      [patientFullName(patient), patient.date_of_birth, patient.id]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [candidates, patients, quickFilter])

  function updateCriteria<K extends keyof PatientFindCriteria>(
    key: K,
    value: PatientFindCriteria[K],
  ) {
    setCriteria((current) => ({ ...current, [key]: value }))
  }

  async function handleFindSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canFind) return
    setFinding(true)
    try {
      const ranked = await findPatients(criteria)
      setCandidates(ranked)
      setQuickFilter('')
      setSelectedMergeIds(new Set())
      showNotice(
        `Found ${ranked.length} match${ranked.length === 1 ? '' : 'es'} via ${findPath}`,
      )
    } catch (err) {
      showNotice((err as Error).message || 'Find failed')
    } finally {
      setFinding(false)
    }
  }

  const selectedMergePatients = useMemo(
    () => patients.filter((patient) => selectedMergeIds.has(patient.id)),
    [patients, selectedMergeIds],
  )

  function toggleMergePatient(patient: Patient) {
    setSelectedMergeIds((current) => {
      const next = new Set(current)
      if (next.has(patient.id)) next.delete(patient.id)
      else if (next.size < 3) next.add(patient.id)
      return next
    })
  }

  function clearFind() {
    setCriteria(EMPTY_PATIENT_FIND)
    setCandidates(null)
    setQuickFilter('')
    setSelectedMergeIds(new Set())
  }

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(null), 3000)
  }

  // Seed a hard-coded batch of synthetic patients against the real vault, with
  // a live progress modal. Each patient's contacts, addresses, and optional
  // deceased marker are created via their own v3 API calls.
  async function runSeedSample() {
    setSeedDone(false)
    setSeedStatus('Starting…')
    const created = await seedSampleData(SEED_PATIENTS, (p: SeedProgress) => {
      setSeedCreated(p.index)
      setSeedStatus(p.label)
    })
    setSeedCreated(created)
    setSeedStatus(`Created ${created} patients`)
    setSeedDone(true)
    showNotice(`${created} patients created`)
  }

  async function handleSeedSample() {
    seedRecovery.reset()
    setSeedOpen(true)
    setSeedCreated(0)
    try {
      await runSeedSample()
    } catch (error) {
      if (isSessionRequiredError(error)) {
        setSeedStatus('Authentication required to continue')
        seedRecovery.requireAuthentication(async () => {
          try {
            await runSeedSample()
          } catch (retryError) {
            setSeedStatus(
              retryError instanceof Error ? retryError.message : 'Seeding failed',
            )
            setSeedDone(true)
            throw retryError
          }
        }, error)
      } else {
        setSeedDone(true)
      }
    }
  }

  async function handleAdd(draft: NewPatientDraft) {
    const progress = addProgressRef.current.get(draft) ?? {}
    addProgressRef.current.set(draft, progress)

    try {
      if (!progress.patientId) {
        const created = await createPatientRecord(draft.patient)
        progress.patientId = created.id
      }
      if (draft.contact && !progress.contactAdded) {
        await addPatientContact(progress.patientId, draft.contact)
        progress.contactAdded = true
      }
      if (draft.address && !progress.addressAdded) {
        await addPatientAddress(progress.patientId, draft.address)
        progress.addressAdded = true
      }
      addProgressRef.current.delete(draft)
      showNotice(
        `Added ${draft.patient.firstName} ${draft.patient.lastName}`,
      )
    } catch (e) {
      // Keep completed write steps attached to this draft. If authentication is
      // restored, the modal retries only the unfinished step instead of creating
      // a duplicate patient.
      showNotice((e as Error).message || 'Failed to add patient')
      throw e
    } finally {
      await reloadPatients()
    }
  }

  // Exercise the plain GET /v3/patient list endpoint (distinct from the
  // grid-backed list the table uses). Purpose is to surface the request in the
  // API Inspector; results are reported as a notice.
  const [listing, setListing] = useState(false)
  async function handleListGet() {
    setListing(true)
    try {
      const total = await listAllPatients(0, 25)
      showNotice(`GET /v3/patient -> ${total.toLocaleString()} total`)
    } catch (e) {
      showNotice((e as Error).message || 'GET /v3/patient failed')
    } finally {
      setListing(false)
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
      clearFind()
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
              {currentEnv !== 'production' && (
                <Button variant="outline" onClick={handleSeedSample}>
                  <Sparkles className="h-4 w-4" data-icon="inline-start" />
                  Seed sample data
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleListGet}
                disabled={listing}
                title="Exercise GET /v3/patient (see the API Inspector)"
              >
                <List className="h-4 w-4" data-icon="inline-start" />
                {listing ? 'Listing…' : 'GET /v3/patient'}
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
          allowSeed={currentEnv !== 'production'}
          onSeed={handleSeedSample}
          onAdd={() => setAddOpen(true)}
          onList={handleListGet}
          listing={listing}
        />
      ) : (
        <>
          <form
            role="search"
            onSubmit={handleFindSubmit}
            className="rounded-card border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Find patients</h2>
                <p className="text-sm text-muted-foreground">Search the vault using documented demographic fields.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={criteria.exact}
                  onChange={(event) => updateCriteria('exact', event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Exact
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                First name
                <input value={criteria.firstName} onChange={(e) => updateCriteria('firstName', e.target.value)} className="rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Last name
                <input value={criteria.lastName} onChange={(e) => updateCriteria('lastName', e.target.value)} className="rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Date of birth
                <input type="date" value={criteria.dob} onChange={(e) => updateCriteria('dob', e.target.value)} className="rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Sex at birth
                <select value={criteria.sexAtBirth} onChange={(e) => updateCriteria('sexAtBirth', e.target.value)} className="rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="intersex">Intersex</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <code className="break-all font-mono text-xs text-muted-foreground">{patientFindPreview(criteria)}</code>
                {!canFind && <p className="mt-1 text-xs text-destructive">Enter at least one demographic field.</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={clearFind} disabled={!canFind && !candidates}>
                  <X className="h-4 w-4" data-icon="inline-start" />
                  Clear
                </Button>
                <Button type="submit" disabled={!canFind || finding}>
                  <Search className="h-4 w-4" data-icon="inline-start" />
                  {finding ? 'Finding…' : 'Find'}
                </Button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-xs text-muted-foreground">
                {candidates ? `${visible.length} of ${candidates.length} server candidates` : `${visible.length} loaded patients`}
              </p>
              {candidates && (
                <Button type="button" variant="outline" disabled={selectedMergeIds.size < 2} onClick={() => setMergeOpen(true)} title={selectedMergeIds.size < 2 ? 'Select two or three candidates to compare.' : undefined}>
                  <GitMerge className="h-4 w-4" data-icon="inline-start" />
                  Compare selected ({selectedMergeIds.size})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={quickFilter}
                  onChange={(event) => setQuickFilter(event.target.value)}
                  placeholder="Filter results"
                  aria-label="Filter results"
                  className="w-48 rounded-input border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <ColumnsMenu columns={allColumns} isVisible={isVisible} onToggle={toggle} onSelectAll={selectAll} onReset={reset} />
            </div>
          </div>

          <PatientsGrid
            patients={visible}
            onSelect={(p) => router.push(`/patients/${p.id}`)}
            isVisible={isVisible}
            findMeta={findMeta}
            selectedIds={selectedMergeIds}
            onToggleSelected={toggleMergePatient}
            selectionLimit={3}
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
      <PatientMergeDialog
        open={mergeOpen}
        patients={selectedMergePatients}
        onClose={() => setMergeOpen(false)}
      />
      <SeedProgressModal
        open={seedOpen}
        total={SEED_PATIENTS.length}
        created={seedCreated}
        status={seedStatus}
        done={seedDone}
        recovery={
          seedRecovery.status === 'idle'
            ? null
            : {
                status: seedRecovery.status,
                message: seedRecovery.message,
                environment: seedRecovery.environment,
                onAuthenticate: seedRecovery.openAuthentication,
                onCheck: () => void seedRecovery.checkForSession(),
              }
        }
        onClose={() => {
          if (seedRecovery.status === 'retrying') return
          seedRecovery.reset()
          setSeedOpen(false)
        }}
      />
    </div>
  )
}
