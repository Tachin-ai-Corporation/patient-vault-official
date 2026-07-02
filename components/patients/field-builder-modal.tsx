'use client'

import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Columns3, Check, X, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  CUSTOM_FIELD_TYPES,
  MAX_FIELD_NAME_LENGTH,
  customFieldTypeLabel,
  useCustomFields,
  type CustomFieldType,
} from '@/lib/custom-fields-context'

// The custom field manager for the Patients schema. A field is DEFINED here
// (name + type → auto-assigned typed slot); values are entered per-patient in
// the add/edit forms. Definitions persist to localStorage.
export function FieldBuilderModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { fields, addField, renameField, removeField, slotsRemaining } =
    useCustomFields()

  const [name, setName] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [schema, setSchema] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Inline rename state.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const trimmed = name.trim()
  const remainingForType = slotsRemaining(type)
  const tooLong = trimmed.length > MAX_FIELD_NAME_LENGTH
  const canAdd = trimmed.length > 0 && !tooLong && remainingForType > 0

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const result = addField(trimmed, type, type === 'json' ? schema : undefined)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setName('')
    setSchema('')
    setError(null)
  }

  function startEdit(id: string, current: string) {
    setEditingId(id)
    setEditName(current)
    setEditError(null)
  }

  function commitEdit(id: string) {
    const result = renameField(id, editName)
    if (!result.ok) {
      setEditError(result.error)
      return
    }
    setEditingId(null)
    setEditError(null)
  }

  const activeType = CUSTOM_FIELD_TYPES.find((t) => t.type === type)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Custom fields"
      description="Define your own attributes on the Patients schema. Each field is assigned a typed slot and appears in the add/edit form, the patient detail view, and the grid's Columns menu."
      className="max-w-2xl"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Define a field */}
        <form
          onSubmit={handleAdd}
          className="rounded-card border border-border bg-muted/30 p-4"
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Define a field
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Field name"
              htmlFor="cf-name"
              error={
                tooLong
                  ? `Max ${MAX_FIELD_NAME_LENGTH} characters.`
                  : undefined
              }
            >
              <TextInput
                id="cf-name"
                value={name}
                invalid={tooLong}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="e.g. Eye Color"
                autoFocus
              />
            </Field>
            <Field label="Type" htmlFor="cf-type">
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as CustomFieldType)
                  setError(null)
                }}
              >
                <SelectTrigger id="cf-type" />
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((t) => {
                    const remaining = slotsRemaining(t.type)
                    return (
                      <SelectItem
                        key={t.type}
                        value={t.type}
                        disabled={remaining === 0}
                      >
                        {t.label}
                        {remaining === 0 ? ' — no slots remaining' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Type hint + slot availability. */}
          <div className="mt-2 flex items-center justify-between gap-3">
            {activeType && (
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                {activeType.hint}
              </p>
            )}
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {remainingForType}/{activeType?.max ?? 0} slots free
            </span>
          </div>

          {/* Optional JSON schema for JSON-type fields. */}
          {type === 'json' && (
            <div className="mt-3">
              <label
                htmlFor="cf-schema"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                JSON schema{' '}
                <span className="font-normal text-muted-foreground/70">
                  (optional)
                </span>
              </label>
              <textarea
                id="cf-schema"
                value={schema}
                onChange={(e) => {
                  setSchema(e.target.value)
                  setError(null)
                }}
                rows={4}
                spellCheck={false}
                placeholder={'{ "required": ["systolic", "diastolic"] }'}
                className="w-full rounded-input border border-input bg-background px-3 py-2 font-mono text-[13px] text-foreground transition-colors placeholder:text-muted-foreground/60 focus-visible:border-aqua/60"
              />
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">
                Entered values are checked against this schema (valid JSON, and
                any required keys present) before save.
              </p>
            </div>
          )}

          {remainingForType === 0 && (
            <p className="mt-2 text-xs text-destructive">
              No {customFieldTypeLabel(type)} slots remaining. Delete a{' '}
              {customFieldTypeLabel(type)} field to free one.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <Button type="submit" className="mt-4" disabled={!canAdd}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Define field
          </Button>
        </form>

        {/* Existing fields */}
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {fields.length} custom field{fields.length === 1 ? '' : 's'}
          </p>
          {fields.length === 0 ? (
            <div className="rounded-card border border-dashed border-border px-4 py-8 text-center">
              <Columns3 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No custom fields yet. Define one above to extend the patient
                schema.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {fields.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-input border border-border bg-background px-3 py-2.5"
                >
                  {editingId === f.id ? (
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <TextInput
                          value={editName}
                          invalid={!!editError}
                          maxLength={MAX_FIELD_NAME_LENGTH + 10}
                          onChange={(e) => {
                            setEditName(e.target.value)
                            setEditError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault()
                              commitEdit(f.id)
                            }
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                        />
                        {editError && (
                          <p className="mt-1 text-xs text-destructive">
                            {editError}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => commitEdit(f.id)}
                        aria-label="Save name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="rounded-tag border border-aqua/30 bg-aqua/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-aqua"
                          title={`Typed slot ${f.slot}`}
                        >
                          {f.slot}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {f.name}
                          </p>
                          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                            {customFieldTypeLabel(f.type)}
                            {f.type === 'json' && f.schema
                              ? ' · schema'
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(f.id, f.name)}
                        >
                          <Pencil
                            className="h-3.5 w-3.5"
                            data-icon="inline-start"
                          />
                          Rename
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(f.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2
                            className="h-3.5 w-3.5"
                            data-icon="inline-start"
                          />
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
