'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { Braces, Download, FileJson, FileText, Info, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { EnvBadge } from '@/components/env-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Field, Select, TextInput } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { consoleApplicationUserId, getConsoleApplication } from '@/lib/api/console-application'
import { createCustomFieldDefinition, CUSTOM_FIELD_SECTIONS, customFieldDisplayName, deleteCustomField, encodeCustomFieldDisplayName, getAvailableCustomDataTypes, listCustomFieldDefinitions, resolveCustomDataType, resolveCustomFieldSection, type BoClassName, type CustomFieldDefinition, type CustomFieldType } from '@/lib/api/custom-fields'
import { validateFieldDeletion } from '@/lib/custom-field-deletion'
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
        displayName: customFieldDisplayName(field),
        fieldType: field.fieldType,
        jsonSchema: field.jsonSchema || undefined,
      }))),
    })),
  }
}

function toMarkdown(results: SectionResult[], environment: string) {
  const rows = results.flatMap(({ section, definitions }) => definitions.flatMap((definition) => definition.fields.map((field) => `| ${section.label} | ${customFieldDisplayName(field).replaceAll('|', '\\|')} | ${field.fieldType} |`)))
  return ['# Patient Vault custom fields', '', `Environment: ${environment}`, '', '| Section | Field | Type |', '| --- | --- | --- |', ...rows, ''].join('\n')
}

export function CustomFieldDefinitions() {
  const { currentEnv } = useSession()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    definition: CustomFieldDefinition
    field: CustomFieldDefinition['fields'][number]
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const userId = consoleApplicationUserId(currentEnv)
  const appKey = userId ? (['console-application', currentEnv, userId] as const) : null
  const { data: appData, isLoading: appLoading } = useSWR(appKey, () => getConsoleApplication(currentEnv), { revalidateOnFocus: false })
  const app = appData?.application
  const typeKeys = useMemo(() => Array.from(new Set(CUSTOM_FIELD_SECTIONS.map((section) => section.boClass))), [])
  const { data: availableTypes = [], error: availableTypesError, isLoading: availableTypesLoading } = useSWR(
    app ? ['custom-data-available-types', currentEnv] : null,
    getAvailableCustomDataTypes,
    { revalidateOnFocus: false },
  )
  const customDataUnavailable = availableTypesError instanceof ApiError && availableTypesError.unavailable
  const definitionsKey = app && availableTypes.length > 0
    ? (['custom-field-definitions', currentEnv, app.id, typeKeys.join(',')] as const)
    : null
  const { data: definitionsByClass = {}, error, isLoading, mutate } = useSWR(
    definitionsKey,
    async () => {
      const entries = await Promise.all(typeKeys.map(async (typeKey) => [typeKey, await listCustomFieldDefinitions(app!.id, typeKey)] as const))
      return Object.fromEntries(entries) as Partial<Record<BoClassName, CustomFieldDefinition[]>>
    },
    { revalidateOnFocus: false },
  )
  const results = useMemo<SectionResult[]>(() => CUSTOM_FIELD_SECTIONS.map((section) => {
    const classDefs = definitionsByClass[section.boClass] ?? []
    const definitions = classDefs.filter(
      (definition) => resolveCustomFieldSection(definition, section.boClass)?.key === section.key,
    )
    return { section, definitions }
  }), [definitionsByClass])
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
      const availableType = resolveCustomDataType(availableTypes, section.boClass)
      if (!availableType) throw new Error(`${section.boClass} is not returned by the available custom data types API.`)
      if (fieldType === 'JSON' && jsonSchema) JSON.parse(jsonSchema)
      await createCustomFieldDefinition(app.id, {
        name: `${section.label}: ${displayName}`,
        boClassId: availableType.id,
        fields: [{ displayName: encodeCustomFieldDisplayName(section.key, displayName), fieldType, ...(jsonSchema ? { jsonSchema } : {}) }],
      })
      await mutate()
      setOpen(false)
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Unable to create the field.')
    } finally {
      setSaving(false)
    }
  }

  function requestDelete(
    definition: CustomFieldDefinition,
    field: CustomFieldDefinition['fields'][number],
  ) {
    const target = { definition, field }
    const validation = validateFieldDeletion(target)
    setDeleteTarget(target)
    setDeleteError(validation.safe ? null : validation.reason)
  }

  function closeDeleteDialog() {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!app) return
    const validation = validateFieldDeletion(deleteTarget)
    if (!validation.safe || !deleteTarget) {
      setDeleteError(validation.reason ?? 'This custom field cannot be deleted safely.')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    setSuccessMessage(null)
    try {
      await deleteCustomField(app.id, deleteTarget.field.id)
      const deletedName = customFieldDisplayName(deleteTarget.field)
      setDeleteTarget(null)
      setSuccessMessage(`Deleted custom field “${deletedName}”.`)
      await mutate()
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Unable to delete the custom field.')
    } finally {
      setDeleting(false)
    }
  }

  async function importJson(file: File) {
    if (!app) return
    setErrorMessage(null)
    if (availableTypesError) {
      setErrorMessage(availableTypesError instanceof Error ? availableTypesError.message : 'Custom-field capability could not be verified in this environment.')
      if (importRef.current) importRef.current.value = ''
      return
    }
    if (availableTypesLoading || availableTypes.length === 0) {
      setErrorMessage('Custom-field capability is still being checked. Please try again shortly.')
      if (importRef.current) importRef.current.value = ''
      return
    }
    try {
      const parsed = JSON.parse(await file.text()) as { schema?: string; version?: number; sections?: Array<{ key: string; fields: Array<{ displayName: string; fieldType: CustomFieldType; jsonSchema?: string }> }> }
      if (parsed.schema !== 'patient-vault/custom-fields' || parsed.version !== 1 || !Array.isArray(parsed.sections)) throw new Error('This is not a supported Patient Vault custom-field export.')
      setSaving(true)
      for (const importedSection of parsed.sections) {
        const section = CUSTOM_FIELD_SECTIONS.find((item) => item.key === importedSection.key)
        if (!section) continue
        const availableType = resolveCustomDataType(availableTypes, section.boClass)
        if (!availableType) throw new Error(`${section.boClass} is not returned by the available custom data types API.`)
        for (const field of importedSection.fields ?? []) {
          if (!FIELD_TYPES.includes(field.fieldType) || !field.displayName?.trim()) continue
          await createCustomFieldDefinition(app.id, {
            name: `${section.label}: ${field.displayName}`,
            boClassId: availableType.id,
            fields: [{ ...field, displayName: encodeCustomFieldDisplayName(section.key, field.displayName) }],
          })
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
          {appLoading ? <div className="h-24 rounded-lg bg-muted/40" /> : !app ? <Alert><FileJson aria-hidden="true" /><AlertTitle>Set up the application first</AlertTitle><AlertDescription>Custom field definitions are enabled after the Patient Vault application above has been created.</AlertDescription></Alert> : customDataUnavailable ? <Alert><Info aria-hidden="true" /><AlertTitle>Custom fields aren&apos;t available in {currentEnv} yet</AlertTitle><AlertDescription>{availableTypesError.message}</AlertDescription></Alert> : availableTypesError ? <Alert variant="destructive"><AlertTitle>Custom-field capability unavailable</AlertTitle><AlertDescription>{availableTypesError instanceof Error ? availableTypesError.message : 'Unable to check custom-field availability.'}</AlertDescription></Alert> : error ? (error instanceof ApiError && error.unavailable ? <Alert><Info aria-hidden="true" /><AlertTitle>Custom fields aren&apos;t available here yet</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert> : <Alert variant="destructive"><AlertTitle>Definitions unavailable</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>) : isLoading ? <div className="h-24 rounded-lg bg-muted/40" /> : count === 0 ? <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-6 text-center"><Braces className="text-muted-foreground" aria-hidden="true" /><p className="font-medium text-foreground">No custom fields yet</p><p className="max-w-md text-sm text-muted-foreground">Create a reusable field for demographics, aliases, contacts, addresses, documents, or external identities.</p></div> : <div className="flex flex-col gap-6">{results.filter(({ definitions }) => definitions.length > 0).map(({ section, definitions }) => <div key={section.key} className="flex flex-col gap-2"><h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{section.label}</h3><ul className="flex flex-col gap-2">{definitions.map((definition) => definition.fields.map((field) => <li key={`${definition.id}-${field.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"><div className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-sm font-medium text-foreground">{customFieldDisplayName(field)}</span><span className="font-mono text-xs text-muted-foreground">{field.fieldKey} · {field.fieldType}</span></div><Button type="button" variant="ghost" size="sm" disabled={deleting} onClick={() => requestDelete(definition, field)} aria-label={`Delete definition ${definition.name}`}><Trash2 data-icon="inline-start" aria-hidden="true" />Delete definition</Button></li>))}</ul></div>)}</div>}
          {successMessage && <Alert className="mt-4" role="status"><AlertTitle>Custom field deleted</AlertTitle><AlertDescription>{successMessage}</AlertDescription></Alert>}
          {errorMessage && <Alert variant="destructive" className="mt-4"><AlertTitle>Custom field action failed</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}
        </CardContent>
        <Dialog open={deleteTarget !== null} onOpenChange={(nextOpen) => { if (!nextOpen) closeDeleteDialog() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete custom field?</DialogTitle>
              <DialogDescription>
                {deleteTarget && validateFieldDeletion(deleteTarget).safe
                  ? `Delete “${customFieldDisplayName(deleteTarget.field)}”? This removes the field and its stored values across all records. Other fields in the definition will remain. This action cannot be undone.`
                  : 'This field cannot be deleted safely.'}
              </DialogDescription>
            </DialogHeader>
            {deleteError && <Alert variant="destructive" role="alert"><AlertTitle>Custom field was not deleted</AlertTitle><AlertDescription>{deleteError}</AlertDescription></Alert>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={deleting} onClick={closeDeleteDialog}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={deleting || !validateFieldDeletion(deleteTarget).safe} aria-busy={deleting} onClick={() => void confirmDelete()}>
                {deleting ? <><Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden="true" />Deleting…</> : <><Trash2 data-icon="inline-start" aria-hidden="true" />Delete field</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {app && <CardFooter className="flex-wrap justify-between gap-2 border-t"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving || availableTypesLoading || Boolean(availableTypesError)} onClick={() => importRef.current?.click()}><Upload data-icon="inline-start" aria-hidden="true" />Import JSON</Button><input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file) }} />{count > 0 && <><Button type="button" variant="outline" onClick={() => downloadFile(`${filenameBase}.json`, `${JSON.stringify(portableSchema(results), null, 2)}\n`, 'application/json')}><Download data-icon="inline-start" aria-hidden="true" />JSON</Button><Button type="button" variant="outline" onClick={() => downloadFile(`${filenameBase}.md`, toMarkdown(results, currentEnv), 'text/markdown')}><FileText data-icon="inline-start" aria-hidden="true" />Markdown</Button></>}</div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button type="button" disabled={availableTypesLoading || Boolean(availableTypesError)}><Plus data-icon="inline-start" aria-hidden="true" />Add field</Button>} /><DialogContent><form onSubmit={createField}><DialogHeader><DialogTitle>Add custom field</DialogTitle><DialogDescription>Create one reusable definition for a patient record section.</DialogDescription></DialogHeader><div className="flex flex-col gap-4 py-5"><Field label="Patient record section" htmlFor="field-section"><Select id="field-section" name="section" defaultValue="demographics">{CUSTOM_FIELD_SECTIONS.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}</Select></Field><Field label="Field name" htmlFor="field-name"><TextInput id="field-name" name="displayName" required maxLength={80} placeholder="Preferred pharmacy" /></Field><Field label="Field type" htmlFor="field-type"><Select id="field-type" name="fieldType" defaultValue="TEXT">{FIELD_TYPES.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}</Select></Field><Field label="JSON schema (JSON fields only)" htmlFor="json-schema"><Textarea id="json-schema" name="jsonSchema" rows={3} placeholder={'{"type":"object"}'} /></Field>{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create field'}</Button></DialogFooter></form></DialogContent></Dialog></CardFooter>}
      </Card>
    </section>
  )
}
