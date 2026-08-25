export type BoClassName = 'Person' | 'File'

export const CUSTOM_FIELD_SECTIONS = [
  { key: 'demographics', label: 'Demographics', boClass: 'Person', scope: 'patient' },
  { key: 'contacts', label: 'Contacts', boClass: 'Person', scope: 'patient' },
  { key: 'addresses', label: 'Addresses', boClass: 'Person', scope: 'patient' },
  { key: 'aliases', label: 'Aliases', boClass: 'Person', scope: 'patient' },
  { key: 'external-identities', label: 'External identities', boClass: 'Person', scope: 'patient' },
  { key: 'documents', label: 'Documents', boClass: 'File', scope: 'record' },
] as const satisfies ReadonlyArray<{ key: string; label: string; boClass: BoClassName; scope: 'patient' | 'record' }>

export type CustomFieldSection = (typeof CUSTOM_FIELD_SECTIONS)[number]
export type CustomFieldSectionKey = CustomFieldSection['key']

type FieldLike = { displayName: string }
type DefinitionLike = { name: string; fields: FieldLike[] }

const SECTION_FIELD_PREFIX = '__pv_section:'
const SECTION_FIELD_SEPARATOR = '__ '

export function encodeCustomFieldDisplayName(sectionKey: CustomFieldSectionKey, displayName: string) {
  return `${SECTION_FIELD_PREFIX}${sectionKey}${SECTION_FIELD_SEPARATOR}${displayName.trim()}`
}

export function decodeCustomFieldDisplayName(displayName: string) {
  if (!displayName.startsWith(SECTION_FIELD_PREFIX)) return { displayName }
  const separatorIndex = displayName.indexOf(SECTION_FIELD_SEPARATOR, SECTION_FIELD_PREFIX.length)
  if (separatorIndex === -1) return { displayName }
  const sectionKey = displayName.slice(SECTION_FIELD_PREFIX.length, separatorIndex)
  const section = CUSTOM_FIELD_SECTIONS.find((candidate) => candidate.key === sectionKey)
  if (!section) return { displayName }
  return {
    displayName: displayName.slice(separatorIndex + SECTION_FIELD_SEPARATOR.length),
    sectionKey: section.key,
  }
}

export function customFieldDisplayName(field: FieldLike) {
  return decodeCustomFieldDisplayName(field.displayName).displayName
}

export function resolveCustomFieldSectionForField(
  definition: DefinitionLike,
  field: FieldLike,
  boClass: BoClassName,
) {
  const { sectionKey } = decodeCustomFieldDisplayName(field.displayName)
  if (sectionKey) return CUSTOM_FIELD_SECTIONS.find((section) => section.key === sectionKey)

  const namedSection = CUSTOM_FIELD_SECTIONS.find((section) => definition.name.startsWith(`${section.label}:`))
  if (namedSection) return namedSection

  return CUSTOM_FIELD_SECTIONS.find((section) => section.key === (boClass === 'File' ? 'documents' : 'demographics'))
}

export function resolveCustomFieldSection(definition: DefinitionLike, boClass: BoClassName) {
  const firstTaggedField = definition.fields.find(
    (field) => decodeCustomFieldDisplayName(field.displayName).sectionKey,
  )
  return resolveCustomFieldSectionForField(
    definition,
    firstTaggedField ?? definition.fields[0] ?? { displayName: '' },
    boClass,
  )
}
