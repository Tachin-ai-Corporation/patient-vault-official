'use client'

import { apiRequest } from '@/lib/api/client'

export const CUSTOM_FIELD_SECTIONS = [
  { key: 'demographics', label: 'Demographics', boClassId: 22 },
  { key: 'aliases', label: 'Aliases', boClassId: 22 },
  { key: 'contacts', label: 'Contacts', boClassId: 22 },
  { key: 'addresses', label: 'Addresses', boClassId: 22 },
  { key: 'documents', label: 'Documents', boClassId: 22 },
  { key: 'external-identities', label: 'External identities', boClassId: 22 },
] as const

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

export function customFieldDefinitionsKey(environment: string, appId: number, boClassId = 22) {
  return ['custom-field-definitions', environment, appId, boClassId] as const
}

export function customFieldValuesKey(environment: string, appId: number, patientId: number) {
  return ['patient-custom-field-values', environment, appId, patientId] as const
}

export async function listCustomFieldDefinitions(appId: number, boClassId: number) {
  const response = await apiRequest<DefinitionListResponse | CustomFieldDefinition[]>(
    `/v3/custom-data/definition/type/${boClassId}${query(appId)}`,
  )
  if (Array.isArray(response)) return response
  return response.data ?? response.definitions ?? response.content ?? []
}

export function createCustomFieldDefinition(
  appId: number,
  input: { name: string; boClassId: number; fields: Array<{ displayName: string; fieldType: CustomFieldType; jsonSchema?: string }> },
) {
  return apiRequest<CustomFieldDefinition>(`/v3/custom-data/definition${query(appId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteCustomFieldDefinition(appId: number, definitionId: number) {
  return apiRequest<void>(`/v3/custom-data/definition/${definitionId}${query(appId)}`, { method: 'DELETE' })
}

export function getPatientCustomData(appId: number, patientId: number) {
  return apiRequest<Record<string, unknown>>(`/v3/custom-data/instance/${patientId}${query(appId)}`)
}

export function updatePatientCustomData(
  appId: number,
  patientId: number,
  customData: Record<string, unknown>,
) {
  return apiRequest<Record<string, unknown>>(`/v3/custom-data/instance/${patientId}${query(appId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customData),
  })
}
