'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { Braces, Download, FileJson, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { EnvBadge } from '@/components/env-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { getConsoleApplication } from '@/lib/api/console-application'
import { createCustomFieldDefinition, CUSTOM_FIELD_SECTIONS, deleteCustomFieldDefinition, listCustomFieldDefinitions, type CustomFieldDefinition, type CustomFieldType } from '@/lib/api/custom-fields'
import { useSession } from '@/lib/session-context'

const FIELD_TYPES: CustomFieldType[] = ['TEXT', 'INTEGER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'JSON']

type SectionResult = { section: (typeof CUSTOM_FIELD_SECTIONS)[number]; definitions: CustomFieldDefinition[] }

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function portableSchema(results: SectionResult[]) {
  return {
    schema: 'patient-vault/custom-fields',
    version: 1,
    sections: results.map(({ section, definitions }) => ({
      key: section.key,
      fields: definitions.flatMap((definition) => definition.fields.map((field) => ({
        displayName: field.displayName,
        fieldType: field.fieldType,
        jsonSchema: field.jsonSchema || undefined,
      }))),
    })),
  }
}

function toMarkdown(results: SectionResult[], environment: string) {
  const rows = results.flatMap(({ section, definitions }) => definitions.flatMap((definition) => definition.fields.map((field) => `| ${section.label} | ${field.displayName.replaceAll('|', '\\|')} | ${field.fieldType} |`)))
  return ['# Patient Vault custom fields', '', `Environment: ${environment}`, '', '| Section | Field | Type |', '| --- | --- | --- |', ...rows, ''].join('\n')
}

export function CustomFieldDefinitions() {
  const { currentEnv } = useSession()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const appKey = ['console-application', currentEnv] as const
  const { data: appData, isLoading: appLoading } = useSWR(appKey, () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const definitionsKey = app ? ['custom-field-definitions', currentEnv, app.id] as const : null
  const { data: results = [], error, isLoading, mutate } = useSWR(definitionsKey, async () => Promise.all(CUSTOM_FIELD_SECTIONS.map(async (section) => ({ section, definitions: (await listCustomFieldDefinitions(app!.id, section.boClassId)).filter((definition) => definition.name.startsWith(`${section.label}:`)) }))), { revalidateOnFocus: false })
  const count = useMemo(() => results.reduce((total, result) => total + result.definitions.reduce((sum, definition) => sum + definition.fields.length, 0), 0), [results])
  const filenameBase = `patient-vault-${currentEnv}-custom-fields`

  async function createField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!app) return
    setErrorMessage(null)
    const form = new FormData(event.currentTarget)
    const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === form.get('section'))
    const displayName = String(form.get('displayName') ?? '').trim()
    const fieldType = String(form.get('fieldType')) as CustomFieldType
    const jsonSchema = String(form.get('jsonSchema') ?? '').trim()
    if (!section || !displayName) return
    try {
      setSaving(true)
      if (fieldType === 'JSON' && jsonSchema) JSON.parse(jsonSchema)
      await createCustomFieldDefinition(app.id, {
        name: `${section.label}: ${displayName}`,
        boClassId: section.boClassId,
        fields: [{ displayName, fieldType, ...(jsonSchema ? { jsonSchema } : {}) }],
      })
      await mutate()
      setOpen(false)
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Unable to create the field.')
    } finally {
      setSaving(false)
    }
  }

  async function retire(definition: CustomFieldDefinition) {
    if (!app || !window.confirm(`Retire “${definition.name}”? Existing stored values may no longer be shown.`)) return
    await deleteCustomFieldDefinition(app.id, definition.id)
    await mutate()
  }

  async function importJson(file: File) {
    if (!app) return
    setErrorMessage(null)
    try {
      const parsed = JSON.parse(await file.text()) as { schema?: string; version?: number; sections?: Array<{ key: string; fields: Array<{ displayName: string; fieldType: CustomFieldType; jsonSchema?: string }> }> }
      if (parsed.schema !== 'patient-vault/custom-fields' || parsed.version !== 1 || !Array.isArray(parsed.sections)) throw new Error('This is not a supported Patient Vault custom-field export.')
      setSaving(true)
      for (const importedSection of parsed.sections) {
        const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === importedSection.key)
        if (!section) continue
        for (const field of importedSection.fields ?? []) {
          if (!FIELD_TYPES.includes(field.fieldType) || !field.displayName?.trim()) continue
          await createCustomFieldDefinition(app.id, { name: `${section.label}: ${field.displayName}`, boClassId: section.boClassId, fields: [field] })
        }
      }
      await mutate()
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Import failed.')
    } finally {
      setSaving(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <section aria-labelledby="custom-fields-title">
      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><Braces aria-hidden="true" /></div><div className="flex flex-col gap-1"><div className="flex flex-wrap items-center gap-2"><CardTitle id="custom-fields-title" className="text-lg text-balance">Custom field definitions</CardTitle><EnvBadge env={currentEnv} /></div><CardDescription className="max-w-2xl text-pretty">Define reusable fields for each patient-record section, then export a portable schema.</CardDescription></div></div>
            <span className="shrink-0 font-mono text-sm text-muted-foreground">{count} {count === 1 ? 'field' : 'fields'}</span>
          </div>
        </CardHeader>
        <CardContent>
          {appLoading ? <div className="h-24 rounded-lg bg-muted/40" /> : !app ? <Alert><FileJson aria-hidden="true" /><AlertTitle>Set up the application first</AlertTitle><AlertDescription>Custom field definitions are enabled after the Patient Vault application above has been created.</AlertDescription></Alert> : error ? <Alert variant="destructive"><AlertTitle>Definitions unavailable</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : isLoading ? <div className="h-24 rounded-lg bg-muted/40" /> : count === 0 ? <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-6 text-center"><Braces className="text-muted-foreground" aria-hidden="true" /><p className="font-medium text-foreground">No custom fields yet</p><p className="max-w-md text-sm text-muted-foreground">Create a reusable field for demographics, aliases, contacts, addresses, documents, or external identities.</p></div> : <div className="flex flex-col gap-6">{results.filter(({ definitions }) => definitions.length > 0).map(({ section, definitions }) => <div key={section.key} className="flex flex-col gap-2"><h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{section.label}</h3><ul className="flex flex-col gap-2">{definitions.map((definition) => definition.fields.map((field) => <li key={`${definition.id}-${field.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"><div className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-sm font-medium text-foreground">{field.displayName}</span><span className="font-mono text-xs text-muted-foreground">{field.fieldKey} · {field.fieldType}</span></div><Button type="button" variant="ghost" size="icon" onClick={() => retire(definition)} aria-label={`Retire ${field.displayName}`}><Trash2 aria-hidden="true" /></Button></li>))}</ul></div>)}</div>}
          {errorMessage && <Alert variant="destructive" className="mt-4"><AlertTitle>Custom field action failed</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}
        </CardContent>
        {app && <CardFooter className="flex-wrap justify-between gap-2 border-t"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => importRef.current?.click()}><Upload data-icon="inline-start" aria-hidden="true" />Import JSON</Button><input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file) }} />{count > 0 && <><Button type="button" variant="outline" onClick={() => downloadFile(`${filenameBase}.json`, `${JSON.stringify(portableSchema(results), null, 2)}\n`, 'application/json')}><Download data-icon="inline-start" aria-hidden="true" />JSON</Button><Button type="button" variant="outline" onClick={() => downloadFile(`${filenameBase}.md`, toMarkdown(results, currentEnv), 'text/markdown')}><FileText data-icon="inline-start" aria-hidden="true" />Markdown</Button></>}</div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button type="button"><Plus data-icon="inline-start" aria-hidden="true" />Add field</Button>} /><DialogContent><form onSubmit={createField}><DialogHeader><DialogTitle>Add custom field</DialogTitle><DialogDescription>Create one reusable definition for a patient record section.</DialogDescription></DialogHeader><div className="flex flex-col gap-4 py-5"><Field label="Patient record section" htmlFor="field-section"><Select id="field-section" name="section" defaultValue="demographics">{CUSTOM_FIELD_SECTIONS.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}</Select></Field><Field label="Field name" htmlFor="field-name"><TextInput id="field-name" name="displayName" required maxLength={80} placeholder="Preferred pharmacy" /></Field><Field label="Field type" htmlFor="field-type"><Select id="field-type" name="fieldType" defaultValue="TEXT">{FIELD_TYPES.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}</Select></Field><Field label="JSON schema (JSON fields only)" htmlFor="json-schema"><Textarea id="json-schema" name="jsonSchema" rows={3} placeholder={'{"type":"object"}'} /></Field>{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create field'}</Button></DialogFooter></form></DialogContent></Dialog></CardFooter>}
      </Card>
    </section>
  )
}
