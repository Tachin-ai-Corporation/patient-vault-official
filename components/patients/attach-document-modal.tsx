'use client'

import { useEffect, useRef, useState } from 'react'
import { CreateRecordCustomFields, type CreateCustomFieldsHandle } from '@/components/patients/patient-custom-fields'
import { UploadCloud, Loader2, X, Plus, Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, TextInput, Select } from '@/components/ui/field'
import { attachDocument, type DocumentDTO } from '@/lib/api/documents'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Required document-type options (no default selection). */
const DOCUMENT_TYPES = [
  'lab_result',
  'imaging',
  'clinical_note',
  'audio',
  'fhir_bundle',
  'referral',
  'consent_form',
  'other',
] as const

type MetaRow = { id: number; key: string; value: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

/**
 * Read a File as a base64 string (no `data:` prefix), suitable for the
 * `data` field of the attach request.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export function AttachDocumentModal({
  open,
  patientId,
  onClose,
  onAttached,
}: {
  open: boolean
  patientId: string
  onClose: () => void
  /** Called after a successful upload with the created document. */
  onAttached: (doc: DocumentDTO) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [name, setName] = useState('')
  const [rows, setRows] = useState<MetaRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const customFieldsRef = useRef<CreateCustomFieldsHandle>(null)
  const rowId = useRef(0)

  // Reset all state whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return
    setFile(null)
    setFileError(null)
    setDocumentType('')
    setName('')
    setRows([])
    setDragging(false)
    setSubmitting(false)
    setSubmitError(null)
  }, [open])

  function selectFile(next: File | null) {
    if (!next) return
    if (next.size > MAX_BYTES) {
      setFile(null)
      setFileError(
        `${next.name} is ${formatSize(next.size)}, over the 10 MB limit.`,
      )
      return
    }
    setFileError(null)
    setFile(next)
    // Pre-fill the display name from the filename (editable).
    setName((prev) => (prev.trim() ? prev : next.name))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0] ?? null
    selectFile(dropped)
  }

  function addRow() {
    setRows((r) => [...r, { id: rowId.current++, key: '', value: '' }])
  }
  function updateRow(id: number, patch: Partial<MetaRow>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }
  function removeRow(id: number) {
    setRows((r) => r.filter((row) => row.id !== id))
  }

  const detectedType = file
    ? file.type || 'application/octet-stream'
    : ''

  const canSubmit =
    !!file && !fileError && !!documentType && !!name.trim() && !submitting

  async function handleSubmit() {
    if (!file || !documentType || !name.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      customFieldsRef.current?.validate()
      const data = await fileToBase64(file)

      // Collect filled metadata rows into an object; omit entirely when none.
      const metadata: Record<string, string> = {}
      for (const row of rows) {
        const k = row.key.trim()
        if (k) metadata[k] = row.value
      }

      const doc = await attachDocument(patientId, {
        documentType,
        contentType: detectedType,
        name: name.trim(),
        data,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      })

      await customFieldsRef.current?.save(doc.documentId)
      onAttached(doc)
      onClose()
    } catch (e) {
      // Keep the modal open; show the API error inline above the submit button.
      setSubmitError((e as Error).message || 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Attach document"
      description="Upload a file and attach it to this patient's record."
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2
                  className="h-4 w-4 animate-spin"
                  data-icon="inline-start"
                />
                Uploading…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" data-icon="inline-start" />
                Attach document
              </>
            )}
          </Button>
        </>
      }
    >
      <fieldset
        disabled={submitting}
        className="flex flex-col gap-6 border-0 p-0 disabled:opacity-60"
      >
        {/* Drag-and-drop file zone */}
        <div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose a file or drop it here"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-input border border-dashed px-6 py-8 text-center transition-colors ${
              dragging
                ? 'border-aqua/70 bg-aqua/5'
                : 'border-border bg-muted/20 hover:border-aqua/40'
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
              <UploadCloud className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-foreground">
              <span className="font-medium text-accent">Click to choose</span> or
              drag and drop a file
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, images, WAV audio, FHIR bundles · up to 10 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {fileError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {fileError}
            </p>
          )}

          {file && !fileError && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-input border border-border bg-card px-3 py-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {file.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {detectedType} · {formatSize(file.size)}
                </span>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => {
                  setFile(null)
                  setFileError(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Document type (required) + display name */}
        <FieldGroup title="Details">
          <Field label="Document type" htmlFor="attach-type">
            <Select
              id="attach-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="" disabled>
                Select a type…
              </option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Display name" htmlFor="attach-name">
            <TextInput
              id="attach-name"
              value={name}
              placeholder="Document name"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </FieldGroup>

        {/* Optional metadata key/value editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Metadata
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              Add field
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Optional. Stored by BO Core with the attachment and shown in Document details after upload.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <TextInput
                    aria-label="Metadata key"
                    placeholder="key"
                    value={row.key}
                    onChange={(e) => updateRow(row.id, { key: e.target.value })}
                  />
                  <TextInput
                    aria-label="Metadata value"
                    placeholder="value"
                    value={row.value}
                    onChange={(e) =>
                      updateRow(row.id, { value: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove field"
                    onClick={() => removeRow(row.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateRecordCustomFields ref={customFieldsRef} sectionKey="files" patientId={patientId} disabled={submitting} />

        {submitError && (
          <p
            role="alert"
            className="rounded-input border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </p>
        )}
      </fieldset>
    </Modal>
  )
}
