export type PatientFindCriteria = {
  firstName: string
  lastName: string
  dob: string
  sexAtBirth: string
  exact: boolean
}

export type PatientFindParam = 'firstName' | 'lastName' | 'dob' | 'sexAtBirth' | 'exact'

export const EMPTY_PATIENT_FIND: PatientFindCriteria = {
  firstName: '',
  lastName: '',
  dob: '',
  sexAtBirth: '',
  exact: false,
}

export function buildPatientFindParams(criteria: PatientFindCriteria): URLSearchParams {
  const params = new URLSearchParams()
  if (criteria.firstName.trim()) params.set('firstName', criteria.firstName.trim())
  if (criteria.lastName.trim()) params.set('lastName', criteria.lastName.trim())
  if (criteria.dob) params.set('dob', criteria.dob)
  if (criteria.sexAtBirth) params.set('sexAtBirth', criteria.sexAtBirth)
  params.set('exact', String(criteria.exact))
  return params
}

export function buildPatientFindPath(criteria: PatientFindCriteria): string {
  return `/v3/patient/find?${buildPatientFindParams(criteria).toString()}`
}

export function hasPatientFindCriteria(criteria: PatientFindCriteria): boolean {
  return Boolean(
    criteria.firstName.trim() ||
      criteria.lastName.trim() ||
      criteria.dob ||
      criteria.sexAtBirth,
  )
}

export function patientFindPreview(criteria: PatientFindCriteria): string {
  // API Inspector records the browser request pathname, which includes /api.
  return `GET /api${buildPatientFindPath(criteria)}`
}
