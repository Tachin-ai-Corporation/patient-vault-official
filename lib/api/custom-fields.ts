'use client'

import { apiRequest } from '@/lib/api/client'
import type { BoClassName } from '@/lib/custom-field-sections'
import { normalizeCustomFieldDefinitions } from '@/lib/custom-field-resolution'

export {
  CUSTOM_FIELD_SECTIONS,
  customFieldDisplayName,
  decodeCustomFieldDisplayName,
  encodeCustomFieldDisplayName,
  resolveCustomFieldSection,
  resolveCustomFieldSectionForField,
  type BoClassName,
  type CustomFieldSection,
  type CustomFieldSectionKey,
} from '@/lib/custom-field-sections'

export interface AvailableCustomDataType {
  id: number
  key: string
  name: string
}

export function getAvailableCustomDataTypes() {
  return apiRequest<AvailableCustomDataType[]>('/v3/custom-data/available-types')
}

export function resolveCustomDataType(types: AvailableCustomDataType[], typeKey: BoClassName) {
  return types.find((type) => type.key.localeCompare(typeKey, undefined, { sensitivity: 'accent' }) === 0)
}

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

function query(appId: number) {
  return `?appId=${encodeURIComponent(appId)}`
}

export function customFieldDefinitionsKey(environment: string, appId: number, typeKey: BoClassName) {
  return ['custom-field-definitions', environment, appId, typeKey] as const
}

export function customFieldValuesKey(environment: string, appId: number, typeKey: BoClassName, instanceId: number) {
  return ['custom-field-values', environment, appId, typeKey, instanceId] as const
}

export async function listCustomFieldDefinitions(appId: number, typeKey: BoClassName) {
  const response = await apiRequest<unknown>(
    `/v3/custom-data/definition/type/${encodeURIComponent(typeKey)}${query(appId)}`,
  )
  return normalizeCustomFieldDefinitions(response) as CustomFieldDefinition[]
}

export async function createCustomFieldDefinition(
  appId: number,
  input: { name: string; boClassId: number; fields: Array<{ displayName: string; fieldType: CustomFieldType; jsonSchema?: string }> },
) {
  const response = await apiRequest<unknown>(`/v3/custom-data/definition${query(appId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return normalizeCustomFieldDefinitions(response)[0] as CustomFieldDefinition | undefined
}

export function deleteCustomFieldDefinition(appId: number, definitionId: number) {
  return apiRequest<void>(`/v3/custom-data/definition/${definitionId}${query(appId)}`, { method: 'DELETE' })
}

export function deleteCustomField(appId: number, fieldId: number) {
  return apiRequest<void>(`/v3/custom-data/field/${fieldId}${query(appId)}`, { method: 'DELETE' })
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
