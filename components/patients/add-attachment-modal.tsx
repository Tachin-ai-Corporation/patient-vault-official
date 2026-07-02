'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'

// Metadata-only content types offered for the mock. SWAP POINT: real uploads
// derive content_type from the multipart payload.
const CONTENT_TYPE_OPTIONS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/json',
]

export type AttachmentDraft = {
  filename: string
  content_type: string
  size_bytes: number
}

type AddAttachmentModalProps = {
  open: boolean
  onClose: () => void
  onSave: (draft: AttachmentDraft) => void
}

export function AddAttachmentModal({
  open,
  onClose,
  onSave,
}: AddAttachmentModalProps) {
  const [filename, setFilename] = useState('')
  const [contentType, setContentType] = useState(CONTENT_TYPE_OPTIONS[0])
  const [sizeKb, setSizeKb] = useState('128')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFilename('')
    setContentType(CONTENT_TYPE_OPTIONS[0])
    setSizeKb('128')
    setErrors({})
  }, [open])

  function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!filename.trim()) nextErrors.filename = 'Filename is required.'
    const kb = Number(sizeKb)
    if (!Number.isFinite(kb) || kb <= 0)
      nextErrors.size = 'Size must be a positive number.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSave({
      filename: filename.trim(),
      content_type: contentType,
      size_bytes: Math.round(kb * 1024),
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add document"
      description="Records metadata only. Real uploads are multipart, virus-scanned, and capped at 50MB — the file payload is never stored here."
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Add document
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Filename" htmlFor="att-filename" error={errors.filename}>
          <TextInput
            id="att-filename"
            value={filename}
            invalid={!!errors.filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="lab_results.pdf"
            className="font-mono"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Content type" htmlFor="att-type">
            <Select
              id="att-type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="font-mono"
            >
              {CONTENT_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Size (KB)" htmlFor="att-size" error={errors.size}>
            <TextInput
              id="att-size"
              type="number"
              min={1}
              value={sizeKb}
              invalid={!!errors.size}
              onChange={(e) => setSizeKb(e.target.value)}
              className="font-mono"
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
