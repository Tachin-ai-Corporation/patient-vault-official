'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  GitMerge,
  Paperclip,
  Pencil,
  Plus,
  FileText,
  Trash2,
} from 'lucide-react'
import { useSession } from '@/lib/session-context'
import {
  customFieldTypeLabel,
  formatCustomValue,
  isImageMime,
  parseFileRef,
  useCustomFields,
} from '@/lib/custom-fields-context'
import { useApiEmitter } from '@/lib/api-inspector'
import { useProvidersGate } from '@/lib/dcp-context'
import {
  formatBytes,
  generateAttachmentId,
  languageLabel,
  patientFullName,
  type Attachment,
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
} from '@/components/patients/related-record-modal'
import {
  AddAttachmentModal,
  type AttachmentDraft,
} from '@/components/patients/add-attachment-modal'
import { PatientMergeDialog } from '@/components/patients/patient-merge-dialog'

// LOINC code for the pronoun answer list (USCDI). Shown next to pronouns.
const PRONOUN_LOINC = '90778-2'

type RelatedEditState = {
  kind: RelatedKind
  initial: RelatedValue | null
  index: number | null
}

export function PatientRecordView({ patientId }: { patientId: string }) {
  const router = useRouter()
  const { getPatientById, updatePatient, deletePatient, currentProject, patients } =
    useSession()
  const { fields: customFields, getValues: getCustomValues } = useCustomFields()
  const emit = useApiEmitter()
  // Providers pane is demo-gated behind ?preview=1.1.
  const providersOpen = useProvidersGate()

  const patient = getPatientById(patientId)
  const resolvedId = patient?.id ?? null

  // Deep-link redirect: a merged-away id resolves to its survivor; send the URL
  // to the canonical record so there is one stable address per patient.
  useEffect(() => {
    if (patient && patient.id !== patientId) {
      router.replace(`/patients/${patient.id}`)
    }
  }, [patient, patientId, router])

  // Opening a record IS a read. Emit GET /patient/{id} once per canonical load.
  useEffect(() => {
    if (!patient || patient.id !== patientId) return
    // SWAP POINT: in production, pass liveResponse from the real GET round-trip.
    emit({
      method: 'GET',
      path: `/patient/${patient.id}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId])

  const [editDemoOpen, setEditDemoOpen] = useState(false)
  const [related, setRelated] = useState<RelatedEditState | null>(null)
  const [addAttachmentOpen, setAddAttachmentOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const mergeCandidates = useMemo(
    () => patients.filter((p) => p.id !== resolvedId),
    [patients, resolvedId],
  )

  function showNotice(text: string) {
    setNotice(text)
    setTimeout(() => setNotice(null), 3000)
  }

  // ---- Not found / stale id -------------------------------------------------
  if (!patient) {
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
          {currentProject.name}. It may have been cleared, or belongs to another
          project or environment.
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

  // ---- Demographics edit ----------------------------------------------------
  function handleSaveDemographics(
    patch: Partial<Patient>,
    changed: Record<string, unknown>,
  ) {
    if (!patient) return
    updatePatient(patient.id, patch)
    // PATCH carries only the changed fields as the request body.
    // SWAP POINT: in production, pass liveResponse from the real PATCH.
    emit({
      method: 'PATCH',
      path: `/patient/${patient.id}`,
      requestBody: changed,
    })
    showNotice('Saved patient changes')
  }

  // ---- Delete patient -------------------------------------------------------
  function handleDelete() {
    if (!patient) return
    const id = patient.id
    // SWAP POINT: in production, pass liveResponse from the real DELETE.
    emit({ method: 'DELETE', path: `/patient/${id}` })
    deletePatient(id)
    setDeleteOpen(false)
    router.push('/patients')
  }

  // ---- Related records (contact / address / provider) -----------------------
  function openRelated(
    kind: RelatedKind,
    initial: RelatedValue | null,
    index: number | null,
  ) {
    setRelated({ kind, initial, index })
  }

  function handleSaveRelated(value: RelatedValue) {
    if (!patient || !related) return
    const { kind, index } = related
    const isEdit = index != null
    const key = (
      { contact: 'contacts', address: 'addresses', provider: 'providers' } as const
    )[kind]

    const list = [...(patient[key] as RelatedValue[])]
    if (isEdit) list[index] = value
    else list.push(value)

    updatePatient(patient.id, { [key]: list } as Partial<Patient>)

    // SWAP POINT: related records have stable server ids in production; here the
    // array index stands in as {sub_id} for the emitted path.
    const subId = isEdit ? index : list.length - 1
    // SWAP POINT: in production, pass liveResponse from the real request.
    emit({
      method: isEdit ? 'PATCH' : 'POST',
      path: `/patient/${patient.id}/${kind}${isEdit ? `/${subId}` : ''}`,
      requestBody: value,
    })
    showNotice(isEdit ? `Updated ${kind}` : `Added ${kind}`)
  }

  // ---- Attachment add (metadata only) ---------------------------------------
  function handleAddAttachment(draft: AttachmentDraft) {
    if (!patient) return
    const attachment: Attachment = {
      id: generateAttachmentId(),
      patient_id: patient.id,
      filename: draft.filename,
      content_type: draft.content_type,
      size_bytes: draft.size_bytes,
      created_at: new Date().toISOString(),
    }
    const attachments = [attachment, ...patient.attachments]
    // attachment_count is mirrored by updatePatient so the grid + Attachments
    // view stay correct.
    updatePatient(patient.id, { attachments })
    // SWAP POINT: in production, pass liveResponse from the real POST.
    emit({
      method: 'POST',
      path: `/patient/${patient.id}/attachment`,
      requestBody: {
        filename: attachment.filename,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
      },
    })
    showNotice(`Added ${attachment.filename}`)
  }

  // ---- Collapsed summaries --------------------------------------------------
  const primaryContact = patient.contacts[0]
  const contactSummary = primaryContact
    ? `${primaryContact.system} · ${primaryContact.value}`
    : 'No contacts on file'

  const primaryAddress =
    patient.addresses.find((a) => a.use === 'home') ?? patient.addresses[0]
  const addressSummary = primaryAddress
    ? `${primaryAddress.line1}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.postal_code}`
    : 'No addresses on file'

  const primaryProvider = patient.providers[0]
  const providerSummary = primaryProvider
    ? `${primaryProvider.name} · ${primaryProvider.role}`
    : 'No providers on file'

  const recentAttachment = patient.attachments.reduce<Attachment | null>(
    (latest, a) =>
      !latest || a.created_at > latest.created_at ? a : latest,
    null,
  )
  const attachmentSummary =
    patient.attachment_count > 0 && recentAttachment
      ? `${patient.attachment_count} document${patient.attachment_count === 1 ? '' : 's'} · ${recentAttachment.filename}`
      : 'No documents on file'

  const aliasCount = patient.aliases?.length ?? 0

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
              <span className="inline-flex items-center rounded-tag border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            <GitMerge className="h-4 w-4" data-icon="inline-start" />
            Merge
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
        {/* 1. Demographics — always present */}
        <RecordSectionCard
          title="demographics"
          summary={`${name} · ${patient.date_of_birth} · ${patient.sex_at_birth}`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setEditDemoOpen(true)}>
              <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
              Edit
            </Button>
          }
        >
          <dl className="divide-y divide-border">
            <DetailRow label="Given name">{patient.given_name}</DetailRow>
            <DetailRow label="Family name">{patient.family_name}</DetailRow>
            <DetailRow label="Date of birth">
              <span className="font-mono text-[13px]">
                {patient.date_of_birth}
              </span>
            </DetailRow>
            <DetailRow label="Sex at birth">{patient.sex_at_birth}</DetailRow>
            <DetailRow label="Gender identity">
              {patient.gender_identity}
            </DetailRow>
            <DetailRow label="Pronouns">
              {patient.pronouns}{' '}
              <span className="font-mono text-[13px] text-accent">
                {PRONOUN_LOINC}
              </span>
            </DetailRow>
            <DetailRow label="Race">
              {patient.race.label}{' '}
              <span className="font-mono text-[13px] text-accent">
                {patient.race.code}
              </span>
            </DetailRow>
            <DetailRow label="Ethnicity">
              {patient.ethnicity.label}{' '}
              <span className="font-mono text-[13px] text-accent">
                {patient.ethnicity.code}
              </span>
            </DetailRow>
            <DetailRow label="Preferred language">
              <span className="font-mono text-[13px] text-foreground">
                {patient.preferred_language}
              </span>{' '}
              <span className="text-muted-foreground">
                {languageLabel(patient.preferred_language)}
              </span>
            </DetailRow>
          </dl>
        </RecordSectionCard>

        {/* Custom fields — developer-defined attributes on the Patients
            schema. Only shown when at least one field exists. */}
        {customFields.length > 0 && (
          <RecordSectionCard
            title="custom fields"
            summary={`${customFields.length} field${customFields.length === 1 ? '' : 's'}`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditDemoOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
                Edit
              </Button>
            }
          >
            <dl className="divide-y divide-border">
              {customFields.map((f) => {
                const raw = getCustomValues(patient.id)[f.id]
                return (
                  <DetailRow
                    key={f.id}
                    label={`${f.name} · ${customFieldTypeLabel(f.type)}`}
                  >
                    {f.type === 'file' ? (
                      <CustomFileValue raw={raw} />
                    ) : (
                      formatCustomValue(f.type, raw)
                    )}
                  </DetailRow>
                )
              })}
            </dl>
          </RecordSectionCard>
        )}

        {/* 2. Contacts */}
        <RecordSectionCard
          title="contacts"
          summary={contactSummary}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRelated('contact', null, null)}
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
              {patient.contacts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {c.system}
                    </span>
                    <span className="font-mono text-[13px] text-foreground">
                      {c.value}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.use}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRelated('contact', c, i)}
                  >
                    <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
                    Edit
                  </Button>
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
              onClick={() => openRelated('address', null, null)}
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
              {patient.addresses.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-input border border-border bg-muted/30 p-3"
                >
                  <div className="text-sm text-foreground">
                    <span className="mb-1 inline-block rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {a.use}
                    </span>
                    <div>{a.line1}</div>
                    {a.line2 && <div>{a.line2}</div>}
                    <div className="text-muted-foreground">
                      {a.city}, {a.state} {a.postal_code} · {a.country}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRelated('address', a, i)}
                  >
                    <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </RecordSectionCard>

        {/* 4. Providers — demo-gated behind ?preview=1.1 */}
        {providersOpen && (
        <RecordSectionCard
          title="providers"
          summary={providerSummary}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openRelated('provider', null, null)}
            >
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Add provider
            </Button>
          }
        >
          {patient.providers.length === 0 ? (
            <EmptyLine>No providers on file.</EmptyLine>
          ) : (
            <div className="flex flex-col gap-3">
              {patient.providers.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-input border border-border bg-muted/30 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.role}</div>
                    <div className="mt-1 font-mono text-[13px] text-accent">
                      NPI {p.npi}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openRelated('provider', p, i)}
                  >
                    <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </RecordSectionCard>
        )}

        {/* 5. Documents — metadata only */}
        <RecordSectionCard
          title="documents"
          summary={attachmentSummary}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddAttachmentOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Add document
            </Button>
          }
        >
          {patient.attachments.length === 0 ? (
            <EmptyLine>No documents on file.</EmptyLine>
          ) : (
            <div className="overflow-hidden rounded-input border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Filename
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Content type
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Size
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patient.attachments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          {a.filename}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] text-muted-foreground">
                        {a.content_type}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {formatBytes(a.size_bytes)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </RecordSectionCard>

        {/* 6. Aliases — read-only; hidden when none */}
        {aliasCount > 0 && (
          <RecordSectionCard
            title="aliases"
            summary={`${aliasCount} alias${aliasCount === 1 ? '' : 'es'}`}
          >
            <div className="flex flex-wrap gap-1.5">
              {patient.aliases?.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center rounded-tag bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {alias}
                </span>
              ))}
            </div>
          </RecordSectionCard>
        )}
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
        kind={related?.kind ?? 'contact'}
        initial={related?.initial ?? null}
        onClose={() => setRelated(null)}
        onSave={handleSaveRelated}
      />
      <AddAttachmentModal
        open={addAttachmentOpen}
        onClose={() => setAddAttachmentOpen(false)}
        onSave={handleAddAttachment}
      />
      <PatientMergeDialog
        open={mergeOpen}
        patient={patient}
        candidates={mergeCandidates}
        onClose={() => setMergeOpen(false)}
        onMerged={(survivorId) => {
          setMergeOpen(false)
          router.push(`/patients/${survivorId}`)
        }}
      />
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete patient"
        description={`This permanently removes ${name} from ${currentProject.name}, along with their addresses, contacts, providers, and attachments. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete patient
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          The record at{' '}
          <span className="font-mono text-foreground">/patient/{patient.id}</span>{' '}
          will be removed from the active environment.
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

// Renders a File / Image custom-field value: an image thumbnail for images, a
// name + type chip for other files, or an em dash when empty.
function CustomFileValue({ raw }: { raw: string | undefined }) {
  const ref = parseFileRef(raw)
  if (!ref) return <span className="text-muted-foreground">—</span>

  if (ref.thumb && isImageMime(ref.mime)) {
    return (
      <span className="inline-flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ref.thumb || '/placeholder.svg'}
          alt={ref.name}
          className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
        />
        <span className="truncate text-sm text-foreground">{ref.name}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-tag border border-border bg-muted/50 px-2 py-1">
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate text-xs text-foreground">{ref.name}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {ref.mime || 'file'}
      </span>
    </span>
  )
}
