'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  MoreVertical,
  Plus,
  Eye,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileAudio,
  FileJson,
  File as FileIcon,
  RefreshCw,
  Check,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Modal } from '@/components/ui/modal'
import { Drawer } from '@/components/ui/drawer'
import { CopyButton } from '@/components/ui/copy-button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { RecordSectionCard } from '@/components/patients/record-section-card'
import { AttachDocumentModal } from '@/components/patients/attach-document-modal'
import { AttachApiSurface } from '@/components/patients/attach-api-surface'
import { CreateRecordCustomFields, type CreateCustomFieldsHandle } from '@/components/patients/patient-custom-fields'
import {
  listDocuments,
  getDocument,
  deleteDocument,
  type DocumentDTO,
  type DocumentStatus,
} from '@/lib/api/documents'

// ---- Filter option definitions --------------------------------------------

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'lab_result', label: 'lab_result' },
  { value: 'imaging', label: 'imaging' },
  { value: 'clinical_note', label: 'clinical_note' },
  { value: 'audio', label: 'audio' },
  { value: 'fhir_bundle', label: 'fhir_bundle' },
  { value: 'referral', label: 'referral' },
  { value: 'consent_form', label: 'consent_form' },
  { value: 'other', label: 'other' },
]

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'deleted', label: 'Deleted' },
]

// ---- Formatting helpers ----------------------------------------------------

/** Human-readable file size from a byte count. */
function formatSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

/** Compact date/time for the Created column. */
function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Pick a compact file-kind icon based on contentType. */
function KindIcon({ contentType }: { contentType?: string | null }) {
  const ct = (contentType ?? '').toLowerCase()
  const cls = 'h-4 w-4 shrink-0 text-muted-foreground'
  if (ct.includes('pdf')) return <FileText className={cls} aria-hidden />
  if (ct.startsWith('image/')) return <FileImage className={cls} aria-hidden />
  if (ct.startsWith('audio/')) return <FileAudio className={cls} aria-hidden />
  if (ct.includes('json') || ct.includes('fhir'))
    return <FileJson className={cls} aria-hidden />
  return <FileIcon className={cls} aria-hidden />
}

// ---- Component -------------------------------------------------------------

export function DocumentsSection({ patientId }: { patientId: string }) {
  const [documentType, setDocumentType] = useState<string>('all')
  const [status, setStatus] = useState<DocumentStatus>('active')

  // Server-side filtered fetch; the SWR key encodes the current filters so any
  // filter change re-queries the API (never client-side filtering).
  const {
    data: documents,
    error,
    isLoading,
    mutate,
  } = useSWR<DocumentDTO[]>(
    `documents:${patientId}:${documentType}:${status}`,
    () =>
      listDocuments(patientId, {
        documentType: documentType === 'all' ? undefined : documentType,
        status,
      }),
    { revalidateOnFocus: false },
  )

  // Detail drawer state.
  const [detail, setDetail] = useState<DocumentDTO | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [customFieldMessage, setCustomFieldMessage] = useState<string | null>(null)
  const [savingCustomFields, setSavingCustomFields] = useState(false)
  const customFieldsRef = useRef<CreateCustomFieldsHandle>(null)

  // Delete confirmation state.
  const [pendingDelete, setPendingDelete] = useState<DocumentDTO | null>(null)
  const [busy, setBusy] = useState(false)

  // Attach modal + transient success toast.
  const [attachOpen, setAttachOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const count = documents?.length ?? 0
  const summary =
    count > 0
      ? `${count} document${count === 1 ? '' : 's'}`
      : 'No documents attached'

  // ---- View details: fetch fresh record, then open the drawer -------------
  const openDetails = useCallback(
    async (documentId: string) => {
      setDetailError(null)
      setDetailLoading(true)
      setDetail({ documentId, name: '' }) // opens the drawer immediately
      try {
        const doc = await getDocument(patientId, documentId)
        setDetail(doc)
      } catch (e) {
        setDetailError((e as Error).message || 'Failed to load document')
      } finally {
        setDetailLoading(false)
      }
    },
    [patientId],
  )

  async function saveDocumentCustomFields() {
    setSavingCustomFields(true)
    setCustomFieldMessage(null)
    try {
      customFieldsRef.current?.validate()
      await customFieldsRef.current?.save()
      setCustomFieldMessage('Custom fields saved.')
    } catch (error) {
      setCustomFieldMessage((error as Error).message || 'Unable to save custom fields.')
    } finally {
      setSavingCustomFields(false)
    }
  }

  // ---- Download: ALWAYS fetch a fresh downloadUrl (they expire in 15 min) --
  const download = useCallback(
    async (documentId: string) => {
      setDownloadError(null)
      setDownloadingId(documentId)
      try {
        const doc = await getDocument(patientId, documentId)
        if (!doc.downloadUrl) {
          throw new Error('BO Core did not return a download link for this document.')
        }
        const link = window.document.createElement('a')
        link.href = doc.downloadUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.click()
      } catch (error) {
        setDownloadError(
          error instanceof Error && error.message
            ? error.message
            : 'The document could not be downloaded. Please try again.',
        )
      } finally {
        setDownloadingId(null)
      }
    },
    [patientId],
  )

  // ---- Delete (deactivate), then re-fetch with current filters ------------
  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteDocument(patientId, pendingDelete.documentId)
      setPendingDelete(null)
      await mutate()
    } catch {
      // Keep the dialog open on failure so the user can retry.
    } finally {
      setBusy(false)
    }
  }

  return (
    <RecordSectionCard
      title="documents"
      patientId={patientId}
      customFieldSection="documents"
      summary={summary}
      action={
        <div className="flex items-center gap-2">
          <AttachApiSurface />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttachOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
            Attach document
          </Button>
        </div>
      }
    >
      {/* Filters — both re-query the API */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Type</span>
          <div className="w-44">
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as string)}
            >
              <SelectTrigger aria-label="Filter by document type" className="h-8" />
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex items-center rounded-input border border-border bg-muted/30 p-0.5"
          >
            {STATUS_OPTIONS.map((o) => {
              const active = status === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(o.value)}
                  className={`rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {downloadError && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-input border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{downloadError}</span>
          <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDownloadError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Body: skeleton / error / empty / table */}
      {isLoading ? (
        <DocumentsSkeleton />
      ) : error ? (
        <ErrorBanner
          message={(error as Error).message}
          onRetry={() => mutate()}
        />
      ) : count === 0 ? (
        <EmptyState onAttach={() => setAttachOpen(true)} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Content type</Th>
                <Th>Size</Th>
                <Th>Created</Th>
                <th className="w-10 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents!.map((doc) => {
                const isDeleted = Boolean(doc.deleted)
                return (
                  <tr
                    key={doc.documentId}
                    className={isDeleted ? 'opacity-50' : undefined}
                  >
                    <td className="py-2 pr-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <KindIcon contentType={doc.contentType} />
                        {isDeleted ? (
                          <span className="truncate text-foreground">{doc.name || '—'}</span>
                        ) : (
                          <button
                            type="button"
                            className="truncate text-left text-accent underline-offset-4 hover:underline disabled:cursor-wait disabled:opacity-60"
                            disabled={downloadingId === doc.documentId}
                            onClick={() => void download(doc.documentId)}
                            aria-label={`Download ${doc.name || 'document'}`}
                          >
                            {downloadingId === doc.documentId ? 'Preparing download…' : doc.name || 'Download document'}
                          </button>
                        )}
                        {isDeleted && (
                          <span className="shrink-0 rounded-tag border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            deleted
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {doc.documentType ? (
                        <span className="inline-block rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {doc.documentType}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[13px] text-muted-foreground">
                      {doc.contentType || '—'}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatSize(doc.sizeBytes)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="py-2 text-right">
                      <RowMenu
                        deleted={isDeleted}
                        onView={() => openDetails(doc.documentId)}
                        onDownload={() => download(doc.documentId)}
                        onDelete={() => setPendingDelete(doc)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      <Drawer
        open={detail != null}
        onClose={() => setDetail(null)}
        title="Document details"
      >
        {detail && (
          <div className="flex flex-col gap-5 px-5 py-5">
            {detailLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : detailError ? (
              <ErrorBanner
                message={detailError}
                onRetry={() => openDetails(detail.documentId)}
              />
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Document ID
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-mono text-[13px] text-accent">
                      {detail.documentId}
                    </span>
                    <CopyButton
                      value={detail.documentId}
                      label="Copy document id"
                    />
                  </span>
                </div>

                <dl className="divide-y divide-border">
                  <DrawerRow label="Name">{detail.name || '—'}</DrawerRow>
                  <DrawerRow label="Type">
                    {detail.documentType ? (
                      <span className="inline-block rounded-tag bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {detail.documentType}
                      </span>
                    ) : (
                      '—'
                    )}
                  </DrawerRow>
                  <DrawerRow label="Content type">
                    <span className="font-mono text-[13px]">
                      {detail.contentType || '—'}
                    </span>
                  </DrawerRow>
                  <DrawerRow label="Size">
                    {formatSize(detail.sizeBytes)}
                  </DrawerRow>
                  <DrawerRow label="Created">
                    {formatDate(detail.createdAt)}
                  </DrawerRow>
                </dl>

                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Metadata
                  </span>
                  {detail.metadata && Object.keys(detail.metadata).length > 0 ? (
                    <dl className="divide-y divide-border rounded-input border border-border">
                      {Object.entries(detail.metadata).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-baseline justify-between gap-4 px-3 py-1.5"
                        >
                          <dt className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {k}
                          </dt>
                          <dd className="min-w-0 break-words text-right text-[13px] text-foreground">
                            {typeof v === 'object'
                              ? JSON.stringify(v)
                              : String(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No metadata.
                    </p>
                  )}
                </div>

                <div>
                  <Button
                    variant="outline"
                    disabled={Boolean(detail.deleted) || downloadingId === detail.documentId}
                    onClick={() => void download(detail.documentId)}
                  >
                    <Download className="h-4 w-4" data-icon="inline-start" />
                    {detail.deleted ? 'Download unavailable' : downloadingId === detail.documentId ? 'Preparing…' : 'Download'}
                  </Button>
                </div>

                {/* Custom fields are bound to this document's File instance,
                    not the patient — values belong to the individual record. */}
                <CreateRecordCustomFields
                  key={`document-${detail.documentId}`}
                  ref={customFieldsRef}
                  sectionKey="documents"
                  patientId={patientId}
                  instanceId={detail.documentId}
                  disabled={savingCustomFields}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void saveDocumentCustomFields()} disabled={savingCustomFields}>
                    {savingCustomFields ? 'Saving…' : 'Save custom fields'}
                  </Button>
                  {customFieldMessage && (
                    <p className="text-sm text-muted-foreground" role="status">{customFieldMessage}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Delete confirmation */}
      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Delete document"
        description="This deactivates the document. The file is retained and remains visible under the Deleted filter."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete document
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {pendingDelete?.name && (
            <span className="font-mono text-foreground">
              {pendingDelete.name}
            </span>
          )}{' '}
          will be deactivated.
        </p>
      </Modal>

      {/* Attach document */}
      <AttachDocumentModal
        open={attachOpen}
        patientId={patientId}
        onClose={() => setAttachOpen(false)}
        onAttached={(doc) => {
          setToast(`Attached ${doc.name || 'document'}`)
          // Re-fetch the list with the current filters.
          void mutate()
        }}
      />

      {/* Success toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-xl animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <Check className="h-4 w-4 text-accent" />
          {toast}
        </div>
      )}
    </RecordSectionCard>
  )
}

// ---- Sub-components ---------------------------------------------------------

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-3 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function DrawerRow({
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

/**
 * Row kebab menu. Uses the shared Popover primitive uncontrolled — exactly like
 * the working columns menu and API-surface popover — so the trigger toggles
 * reliably and the portal-based content renders above the table without being
 * clipped by the `overflow-x-auto` wrapper. Each item is a `PopoverClose`, so a
 * selection closes the menu and runs its action in a single click. Deleted rows
 * only offer "View details".
 */
function RowMenu({
  deleted,
  onView,
  onDownload,
  onDelete,
}: {
  deleted: boolean
  onView: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Document actions"
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <MoreVertical className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div role="menu">
          <MenuItem icon={Eye} onClick={onView}>
            View details
          </MenuItem>
          {!deleted && (
            <>
              <MenuItem icon={Download} onClick={onDownload}>
                Download
              </MenuItem>
              <MenuItem icon={Trash2} destructive onClick={onDelete}>
                Delete
              </MenuItem>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// A single menu row. Rendered as a `PopoverClose` so clicking it closes the
// popover (base-ui) and fires its action in the same click.
function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <PopoverClose
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-input px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
        destructive
          ? 'text-destructive hover:text-destructive'
          : 'text-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </PopoverClose>
  )
}

function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAttach }: { onAttach: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-input border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">No documents attached</p>
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={onAttach}>
          <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
          Attach document
        </Button>
      </div>
    </div>
  )
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-input border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <span className="min-w-0">
        {message || 'Failed to load documents.'}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="shrink-0 text-destructive hover:text-destructive"
      >
        <RefreshCw className="h-3.5 w-3.5" data-icon="inline-start" />
        Retry
      </Button>
    </div>
  )
}
