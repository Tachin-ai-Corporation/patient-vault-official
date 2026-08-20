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
    fieldPosition?: string
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

export type InstanceCustomData = {
  id: number
  name?: string
  typeKey?: string
  customData: Record<string, unknown>
}

export async function getInstanceCustomData(instanceId: number) {
  const rows = await apiRequest<InstanceCustomData[]>('/v2/data/custom-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([instanceId]),
  })
  return rows.find((row) => row.id === instanceId) ?? { id: instanceId, customData: {} }
}

export function upsertInstanceCustomData(
  instanceId: number,
  customData: Record<string, unknown>,
  operation: 'APPEND' | 'REPLACE' | 'CLEAR' = 'APPEND',
) {
  return apiRequest<void>('/v2/data/custom-data/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ instanceId, customData, operation }]),
  })
}
