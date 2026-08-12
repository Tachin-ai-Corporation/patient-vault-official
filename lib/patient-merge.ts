import type { Patient } from '@/lib/patient-data'

export type MergeField =
  | 'given_name'
  | 'family_name'
  | 'middle_name'
  | 'date_of_birth'
  | 'sex_at_birth'
  | 'gender_identity'
  | 'race'
  | 'ethnicity'
  | 'preferred_language'
  | 'last4_ssn'

export const MERGE_FIELDS: ReadonlyArray<{ key: MergeField; label: string }> = [
  { key: 'given_name', label: 'First name' },
  { key: 'family_name', label: 'Last name' },
  { key: 'middle_name', label: 'Middle name' },
  { key: 'date_of_birth', label: 'Date of birth' },
  { key: 'sex_at_birth', label: 'Sex at birth' },
  { key: 'gender_identity', label: 'Gender identity' },
  { key: 'race', label: 'Race' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'preferred_language', label: 'Preferred language' },
  { key: 'last4_ssn', label: 'Last 4 SSN' },
]

export type RelationKind = 'addresses' | 'contacts'

export type RelationSelection = {
  patientId: string
  itemId: string
  keep: boolean
}

export type MergePlan = {
  canonicalId: string
  mergedIds: string[]
  fieldSources: Record<MergeField, string>
  relationSelections: Record<RelationKind, RelationSelection[]>
  redirects: Array<{ from: string; to: string; status: 308 }>
}

export function patientMergeValue(patient: Patient, field: MergeField): string {
  if (field === 'race') return patient.race.label || patient.race.code || '—'
  if (field === 'ethnicity') return patient.ethnicity.label || patient.ethnicity.code || '—'
  return String(patient[field] || '—')
}

export function isMergeFieldIdentical(
  patients: Patient[],
  field: MergeField,
): boolean {
  if (patients.length < 2) return true
  const values = patients.map((patient) => patientMergeValue(patient, field))
  return values.every((value) => value === values[0])
}

export function buildMergePlan(
  patientIds: string[],
  canonicalId: string,
  fieldSources: Partial<Record<MergeField, string>> = {},
  relationSelections: Partial<Record<RelationKind, RelationSelection[]>> = {},
): MergePlan {
  if (patientIds.length < 2 || patientIds.length > 3) {
    throw new Error('Select two or three patients to compare.')
  }
  if (!patientIds.includes(canonicalId)) {
    throw new Error('The canonical record must be one of the selected patients.')
  }
  const resolved = Object.fromEntries(
    MERGE_FIELDS.map(({ key }) => [key, fieldSources[key] ?? canonicalId]),
  ) as Record<MergeField, string>
  const mergedIds = patientIds.filter((id) => id !== canonicalId)
  return {
    canonicalId,
    mergedIds,
    fieldSources: resolved,
    relationSelections: {
      addresses: relationSelections.addresses ?? [],
      contacts: relationSelections.contacts ?? [],
    },
    redirects: mergedIds.map((from) => ({ from, to: canonicalId, status: 308 as const })),
  }
}
