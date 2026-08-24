'use client'

import { apiRequest } from '@/lib/api/client'

export type BoClassName = 'Person' | 'File'

export interface AvailableCustomDataType {
  id: number
  key: string
  name: string
}

export function getAvailableCustomDataTypes() {
  return apiRequest<AvailableCustomDataType[]>('/v3/custom-data/available-types')
}

const TEST_BO_CLASS_IDS: Record<BoClassName, number> = {
  Person: 22,
  File: 20,
}

export function boClassId(key: BoClassName) {
  return TEST_BO_CLASS_IDS[key]
}

// Each patient-record section maps to the BO class that actually owns its
// custom values. `scope: 'patient'` means values live on the patient's Person
// instance; `scope: 'record'` means each value belongs to a specific
// sub-record instance (e.g. one document's File instance).
export const CUSTOM_FIELD_SECTIONS = [
  { key: 'demographics', label: 'Demographics', boClass: 'Person', scope: 'patient' },
  { key: 'contacts', label: 'Contacts', boClass: 'Person', scope: 'patient' },
  { key: 'addresses', label: 'Addresses', boClass: 'Person', scope: 'patient' },
  { key: 'aliases', label: 'Aliases', boClass: 'Person', scope: 'patient' },
  { key: 'external-identities', label: 'External identities', boClass: 'Person', scope: 'patient' },
  { key: 'documents', label: 'Documents', boClass: 'File', scope: 'record' },
] as const satisfies ReadonlyArray<{ key: string; label: string; boClass: BoClassName; scope: 'patient' | 'record' }>

export type CustomFieldSection = (typeof CUSTOM_FIELD_SECTIONS)[number]

export type CustomFieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'DATE' | 'TIMESTAMP' | 'JSON'

export type CustomFieldDefinition = {
  id: number
  appId: number
  boClassId: number
  name: string
  fields: Array<{
    id: number
    displayName: string
    fieldKey: string
    fieldType: CustomFieldType
    jsonSchema?: string
  }>
}

type DefinitionListResponse = {
  data?: CustomFieldDefinition[]
  definitions?: CustomFieldDefinition[]
  content?: CustomFieldDefinition[]
}

function query(appId: number) {
  return `?appId=${encodeURIComponent(appId)}`
}

export function customFieldDefinitionsKey(environment: string, appId: number, typeKey: BoClassName) {
  return ['custom-field-definitions', environment, appId, typeKey] as const
}

export function customFieldValuesKey(environment: string, appId: number, classId: number, instanceId: number) {
  return ['custom-field-values', environment, appId, classId, instanceId] as const
}

export async function listCustomFieldDefinitions(appId: number, typeKey: BoClassName) {
  const response = await apiRequest<DefinitionListResponse | CustomFieldDefinition[]>(
    `/v3/custom-data/definition/type/${encodeURIComponent(typeKey)}${query(appId)}`,
  )
  if (Array.isArray(response)) return response
  return response.data ?? response.definitions ?? response.content ?? []
}

export function createCustomFieldDefinition(
  appId: number,
  input: { name: string; boClassId: number; fields: Array<{ displayName: string; fieldType: CustomFieldType; jsonSchema?: string }> },
) {
  return apiRequest<CustomFieldDefinition | undefined>(`/v3/custom-data/definition${query(appId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteCustomFieldDefinition(appId: number, definitionId: number) {
  return apiRequest<void>(`/v3/custom-data/definition/${definitionId}${query(appId)}`, { method: 'DELETE' })
}

// Read all custom-field values for a BO instance (patient Person, document
// File, etc.). Only fields that have a value are returned.
export function getInstanceCustomData(appId: number, instanceId: number) {
  return apiRequest<Record<string, unknown>>(`/v3/custom-data/instance/${instanceId}${query(appId)}`)
}

// Upsert (or clear, via null) custom-field values on a BO instance. Field keys
// must belong to the instance's BO class or the API rejects the write.
export function updateInstanceCustomData(
  appId: number,
  instanceId: number,
  customData: Record<string, unknown>,
) {
  return apiRequest<Record<string, unknown>>(`/v3/custom-data/instance/${instanceId}${query(appId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customData),
  })
}
