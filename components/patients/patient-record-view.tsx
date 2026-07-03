'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Pencil, Plus, FileText, Trash2, HeartPulse } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import {
  languageLabel,
  patientFullName,
  prettifyCode,
  type Patient,
} from '@/lib/patient-data'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'
import { RecordSectionCard } from '@/components/patients/record-section-card'
import { EditDemographicsModal } from '@/components/patients/edit-demographics-modal'
import {
  RelatedRecordModal,
  type RelatedKind,
  type RelatedValue,
  type ContactDraft,
  type AddressDraft,
} from '@/components/patients/related-record-modal'

export function PatientRecordView({ patientId }: { patientId: string }) {
  const router = useRouter()
  const {
    currentProject,
    fetchPatientDetail,
    updatePatient,
    deletePatient,
    addPatientContact,
    updatePatientContact,
    deletePatientContact,
    addPatientAddress,
    updatePatientAddress,
    deletePatientAddress,
    setPatientDeceased,
  } = useSession()

  // The full record (with contacts + addresses + deceased) is loaded directly
  // from GET /v3/patient/{id} — the grid-backed list only has partial columns.
  const {
    data: patient,
    error,
    isLoading,
    mutate,
  } = useSWR<Patient>(
    patientId ? `patient:${patientId}` : null,
    () => fetchPatientDetail(patientId),
    { revalidateOnFocus: false },
  )

  const [editDemoOpen, setEditDemoOpen] = useState(false)
  const [related, setRelated] = useState<RelatedKind | null>(null)
  // When set, the related-record modal is editing an existing sub-resource
  // (PATCH) rather than adding a new one (POST).
  const [relatedEditId, setRelatedEditId] = useState<string | null>(null)
  const [relatedInitial, setRelatedInitial] = useState<RelatedValue | null>(null)
  // Pending contact/address deletion awaiting confirmation.
  const [deleteRelated, setDeleteRelated] = useState<{
    kind: RelatedKind
    id: string
    label: string
  } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function openAddRelated(kind: RelatedKind) {
    setRelatedEditId(null)
    setRelatedInitial(null)
    setRelated(kind)
  }

  function openEditContact(c: Patient['contacts'][number]) {
    setRelatedEditId(c.id)
    setRelatedInitial({
      type: c.type,
      value: c.value,
      label: c.label,
      isPrimary: c.isPrimary,
    } as ContactDraft)
    setRelated('contact')
  }

  function openEditAddress(a: Patient['addresses'][number]) {
    setRelatedEditId(a.id)
    setRelatedInitial({
      use: a.use,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postal_code: a.postal_code,
      country: a.country,
      primary: a.primary,
    } as AddressDraft)
    setRelated('address')
  }

  function closeRelated() {
    setRelated(null)
    setRelatedEditId(null)
    setRelatedInitial(null)
  }

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(null), 3000)
  }

  // ---- Loading / not found --------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 animate-pulse rounded-input bg-muted" />
        <div className="h-40 animate-pulse rounded-card bg-muted" />
        <div className="h-40 animate-pulse rounded-card bg-muted" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-card bg-muted text-muted-foreground">
          <FileText className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          Record not found
        </h1>
        <p className="mt-2 max-w-md leading-relaxed text-muted-foreground text-pretty">
          No patient resolves to{' '}
          <span className="font-mono text-foreground">{patientId}</span> in{' '}
          {currentProject.name}. It may have been deleted, or belongs to another
          vault.
        </p>
        <div className="mt-6">
          <Link
            href="/patients"
            className="inline-flex h-9 items-center justify-center rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Back to Patients
          </Link>
        </div>
      </div>
    )
  }

  const name = patientFullName(patient)

  // ---- Demographics edit (PATCH) --------------------------------------------
  async function handleSaveDemographics(patch: Partial<Patient>) {
    if (!patient) return
    setBusy(true)
    try {
      await updatePatient(patient.id, patch)
      await mutate()
      showNotice('Saved patient changes')
    } catch (e) {
      showNotice((e as Error).message || 'Failed to save changes')
    } finally {
      setBusy(false)
    }
  }

  // ---- Delete patient (DELETE) ----------------------------------------------
  async function handleDelete() {
    if (!patient) return
    setBusy(true)
    try {
      await deletePatient(patient.id)
      setDeleteOpen(false)
      router.push('/patients')
    } catch (e) {
      showNotice((e as Error).message || 'Failed to delete')
      setBusy(false)
    }
  }

  // ---- Add / edit contact / address (POST or PATCH sub-resource) ------------
  async function handleSaveRelated(value: RelatedValue) {
    if (!patient || !related) return
    const editId = relatedEditId
    setBusy(true)
    try {
      if (related === 'contact') {
        const c = value as ContactDraft
        const input = {
          type: c.type,
          value: c.value,
          label: c.label || undefined,
          isPrimary: c.isPrimary,
        }
        if (editId) {
          await updatePatientContact(patient.id, editId, input)
        } else {
          await addPatientContact(patient.id, input)
        }
      } else {
        const a = value as AddressDraft
        const input = {
          line1: a.line1,
          line2: a.line2 || undefined,
          city: a.city,
          state: a.state,
          postalCode: a.postal_code,
          country: a.country || undefined,
          use: a.use,
          primary: a.primary,
        }
        if (editId) {
          await updatePatientAddress(patient.id, editId, input)
        } else {
          await addPatientAddress(patient.id, input)
        }
      }
      await mutate()
      showNotice(
        `${editId ? 'Updated' : 'Added'} ${related === 'contact' ? 'contact' : 'address'}`,
      )
    } catch (e) {
      showNotice((e as Error).message || 'Failed to save record')
    } finally {
      setBusy(false)
    }
  }

  // ---- Delete contact / address (DELETE sub-resource) -----------------------
  async function handleDeleteRelated() {
    if (!patient || !deleteRelated) return
    const { kind, id } = deleteRelated
    setBusy(true)
    try {
      if (kind === 'contact') {
        await deletePatientContact(patient.id, id)
      } else {
        await deletePatientAddress(patient.id, id)
      }
      await mutate()
      setDeleteRelated(null)
      showNotice(kind === 'contact' ? 'Deleted contact' : 'Deleted address')
    } catch (e) {
      showNotice((e as Error).message || 'Failed to delete record')
    } finally {
      setBusy(false)
    }
  }

  // ---- Deceased toggle ------------------------------------------------------
  async function handleToggleDeceased() {
    if (!patient) return
    setBusy(true)
    try {
      await setPatientDeceased(patient.id, !patient.deceased)
      await mutate()
      showNotice(patient.deceased ? 'Cleared deceased status' : 'Marked deceased')
    } catch (e) {
      showNotice((e as Error).message || 'Failed to update status')
    } finally {
      setBusy(false)
    }
  }

  // ---- Collapsed summaries --------------------------------------------------
  const primaryContact =
    patient.contacts.find((c) => c.isPrimary) ?? patient.contacts[0]
  const contactSummary = primaryContact
    ? `${primaryContact.type} · ${primaryContact.value}`
    : 'No contacts on file'

  const primaryAddress =
    patient.addresses.find((a) => a.primary) ??
    patient.addresses.find((a) => a.use === 'home') ??
    patient.addresses[0]
  const addressSummary = primaryAddress
    ? `${primaryAddress.line1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`
    : 'No addresses on file'

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm">
          <li className="truncate text-muted-foreground">
            {currentProject.name}
          </li>
          <li aria-hidden className="text-muted-foreground">
            /
          </li>
          <li>
            <Link
              href="/patients"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Patients
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground">
            /
          </li>
          <li className="truncate font-medium text-foreground">{name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              {name}
            </h1>
            {patient.deceased && (
              <span className="inline-flex items-center gap-1 rounded-tag border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                <HeartPulse className="h-3 w-3" />
                Deceased
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="font-mono text-[13px] text-accent">
              {patient.id}
            </span>
            <CopyButton value={patient.id} label="Copy patient id" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/patients')}>
            <ArrowLeft className="h-4 w-4" data-icon="inline-start" />
            Back
          </Button>
          <Button variant="outline" onClick={handleToggleDeceased} disabled={busy}>
            <HeartPulse className="h-4 w-4" data-icon="inline-start" />
            {patient.deceased ? 'Clear deceased' : 'Mark deceased'}
          </Button>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" data-icon="inline-start" />
            Delete
          </Button>
          <Button
            onClick={() => setEditDemoOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <Pencil className="h-4 w-4" data-icon="inline-start" />
            Edit
          </Button>
        </div>
      </div>

      {/* Deceased indicator banner */}
      {patient.deceased && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-input border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          <HeartPulse className="h-4 w-4 shrink-0" />
          <span className="font-medium">This patient is marked deceased.</span>
          {patient.deceased_detail?.deceasedDate && (
            <span className="font-mono text-[13px]">
              Date of death: {patient.deceased_detail.deceasedDate}
            </span>
          )}
        </div>
      )}

      {/* Confirmation notice */}
      {notice && (
        <div
          role="status"
          className="rounded-input border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm"
        >
          {notice}
        </div>
      )}

      {/* Section cards */}
      <div className="flex flex-col gap-3">
        {/* 1. Demographics */}
        <RecordSectionCard
          title="demographics"
          summary={`${name} · ${patient.date_of_birth} · ${prettifyCode(patient.sex_at_birth)}`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setEditDemoOpen(true)}>
              <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
              Edit
            </Button>
          }
        >
          <dl className="divide-y divide-border">
            <DetailRow label="Given name">{patient.given_name}</DetailRow>
            {patient.middle_name && (
              <DetailRow label="Middle name">{patient.middle_name}</DetailRow>
            )}
            <DetailRow label="Family name">{patient.family_name}</DetailRow>
            <DetailRow label="Date of birth">
              <span className="font-mono text-[13px]">
                {patient.date_of_birth}
              </span>
            </DetailRow>
            <DetailRow label="Sex at birth">
              {prettifyCode(patient.sex_at_birth)}
            </DetailRow>
            {patient.gender_identity && (
              <DetailRow label="Gender identity">
                {patient.gender_identity}
              </DetailRow>
            )}
            <DetailRow label="Race">{patient.race.label || '—'}</DetailRow>
            <DetailRow label="Ethnicity">
              {patient.ethnicity.label || '—'}
            </DetailRow>
            <DetailRow label="Preferred language">
              {languageLabel(patient.preferred_language)}
            </DetailRow>
            {patient.last4_ssn && (
              <DetailRow label="SSN (last 4)">
                <span className="font-mono text-[13px]">
                  •••••{patient.last4_ssn}
                </span>
              </DetailRow>
            )}
          </dl>
        </RecordSectionCard>

        {/* 2. Contacts */}
        <RecordSectionCard
          title="contacts"
          summary={contactSummary}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddRelated('contact')}
            >
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Add contact
            </Button>
          }
        >
          {patient.contacts.length === 0 ? (
            <EmptyLine>No contacts on file.</EmptyLine>
          ) : (
            <div className="divide-y divide-border">
              {patient.contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {c.type}
                    </span>
                    <span className="truncate font-mono text-[13px] text-foreground">
                      {c.value}
                    </span>
                    {c.label && (
                      <span className="truncate text-xs text-muted-foreground">
                        {c.label}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {c.isPrimary && (
                      <span className="rounded-tag border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Primary
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit contact ${c.value}`}
                      onClick={() => openEditContact(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete contact ${c.value}`}
                      onClick={() =>
                        setDeleteRelated({
                          kind: 'contact',
                          id: c.id,
                          label: `${c.type} · ${c.value}`,
                        })
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </RecordSectionCard>

        {/* 3. Addresses */}
        <RecordSectionCard
          title="addresses"
          summary={addressSummary}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddRelated('address')}
            >
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Add address
            </Button>
          }
        >
          {patient.addresses.length === 0 ? (
            <EmptyLine>No addresses on file.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-3">
              {patient.addresses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 rounded-input border border-border bg-muted/30 p-3"
                >
                  <div className="min-w-0 text-sm text-foreground">
                    <span className="mb-1 inline-block rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {a.use}
                    </span>
                    <div>{a.line1}</div>
                    {a.line2 && <div>{a.line2}</div>}
                    <div className="text-muted-foreground">
                      {a.city}, {a.state} {a.postal_code} · {a.country}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {a.primary && (
                      <span className="rounded-tag border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Primary
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${a.use} address`}
                      onClick={() => openEditAddress(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${a.use} address`}
                      onClick={() =>
                        setDeleteRelated({
                          kind: 'address',
                          id: a.id,
                          label: `${a.line1}, ${a.city}`,
                        })
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RecordSectionCard>
      </div>

      {/* Modals */}
      <EditDemographicsModal
        open={editDemoOpen}
        onClose={() => setEditDemoOpen(false)}
        patient={patient}
        onSave={handleSaveDemographics}
      />
      <RelatedRecordModal
        open={related != null}
        kind={related ?? 'contact'}
        initial={relatedInitial}
        onClose={closeRelated}
        onSave={handleSaveRelated}
      />
      <Modal
        open={deleteRelated != null}
        onClose={() => setDeleteRelated(null)}
        title={`Delete ${deleteRelated?.kind ?? 'record'}`}
        description={`This removes the ${deleteRelated?.kind ?? 'record'} from ${name}. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteRelated(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRelated}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {deleteRelated?.kind ?? 'record'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {deleteRelated?.label && (
            <span className="font-mono text-foreground">
              {deleteRelated.label}
            </span>
          )}{' '}
          will be permanently removed.
        </p>
      </Modal>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete patient"
        description={`This permanently removes ${name} from ${currentProject.name}, along with their addresses and contacts. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete patient
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          The record at{' '}
          <span className="font-mono text-foreground">
            /v3/patient/{patient.id}
          </span>{' '}
          will be removed from the vault.
        </p>
      </Modal>
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-foreground">{children}</dd>
    </div>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
