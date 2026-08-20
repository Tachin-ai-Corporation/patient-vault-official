'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Braces, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Select, TextInput } from '@/components/ui/field'
import { getConsoleApplication } from '@/lib/api/console-application'
import { createCustomFieldDefinition, CUSTOM_FIELD_SECTIONS, listCustomFieldDefinitions, updatePatientCustomData, type CustomFieldType } from '@/lib/api/custom-fields'
import { useSession } from '@/lib/session-context'

const TYPES: CustomFieldType[] = ['TEXT', 'INTEGER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'JSON']

function parseValue(value: string, type: CustomFieldType): unknown {
  if (type === 'INTEGER') return Number.parseInt(value, 10)
  if (type === 'DECIMAL') return Number.parseFloat(value)
  if (type === 'JSON') return JSON.parse(value)
  return value
}

export function PatientCustomFields({ sectionKey, patientId }: { sectionKey: string; patientId: string }) {
  const { currentEnv } = useSession()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === sectionKey)
  const { data: appData } = useSWR(['console-application', currentEnv], () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const numericId = Number(patientId)
  const key = app && section && Number.isFinite(numericId) ? ['patient-custom-fields', currentEnv, app.id, section.key, numericId] as const : null
  const { data, mutate } = useSWR(key, async () => {
    const definitions = await listCustomFieldDefinitions(app!.id, section!.boClassId)
    return { definitions: definitions.filter((definition) => definition.name.startsWith(`${section!.label}:`)) }
  }, { revalidateOnFocus: false })

  if (!section) return null

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!app || !section) return
    const activeSection = section
    const form = new FormData(event.currentTarget)
    const displayName = String(form.get('displayName') ?? '').trim()
    const fieldType = String(form.get('fieldType')) as CustomFieldType
    const rawValue = String(form.get('value') ?? '')
    try {
      setSaving(true)
      setMessage(null)
      const definition = await createCustomFieldDefinition(app.id, {
        name: `${activeSection.label}: ${displayName}`,
        boClassId: activeSection.boClassId,
        fields: [{ displayName, fieldType }],
      })
      const field = definition.fields[0]
      if (!field?.fieldPosition) throw new Error('The API did not return a storage position for this field.')
      await updatePatientCustomData(numericId, { [field.fieldPosition]: parseValue(rawValue, fieldType) })
      await mutate()
      setOpen(false)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to save the custom field.')
    } finally {
      setSaving(false)
    }
  }

  if (!app) {
    return <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2"><p className="text-xs text-muted-foreground">Custom fields require a Patient Vault application.</p><Button size="sm" variant="outline" render={<Link href="/console" />}>Set up in Console</Button></div>
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Braces className="size-4 text-muted-foreground" aria-hidden="true" /><h4 className="text-sm font-medium text-foreground">Custom fields</h4></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button type="button" size="sm" variant="outline"><Plus data-icon="inline-start" aria-hidden="true" />Add custom field</Button>} /><DialogContent><form onSubmit={save}><DialogHeader><DialogTitle>Add custom field</DialogTitle><DialogDescription>Define a reusable field for {section.label.toLowerCase()} and save its value for this patient.</DialogDescription></DialogHeader><div className="flex flex-col gap-4 py-5"><Field label="Field name" htmlFor={`${section.key}-field-name`}><TextInput id={`${section.key}-field-name`} name="displayName" required maxLength={80} /></Field><Field label="Field type" htmlFor={`${section.key}-field-type`}><Select id={`${section.key}-field-type`} name="fieldType" defaultValue="TEXT">{TYPES.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}</Select></Field><Field label="Value" htmlFor={`${section.key}-field-value`}><TextInput id={`${section.key}-field-value`} name="value" required /></Field>{message && <p className="text-sm text-destructive">{message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Define and save'}</Button></DialogFooter></form></DialogContent></Dialog></div>
      {data?.definitions.length ? <dl className="grid gap-2 sm:grid-cols-2">{data.definitions.flatMap((definition) => definition.fields.map((field) => <div key={field.id} className="rounded-lg bg-muted/30 px-3 py-2"><dt className="text-xs text-muted-foreground">{field.displayName}</dt><dd className="mt-0.5 break-words text-sm text-muted-foreground">Saved on this patient record</dd></div>))}</dl> : <p className="text-xs text-muted-foreground">No custom values for this section.</p>}
    </div>
  )
}
