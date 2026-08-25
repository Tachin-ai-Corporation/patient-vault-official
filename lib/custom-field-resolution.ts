import {
  customFieldDisplayName,
  resolveCustomFieldSectionForField,
  type BoClassName,
  type CustomFieldSectionKey,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-sections.ts'

export type CustomFieldLike = {
  id: number
  displayName: string
  fieldKey: string
  fieldType: 'TEXT' | 'INTEGER' | 'DECIMAL' | 'DATE' | 'TIMESTAMP' | 'JSON'
  jsonSchema?: string
}

export type CustomFieldDefinitionLike = {
  id: number
  appId: number
  boClassId: number
  name: string
  fields: CustomFieldLike[]
}

type DefinitionEnvelope = {
  data?: unknown
  definitions?: unknown
  content?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDefinition(value: unknown): value is CustomFieldDefinitionLike {
  return isRecord(value) && Array.isArray(value.fields)
}

export function normalizeCustomFieldDefinitions(response: unknown): CustomFieldDefinitionLike[] {
  if (Array.isArray(response)) return response.filter(isDefinition)
  if (!isRecord(response)) return []

  const envelope = response as DefinitionEnvelope
  for (const candidate of [envelope.data, envelope.definitions, envelope.content]) {
    if (Array.isArray(candidate)) return candidate.filter(isDefinition)
    if (isDefinition(candidate)) return [candidate]
  }

  return isDefinition(response) ? [response] : []
}

export function findUsableCustomField(
  definitions: CustomFieldDefinitionLike[],
  sectionKey: CustomFieldSectionKey,
  boClass: BoClassName,
  displayName: string,
) {
  for (const definition of definitions) {
    const field = definition.fields.find(
      (candidate) =>
        resolveCustomFieldSectionForField(definition, candidate, boClass)?.key === sectionKey &&
        customFieldDisplayName(candidate).localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0 &&
        typeof candidate.fieldKey === 'string' &&
        candidate.fieldKey.trim().length > 0,
    )
    if (field) return { definition, field }
  }
}

export async function resolveCustomFieldAfterWrite(
  loadDefinitions: () => Promise<CustomFieldDefinitionLike[]>,
  options: {
    sectionKey: CustomFieldSectionKey
    boClass: BoClassName
    displayName: string
    delays?: number[]
    wait?: (milliseconds: number) => Promise<void>
  },
): Promise<{
  definitions: CustomFieldDefinitionLike[]
  definition?: CustomFieldDefinitionLike
  field?: CustomFieldLike
}> {
  const delays = options.delays ?? [0, 150, 350, 700, 1200]
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  let definitions: CustomFieldDefinitionLike[] = []

  for (const delay of delays) {
    if (delay > 0) await wait(delay)
    definitions = await loadDefinitions()
    const location = findUsableCustomField(
      definitions,
      options.sectionKey,
      options.boClass,
      options.displayName,
    )
    if (location) return { ...location, definitions }
  }

  return { definitions }
}
