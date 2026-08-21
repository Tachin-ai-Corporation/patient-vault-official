'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Braces, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { getConsoleApplication } from '@/lib/api/console-application'
import {
  createCustomFieldDefinition,
  CUSTOM_FIELD_SECTIONS,
  customFieldDefinitionsKey,
  customFieldValuesKey,
  getPatientCustomData,
  listCustomFieldDefinitions,
  updatePatientCustomData,
  type CustomFieldDefinition,
  type CustomFieldType,
} from '@/lib/api/custom-fields'
import { useSession } from '@/lib/session-context'

const TYPES: CustomFieldType[] = ['TEXT', 'INTEGER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'JSON']

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

function fieldKeyCandidate(name: string) {
  const words = name.trim().replace(/[^a-zA-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean)
  return words.map((word, index) => index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)).join('').toLowerCase()
}

function findField(definitions: CustomFieldDefinition[], displayName: string) {
  const expectedKey = fieldKeyCandidate(displayName)
  for (const definition of definitions) {
    const field = definition.fields.find((item) => item.displayName.localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0 || item.fieldKey.toLowerCase() === expectedKey)
    if (field) return field
  }
}

function formatValue(value: unknown) {
  if (value === undefined || value === null || value === '') return 'Not set'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function PatientCustomFields({ sectionKey, patientId }: { sectionKey: string; patientId: string }) {
  const { currentEnv } = useSession()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldType, setFieldType] = useState<CustomFieldType>('TEXT')
  const [message, setMessage] = useState<string | null>(null)
  const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === sectionKey)
  const { data: appData } = useSWR(['console-application', currentEnv], () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const numericId = Number(patientId)
  const definitionsKey = app && section ? customFieldDefinitionsKey(currentEnv, app.id, section.boClassId) : null
  const { data: allDefinitions = [], mutate: mutateDefinitions } = useSWR(definitionsKey, () => listCustomFieldDefinitions(app!.id, section!.boClassId), { revalidateOnFocus: false })
  const valuesKey = app && Number.isFinite(numericId) ? customFieldValuesKey(currentEnv, app.id, numericId) : null
  const { data: values = {}, mutate: mutateValues } = useSWR(valuesKey, () => getPatientCustomData(app!.id, numericId), { revalidateOnFocus: false })

  if (!section) return null
  const definitions = allDefinitions.filter((definition) => definition.name.startsWith(`${section.label}:`))

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!app || !section) return
    const form = new FormData(event.currentTarget)
    const displayName = String(form.get('displayName') ?? '').trim()
    const rawValue = String(form.get('value') ?? '')
    let parsedValue: unknown
    try {
      parsedValue = parseValue(rawValue, fieldType)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'The value is invalid.')
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      let field = findField(allDefinitions, displayName)
      if (!field) {
        try {
          const definition = await createCustomFieldDefinition(app.id, {
            name: `${section.label}: ${displayName}`,
            boClassId: section.boClassId,
            fields: [{ displayName, fieldType }],
          })
          field = definition.fields[0]
          if (field) await mutateDefinitions([...allDefinitions, definition], false)
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : ''
          if (!/already exists|duplicate/i.test(detail)) throw cause
          const refreshed = await mutateDefinitions()
          field = findField(refreshed ?? [], displayName)
          if (!field) throw new Error('This field already exists, but could not be loaded. Refresh the patient and try again.')
        }
      }
      if (!field?.fieldKey) throw new Error('The field was created, but its API key was not returned. Refresh the patient to load the new field.')

      try {
        const nextValues = await updatePatientCustomData(app.id, numericId, { [field.fieldKey]: parsedValue })
        await mutateValues(nextValues, false)
        setOpen(false)
      } catch (cause) {
        await mutateDefinitions()
        throw new Error(`The field “${displayName}” was created, but its value was not saved. Reopen it and try again. ${cause instanceof Error ? cause.message : ''}`.trim())
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to save the custom field.')
    } finally {
      setSaving(false)
    }
  }

  if (!app) {
    const returnTo = `/patients/${encodeURIComponent(patientId)}#custom-fields-${section.key}`
    return <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2"><p className="text-xs text-muted-foreground">Custom fields require a Patient Vault application.</p><Button size="sm" variant="outline" render={<Link href={`/console?returnTo=${encodeURIComponent(returnTo)}`} />}>Set up in Console</Button></div>
  }

  const inputType = fieldType === 'DATE' ? 'date' : fieldType === 'TIMESTAMP' ? 'datetime-local' : fieldType === 'INTEGER' || fieldType === 'DECIMAL' ? 'number' : 'text'

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Braces className="size-4 text-muted-foreground" aria-hidden="true" /><h4 className="text-sm font-medium text-foreground">Custom fields</h4></div><Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setMessage(null) }}><DialogTrigger render={<Button type="button" size="sm" variant="outline"><Plus data-icon="inline-start" aria-hidden="true" />Add custom field</Button>} /><DialogContent><form onSubmit={save}><DialogHeader><DialogTitle>Add custom field</DialogTitle><DialogDescription>Define a reusable field for {section.label.toLowerCase()} and save its value for this patient.</DialogDescription></DialogHeader><div className="flex flex-col gap-4 py-5"><Field label="Field name" htmlFor={`${section.key}-field-name`}><TextInput id={`${section.key}-field-name`} name="displayName" required maxLength={80} /></Field><Field label="Field type" htmlFor={`${section.key}-field-type`}><Select id={`${section.key}-field-type`} name="fieldType" value={fieldType} onChange={(event) => setFieldType(event.target.value as CustomFieldType)}>{TYPES.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}</Select></Field><Field label="Value" htmlFor={`${section.key}-field-value`}>{fieldType === 'JSON' ? <Textarea id={`${section.key}-field-value`} name="value" required rows={4} placeholder={'{"genre":"bluegrass"}'} /> : <TextInput id={`${section.key}-field-value`} name="value" type={inputType} step={fieldType === 'DECIMAL' ? 'any' : undefined} required />}</Field>{message && <p className="text-sm text-destructive" role="alert">{message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Define and save'}</Button></DialogFooter></form></DialogContent></Dialog></div>
      {definitions.length ? <dl className="grid gap-2 sm:grid-cols-2">{definitions.flatMap((definition) => definition.fields.map((field) => <div key={field.id} className="rounded-lg bg-muted/30 px-3 py-2"><dt className="text-xs text-muted-foreground">{field.displayName}</dt><dd className="mt-0.5 break-words text-sm text-foreground">{formatValue(values[field.fieldKey])}</dd></div>))}</dl> : <p className="text-xs text-muted-foreground">No custom fields for this section.</p>}
    </div>
  )
}
