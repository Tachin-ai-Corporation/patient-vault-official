'use client'

import { useRef, useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { Field, TextInput } from '@/components/ui/field'
import {
  fileToRef,
  isImageMime,
  parseFileRef,
  serializeFileRef,
  type CustomFieldDef,
} from '@/lib/custom-fields-context'
import { formatBytes } from '@/lib/patient-data'

// File types accepted by File / Image fields: common image and document MIME
// types plus their extensions.
const FILE_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Renders a type-appropriate input per custom field definition for the
// add/edit patient forms:
//   integer / decimal → number input
//   text              → text input
//   date              → date picker
//   timestamp         → datetime-local picker
//   json              → JSON textarea (validated on save)
// `errors` carries per-field validation messages (keyed by field id) so JSON
// problems can be surfaced inline.
export function CustomFieldInputs({
  fields,
  values,
  onChange,
  errors,
  idPrefix = 'cf',
}: {
  fields: CustomFieldDef[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  errors?: Record<string, string>
  idPrefix?: string
}) {
  if (fields.length === 0) return null

  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Custom fields
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => {
          const inputId = `${idPrefix}-${f.id}`
          const error = errors?.[f.id]
          const label = (
            <span className="flex items-center gap-1.5">
              {f.name}
              <span className="rounded-tag border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-aqua">
                {f.slot}
              </span>
            </span>
          )
          // JSON gets a full-width textarea row.
          if (f.type === 'json') {
            return (
              <div key={f.id} className="col-span-2 flex flex-col gap-1.5">
                <label
                  htmlFor={inputId}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  {f.name}
                  <span className="rounded-tag border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-aqua">
                    {f.slot}
                  </span>
                </label>
                <textarea
                  id={inputId}
                  value={values[f.id] ?? ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  rows={3}
                  spellCheck={false}
                  placeholder={f.schema ? f.schema : '{ }'}
                  className={`w-full rounded-input border bg-background px-3 py-2 font-mono text-[13px] text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-aqua/60 ${
                    error ? 'border-destructive' : 'border-input'
                  }`}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )
          }
          // File / Image gets a full-width picker row with a preview.
          if (f.type === 'file') {
            return (
              <div key={f.id} className="col-span-2 flex flex-col gap-1.5">
                <label
                  htmlFor={inputId}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  {f.name}
                  <span className="rounded-tag border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-aqua">
                    {f.slot}
                  </span>
                </label>
                <FileFieldInput
                  inputId={inputId}
                  value={values[f.id] ?? ''}
                  onChange={(v) => onChange(f.id, v)}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )
          }
          return (
            <Field
              key={f.id}
              label={label as unknown as string}
              htmlFor={inputId}
              error={error}
            >
              <TextInput
                id={inputId}
                type={
                  f.type === 'integer' || f.type === 'decimal'
                    ? 'number'
                    : f.type === 'date'
                      ? 'date'
                      : f.type === 'timestamp'
                        ? 'datetime-local'
                        : 'text'
                }
                step={f.type === 'decimal' ? 'any' : f.type === 'integer' ? '1' : undefined}
                invalid={!!error}
                value={values[f.id] ?? ''}
                onChange={(e) => onChange(f.id, e.target.value)}
              />
            </Field>
          )
        })}
      </div>
    </fieldset>
  )
}

// File / Image picker for a single field. Reads the selected file into a
// lightweight reference (name/MIME/size + image thumbnail) — never the full
// bytes — and serializes it as the field value. Shows a preview with a remove
// control once a file is set.
function FileFieldInput({
  inputId,
  value,
  onChange,
}: {
  inputId: string
  value: string
  onChange: (value: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const ref = parseFileRef(value)

  async function handlePick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const next = await fileToRef(file)
      onChange(serializeFileRef(next))
    } finally {
      setBusy(false)
    }
  }

  if (ref) {
    return (
      <div className="flex items-center gap-3 rounded-input border border-input bg-background p-2">
        {ref.thumb && isImageMime(ref.mime) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ref.thumb || '/placeholder.svg'}
            alt={ref.name}
            className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
            <FileText className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {ref.name}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {ref.mime || 'file'}
            {ref.size ? ` · ${formatBytes(ref.size)}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex shrink-0 items-center gap-1 rounded-input px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${ref.name}`}
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={FILE_ACCEPT}
        className="sr-only"
        onChange={(e) => handlePick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-aqua/60 hover:text-foreground disabled:opacity-60"
      >
        <Upload className="h-4 w-4" />
        {busy ? 'Reading file…' : 'Choose image or document'}
      </button>
    </div>
  )
}
