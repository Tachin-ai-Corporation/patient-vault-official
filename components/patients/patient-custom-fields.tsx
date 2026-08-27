'use client'

import { forwardRef, useImperativeHandle, useState, type FormEvent } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Braces, Info, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { consoleApplicationUserId, getConsoleApplication } from '@/lib/api/console-application'
import {
  createCustomFieldDefinition,
  CUSTOM_FIELD_SECTIONS,
  customFieldDefinitionsKey,
  customFieldDisplayName,
  customFieldValuesKey,
  encodeCustomFieldDisplayName,
  getAvailableCustomDataTypes,
  getInstanceCustomData,
  listCustomFieldDefinitions,
  resolveCustomDataType,
  resolveCustomFieldSectionForField,
  updateInstanceCustomData,
  type CustomFieldDefinition,
  type CustomFieldType,
} from '@/lib/api/custom-fields'
import { resolveCustomFieldAfterWrite } from '@/lib/custom-field-resolution'
import { useSession } from '@/lib/session-context'

const TYPES: CustomFieldType[] = ['TEXT', 'INTEGER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'JSON']

// Parse the raw form string into the JSON value the API expects for the type.
function parseValue(value: string, type: CustomFieldType): unknown {
  if (type === 'INTEGER') {
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) throw new Error('Enter a whole number for an integer field.')
    return parsed
  }
  if (type === 'DECIMAL') {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) throw new Error('Enter a valid number for a decimal field.')
    return parsed
  }
  if (type === 'JSON') {
    try {
      return JSON.parse(value)
    } catch {
      throw new Error('Enter valid JSON. Text values need quotes, for example "bluegrass".')
    }
  }
  return value
}

// Turn a stored value back into an editable string for the value input.
function toInputValue(value: unknown, type: CustomFieldType): string {
  if (value === undefined || value === null) return ''
  if (type === 'JSON') return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return String(value)
}

function findFieldLocation(
  definitions: CustomFieldDefinition[],
  section: (typeof CUSTOM_FIELD_SECTIONS)[number],
  displayName: string,
) {
  for (const definition of definitions) {
    const field = definition.fields.find(
      (item) =>
        resolveCustomFieldSectionForField(definition, item, section.boClass)?.key === section.key &&
        customFieldDisplayName(item).localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0,
    )
    if (field) return { definition, field }
  }
}

function findField(
  definitions: CustomFieldDefinition[],
  section: (typeof CUSTOM_FIELD_SECTIONS)[number],
  displayName: string,
) {
  return findFieldLocation(definitions, section, displayName)?.field
}

function assertFieldType(field: ResolvedField, requestedType: CustomFieldType, definitions: CustomFieldDefinition[]) {
  if (field.fieldType !== requestedType) {
    throw new Error(
      `Definition conflict: requested ${requestedType}, but 1health resolved field key “${field.fieldKey}” as ${field.fieldType}. The value request was not sent. Delete or rename the conflicting definition, then try again.`,
    )
  }

  const conflictingTypes = new Set(
    definitions
      .flatMap((definition) => definition.fields)
      .filter((candidate) => candidate.fieldKey.toLowerCase() === field.fieldKey.toLowerCase() && candidate.fieldType !== requestedType)
      .map((candidate) => candidate.fieldType),
  )
  if (conflictingTypes.size > 0) {
    throw new Error(
      `Field-key conflict: 1health assigned “${field.fieldKey}” to both ${requestedType} and ${[...conflictingTypes].join(', ')} definitions. The value request was not sent because the API may use the wrong type. Delete or rename the older conflicting definition, then try again.`,
    )
  }
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Not set'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const inputTypeFor = (type: CustomFieldType) =>
  type === 'DATE' ? 'date' : type === 'TIMESTAMP' ? 'datetime-local' : type === 'INTEGER' || type === 'DECIMAL' ? 'number' : 'text'

type ResolvedField = CustomFieldDefinition['fields'][number]

export type CreateCustomFieldsHandle = {
  validate: () => void
  save: (instanceId: string | number) => Promise<void>
  hasValues: () => boolean
}

/**
 * Controlled custom-value inputs for a record that has not been created yet.
 * The parent creates the BO record first, then calls `save` with its returned id.
 */
export const CreateRecordCustomFields = forwardRef<CreateCustomFieldsHandle, {
  sectionKey: string
  patientId: string
  disabled?: boolean
}>(function CreateRecordCustomFields({ sectionKey, patientId, disabled = false }, ref) {
  const { currentEnv } = useSession()
  const [rawValues, setRawValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === sectionKey)
  const userId = consoleApplicationUserId(currentEnv)
  const appKey = userId ? (['console-application', currentEnv, userId] as const) : null
  const { data: appData } = useSWR(appKey, () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const definitionsKey = app && section ? customFieldDefinitionsKey(currentEnv, app.id, section.boClass) : null
  const { data: definitions = [] } = useSWR(
    definitionsKey,
    () => listCustomFieldDefinitions(app!.id, section!.boClass),
    { revalidateOnFocus: false },
  )
  const fields: ResolvedField[] = section
    ? definitions.flatMap((definition) => definition.fields.filter(
        (field) => Boolean(field.fieldKey) && resolveCustomFieldSectionForField(definition, field, section.boClass)?.key === section.key,
      ))
    : []

  function parsedValues() {
    const nextErrors: Record<string, string> = {}
    const payload: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = rawValues[field.fieldKey] ?? ''
      if (!raw.trim()) continue
      try {
        payload[field.fieldKey] = parseValue(raw, field.fieldType)
      } catch (cause) {
        nextErrors[field.fieldKey] = cause instanceof Error ? cause.message : 'The value is invalid.'
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) throw new Error('Review the custom field values and try again.')
    return payload
  }

  useImperativeHandle(ref, () => ({
    hasValues: () => Object.values(rawValues).some((value) => value.trim() !== ''),
    validate: () => { parsedValues() },
    save: async (instanceId) => {
      const payload = parsedValues()
      if (!Object.keys(payload).length) return
      const target = Number(instanceId)
      if (!app || !Number.isFinite(target) || target <= 0) {
        throw new Error('The record was created, but its custom values could not be saved because 1health did not return a usable record ID. Edit the new record to assign them.')
      }
      await updateInstanceCustomData(app.id, target, payload)
    },
  }), [app, fields, rawValues])

  if (!app || !section || fields.length === 0) return null

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <Braces className="size-4 text-muted-foreground" aria-hidden="true" />
        <h4 className="text-sm font-medium text-foreground">Custom fields</h4>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.id} label={`${customFieldDisplayName(field)} (${field.fieldType.toLowerCase()})`} htmlFor={`create-${sectionKey}-${field.fieldKey}`} error={errors[field.fieldKey]}>
            {field.fieldType === 'JSON' ? (
              <Textarea
                id={`create-${sectionKey}-${field.fieldKey}`}
                rows={3}
                disabled={disabled}
                value={rawValues[field.fieldKey] ?? ''}
                onChange={(event) => setRawValues((current) => ({ ...current, [field.fieldKey]: event.target.value }))}
                placeholder={'{"key":"value"}'}
              />
            ) : (
              <TextInput
                id={`create-${sectionKey}-${field.fieldKey}`}
                type={inputTypeFor(field.fieldType)}
                step={field.fieldType === 'DECIMAL' ? 'any' : undefined}
                disabled={disabled}
                invalid={Boolean(errors[field.fieldKey])}
                value={rawValues[field.fieldKey] ?? ''}
                onChange={(event) => setRawValues((current) => ({ ...current, [field.fieldKey]: event.target.value }))}
              />
            )}
          </Field>
        ))}
      </div>
    </div>
  )
})

/**
 * Custom-field controls for one patient-record section. Values are bound to the
 * BO instance that owns them: the patient's Person instance for patient-scoped
 * sections, or an explicit record instance (e.g. a document's File id) passed
 * via `instanceId`.
 */
export function PatientCustomFields({
  sectionKey,
  patientId,
  instanceId,
  definitionOnly = false,
  allowDefinitionCreation = true,
}: {
  sectionKey: string
  patientId: string
  instanceId?: string | number
  definitionOnly?: boolean
  allowDefinitionCreation?: boolean
}) {
  const { currentEnv } = useSession()
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldType, setFieldType] = useState<CustomFieldType>('TEXT')
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<ResolvedField | null>(null)
  const [details, setDetails] = useState<ResolvedField | null>(null)

  const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === sectionKey)
  const userId = consoleApplicationUserId(currentEnv)
  const appKey = userId ? (['console-application', currentEnv, userId] as const) : null
  const { data: appData } = useSWR(appKey, () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const { data: availableTypes = [] } = useSWR(
    app ? ['custom-data-available-types', currentEnv] : null,
    getAvailableCustomDataTypes,
    { revalidateOnFocus: false },
  )
  const availableType = section ? resolveCustomDataType(availableTypes, section.boClass) : undefined
  // Record-scoped sections need an explicit instance id; patient-scoped ones
  // fall back to the patient's Person instance. Definition-only mode never
  // manufactures an instance, so it cannot write values accidentally.
  const targetInstance = Number(instanceId ?? (section?.scope === 'patient' ? patientId : Number.NaN))
  const hasInstance = !definitionOnly && Number.isFinite(targetInstance) && targetInstance > 0

  const definitionsKey = app && section ? customFieldDefinitionsKey(currentEnv, app.id, section.boClass) : null
  const { data: definitions = [], mutate: mutateDefinitions } = useSWR(
    definitionsKey,
    () => listCustomFieldDefinitions(app!.id, section!.boClass),
    { revalidateOnFocus: false },
  )
  const valuesKey = app && section && hasInstance ? customFieldValuesKey(currentEnv, app.id, section.boClass, targetInstance) : null
  const { data: values = {}, mutate: mutateValues } = useSWR(valuesKey, () => getInstanceCustomData(app!.id, targetInstance), { revalidateOnFocus: false })

  if (!section) return null

  const sectionFields: ResolvedField[] = definitions.flatMap((definition) =>
    definition.fields.filter(
      (field) => resolveCustomFieldSectionForField(definition, field, section.boClass)?.key === section.key,
    ),
  )

  async function saveValue(field: ResolvedField, rawValue: string) {
    if (!app) return
    let parsed: unknown
    try {
      parsed = parseValue(rawValue, field.fieldType)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The value is invalid.')
      return false
    }
    const next = await updateInstanceCustomData(app.id, targetInstance, { [field.fieldKey]: parsed })
    await mutateValues(next, false)
    return true
  }

  async function addField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!app || !section) return
    const form = new FormData(event.currentTarget)
    const displayName = String(form.get('displayName') ?? '').trim()
    const rawValue = String(form.get('value') ?? '')

    try {
      setSaving(true)
      setMessage(null)
      if (!availableType) throw new Error(`${section.boClass} is not returned by the available custom data types API.`)
      const definitionName = `${section.label}: ${displayName}`
      const apiDisplayName = encodeCustomFieldDisplayName(section.key, displayName)
      let resolvedDefinitions = definitions
      let field = findFieldLocation(resolvedDefinitions, section, displayName)?.field
      let created = false

      const loadDefinitions = async () => {
        const latest = await listCustomFieldDefinitions(app.id, section.boClass)
        await mutateDefinitions(latest, false)
        return latest
      }
      const resolveField = () =>
        resolveCustomFieldAfterWrite(loadDefinitions, {
          sectionKey: section.key,
          boClass: section.boClass,
          displayName,
        })

      // Refresh before POSTing so a previous successful create whose response was
      // incomplete is reused instead of producing a duplicate request.
      if (!field?.fieldKey) {
        const latest = await loadDefinitions()
        resolvedDefinitions = latest
        field = findFieldLocation(latest, section, displayName)?.field
      }

      // A matching definition without a generated key means an earlier create is
      // still propagating. Resolve it first and never POST a duplicate.
      if (field && !field.fieldKey) {
        const resolved = await resolveField()
        resolvedDefinitions = resolved.definitions as CustomFieldDefinition[]
        field = resolved.field as ResolvedField | undefined
        if (!field) {
          throw new Error(`The field “${displayName}” already exists, but 1health has not made its generated key available yet. Close this dialog and try saving it again shortly; do not define it again.`)
        }
      }

      if (!field) {
        try {
          const createdDefinition = await createCustomFieldDefinition(app.id, {
            name: definitionName,
            boClassId: availableType.id,
            fields: [{ displayName: apiDisplayName, fieldType }],
          })
          created = true
          const createdField = createdDefinition
            ? findField([createdDefinition], section, displayName)
            : undefined
          if (createdField?.fieldKey) {
            resolvedDefinitions = [...resolvedDefinitions, createdDefinition!]
            await mutateDefinitions(resolvedDefinitions, false)
            field = createdField
          } else {
            const resolved = await resolveField()
            resolvedDefinitions = resolved.definitions as CustomFieldDefinition[]
            field = resolved.field as ResolvedField | undefined
          }
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : ''
          if (!/already exists|duplicate/i.test(detail)) throw cause
          const resolved = await resolveField()
          resolvedDefinitions = resolved.definitions as CustomFieldDefinition[]
          field = resolved.field as ResolvedField | undefined
          if (!field) {
            throw new Error(`The custom field name “${displayName}” is already taken in 1health, but no usable matching field appeared in ${section.label}. Choose a different name.`)
          }
        }
      }
      if (!field?.fieldKey) {
        throw new Error(`The field “${displayName}” was created, but 1health has not made its generated key available yet. Close this dialog, reopen the field, and save its value without defining it again.`)
      }
      assertFieldType(field, fieldType, resolvedDefinitions)

      if (definitionOnly) {
        setAddOpen(false)
        return
      }

      let parsed: unknown
      try {
        parsed = parseValue(rawValue, fieldType)
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : 'The value is invalid.')
        return
      }
      try {
        const next = await updateInstanceCustomData(app.id, targetInstance, { [field.fieldKey]: parsed })
        await mutateValues(next, false)
        setAddOpen(false)
      } catch (cause) {
        await mutateDefinitions()
        const status = created ? `The field “${displayName}” was created, but its value was not saved.` : `The value for existing field “${displayName}” was not saved.`
        throw new Error(`${status} Reopen it and try again. ${cause instanceof Error ? cause.message : ''}`.trim())
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to save the custom field.')
    } finally {
      setSaving(false)
    }
  }

  if (!app) {
    const returnTo = `/patients/${encodeURIComponent(patientId)}#custom-fields-${section.key}`
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">Custom fields require a Patient Vault application.</p>
        <Button size="sm" variant="outline" render={<Link href={`/console?returnTo=${encodeURIComponent(returnTo)}`} />}>Set up in Console</Button>
      </div>
    )
  }

  const canAdd = definitionOnly || hasInstance

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Braces className="size-4 text-muted-foreground" aria-hidden="true" />
          <h4 className="text-sm font-medium text-foreground">Custom fields</h4>
        </div>
        {canAdd && allowDefinitionCreation && (
          <Dialog open={addOpen} onOpenChange={(next) => { setAddOpen(next); if (!next) setMessage(null) }}>
            <DialogTrigger render={<Button type="button" size="sm" variant="outline"><Plus data-icon="inline-start" aria-hidden="true" />Add custom field</Button>} />
            <DialogContent>
              <form onSubmit={addField}>
                <DialogHeader>
                  <DialogTitle>Add custom field</DialogTitle>
                  <DialogDescription>{definitionOnly ? `Define a reusable field for ${section.label.toLowerCase()}. Assign its value while editing an individual record.` : `Define a reusable field for ${section.label.toLowerCase()} and save its value for this patient.`}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-5">
                  <Field label="Field name" htmlFor={`${section.key}-field-name`}><TextInput id={`${section.key}-field-name`} name="displayName" required maxLength={80} /></Field>
                  <Field label="Field type" htmlFor={`${section.key}-field-type`}><Select id={`${section.key}-field-type`} name="fieldType" value={fieldType} onChange={(event) => setFieldType(event.target.value as CustomFieldType)}>{TYPES.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}</Select></Field>
                  {!definitionOnly && <Field label="Value" htmlFor={`${section.key}-field-value`}>{fieldType === 'JSON' ? <Textarea id={`${section.key}-field-value`} name="value" required rows={4} placeholder={'{"genre":"bluegrass"}'} /> : <TextInput id={`${section.key}-field-value`} name="value" type={inputTypeFor(fieldType)} step={fieldType === 'DECIMAL' ? 'any' : undefined} required />}</Field>}
                  {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : definitionOnly ? 'Define field' : 'Define and save'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {definitionOnly && (
        <p className="text-xs leading-relaxed text-muted-foreground">These definitions are shared by all {section.label.toLowerCase()} records. Edit an individual record to assign or change its values.</p>
      )}

      {!canAdd ? (
        <p className="text-xs text-muted-foreground">Create a {section.label.toLowerCase().replace(/s$/, '')} record first to attach custom field values.</p>
      ) : sectionFields.length ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {sectionFields.map((field) => (
            <div key={field.id} className="group flex items-start justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">{customFieldDisplayName(field)}<span className="font-mono text-[10px] uppercase tracking-wider opacity-70">{field.fieldType.toLowerCase()}</span></dt>
                <dd className="mt-0.5 break-words text-sm text-foreground">{definitionOnly ? 'Set on individual records' : formatValue(values[field.fieldKey])}</dd>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {!definitionOnly && <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${customFieldDisplayName(field)}`} onClick={() => { setMessage(null); setEditing(field) }}><Pencil className="size-3.5" aria-hidden="true" /></Button>}
                <Button type="button" variant="ghost" size="icon" aria-label={`Details for ${customFieldDisplayName(field)}`} onClick={() => setDetails(field)}><Info className="size-3.5" aria-hidden="true" /></Button>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">No custom fields for this section.</p>
      )}

      {/* Edit value — type-aware, saves through the instance endpoint. */}
      <Dialog open={!!editing} onOpenChange={(next) => { if (!next) { setEditing(null); setMessage(null) } }}>
        <DialogContent>
          {editing && (
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                const raw = String(new FormData(event.currentTarget).get('value') ?? '')
                setSaving(true)
                setMessage(null)
                try {
                  if (await saveValue(editing, raw)) setEditing(null)
                } catch (cause) {
                  setMessage(cause instanceof Error ? cause.message : 'Unable to save the value.')
                } finally {
                  setSaving(false)
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit {customFieldDisplayName(editing)}</DialogTitle>
                <DialogDescription>Update the {editing.fieldType.toLowerCase()} value stored for this {section.scope === 'record' ? 'record' : 'patient'}.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-5">
                <Field label="Value" htmlFor="edit-field-value">
                  {editing.fieldType === 'JSON' ? (
                    <Textarea id="edit-field-value" name="value" rows={4} defaultValue={toInputValue(values[editing.fieldKey], editing.fieldType)} />
                  ) : (
                    <TextInput id="edit-field-value" name="value" type={inputTypeFor(editing.fieldType)} step={editing.fieldType === 'DECIMAL' ? 'any' : undefined} defaultValue={toInputValue(values[editing.fieldKey], editing.fieldType)} />
                  )}
                </Field>
                {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save value'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Read-only definition metadata. The v3 API cannot edit field metadata
          after creation, so this view is informational only. */}
      <Dialog open={!!details} onOpenChange={(next) => { if (!next) setDetails(null) }}>
        <DialogContent>
          {details && (
            <>
              <DialogHeader>
                <DialogTitle>{customFieldDisplayName(details)}</DialogTitle>
                <DialogDescription>Field definition details. Definitions are shared across every {section.label.toLowerCase()} record.</DialogDescription>
              </DialogHeader>
              <dl className="flex flex-col gap-3 py-5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Field key</dt><dd className="font-mono text-foreground">{details.fieldKey}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Field type</dt><dd className="text-foreground">{details.fieldType}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Owning BO class</dt><dd className="text-foreground">{section.boClass} · {availableType?.id ?? 'Unavailable'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Application</dt><dd className="text-foreground">{app.name} · {app.id}</dd></div>
                {details.jsonSchema && (
                  <div className="flex flex-col gap-1"><dt className="text-muted-foreground">JSON schema</dt><dd><pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-xs text-foreground">{details.jsonSchema}</pre></dd></div>
                )}
              </dl>
              <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Field metadata (name, type, and schema) can&apos;t be changed after creation in the current API. Edit its value from the section, or define a new field for a different shape.</p>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDetails(null)}>Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
