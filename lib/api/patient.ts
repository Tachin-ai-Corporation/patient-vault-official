/**
 * Client-side Patient Vault API (1health v3).
 *
 * Typed wrappers over `authFetch` plus mappers between the 1health DTOs and the
 * app's `Patient` view model (see lib/patient-data.ts). All patient data in the
 * app flows through here — there is no mock/local persistence.
 *
 * See docs/PATIENT-API.md for the endpoint + field reference.
 */

"use client"

import { authFetch, getOneHealthBaseUrl } from "@/lib/auth-client"
import {
  type Patient,
  type Coded,
  type SexAtBirth,
  prettifyCode,
} from "@/lib/patient-data"

// ============================================================================
// API DTO types
// ============================================================================

export interface PatientDTO {
  id: number
  firstName: string
  lastName: string
  middleName?: string | null
  dob: string
  gender?: string | null
  race?: string | null
  ethnicity?: string | null
  sexAtBirth?: string | null
  genderIdentity?: string | null
  preferredLanguage?: string | null
  last4Ssn?: string | null
  deceased?: boolean
}

export type ContactType = "email" | "mobile" | "home" | "work" | "fax" | "other"

export interface ContactDTO {
  id: number
  type: ContactType
  value: string
  label?: string | null
  region?: string | null
  isPrimary?: boolean
  notificationsEnabled?: boolean
}

export type AddressUseApi = "home" | "work" | "temp"

export interface AddressDTO {
  id: number
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country?: string | null
  use?: AddressUseApi | null
  primary?: boolean
  validationStatus?: string | null
  effectiveFrom?: string | null
}

export interface PatientCreateInput {
  firstName: string
  lastName: string
  middleName?: string
  dob: string
  gender?: string
  race?: string
  ethnicity?: string
  sexAtBirth?: string
  genderIdentity?: string
  preferredLanguage?: string
  last4Ssn?: string
}

export interface ContactInput {
  type: ContactType
  value: string
  label?: string
  region?: string
  isPrimary?: boolean
}

export interface AddressInput {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country?: string
  use?: AddressUseApi
  primary?: boolean
}

/** A single row from POST /v3/health/grid/patient. */
export interface PatientGridRow {
  id: number
  firstName: string
  lastName: string
  middleName?: string | null
  dateOfBirth?: string | null
  race?: string[] | null
  ethnicity?: string[] | null
  biologicalGender?: string[] | null
  genderIdentity?: string | null
  socialSecurityNumber?: string | null
  email?: string | null
  phone?: string | null
  locationAddressCity?: string | null
  locationAddressStreet?: string | null
  locationPostalCode?: string | null
  locationCounty?: string | null
  locationCountry?: string[] | null
  created?: string | null
  updated?: string | null
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface FindCandidate {
  id: number
  firstName: string
  lastName: string
  dob: string
  gender?: string
  race?: string
  ethnicity?: string
  sexAtBirth?: string
  score: number
  matchedOn: string[]
}

// ============================================================================
// Mappers: view model <-> DTO
// ============================================================================

function toCoded(value?: string | null): Coded {
  const v = (value || "unknown").toString()
  return { code: v, label: prettifyCode(v) }
}

function normalizeSex(value?: string | null): SexAtBirth {
  const v = (value || "unknown").toLowerCase()
  if (v === "male" || v === "female" || v === "intersex") return v as SexAtBirth
  return "unknown"
}

/** Map a full patient DTO to the app view model. Nested contacts/addresses are
 *  attached separately (they come from sub-resource endpoints). */
export function dtoToPatient(
  dto: PatientDTO,
  extra?: { contacts?: ContactDTO[]; addresses?: AddressDTO[] },
): Patient {
  return {
    id: String(dto.id),
    given_name: dto.firstName,
    family_name: dto.lastName,
    middle_name: dto.middleName ?? "",
    date_of_birth: dto.dob,
    sex_at_birth: normalizeSex(dto.sexAtBirth),
    gender_identity: dto.genderIdentity ?? "",
    race: toCoded(dto.race),
    ethnicity: toCoded(dto.ethnicity),
    preferred_language: dto.preferredLanguage ?? "",
    last4_ssn: dto.last4Ssn ?? "",
    deceased: Boolean(dto.deceased),
    contacts: (extra?.contacts ?? []).map(contactDtoToView),
    addresses: (extra?.addresses ?? []).map(addressDtoToView),
  }
}

export interface ContactView {
  id: string
  type: ContactType
  value: string
  label: string
  isPrimary: boolean
}
export interface AddressView {
  id: string
  use: AddressUseApi
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  primary: boolean
  validationStatus?: string
}

export function contactDtoToView(c: ContactDTO): ContactView {
  return {
    id: String(c.id),
    type: c.type,
    value: c.value,
    label: c.label ?? "",
    isPrimary: Boolean(c.isPrimary),
  }
}

/** Map a grid row (which includes contact + location columns) to the app view
 *  model, so the patients list can render email/phone/city without N extra
 *  sub-resource fetches. */
export function gridRowToPatient(row: PatientGridRow): Patient {
  const contacts: Patient["contacts"] = []
  if (row.email) {
    contacts.push({ id: `email-${row.id}`, type: "email", value: row.email, label: "", isPrimary: false })
  }
  if (row.phone) {
    contacts.push({ id: `phone-${row.id}`, type: "mobile", value: row.phone, label: "", isPrimary: true })
  }
  const addresses: Patient["addresses"] = []
  if (row.locationAddressStreet || row.locationAddressCity) {
    addresses.push({
      id: `loc-${row.id}`,
      use: "home",
      line1: row.locationAddressStreet ?? "",
      line2: "",
      city: row.locationAddressCity ?? "",
      state: "",
      postal_code: row.locationPostalCode ?? "",
      country: (row.locationCountry && row.locationCountry[0]) ?? "United States",
      primary: true,
    })
  }
  const firstOf = (arr?: string[] | null) => (arr && arr.length ? arr[0] : undefined)
  return {
    id: String(row.id),
    given_name: row.firstName,
    family_name: row.lastName,
    middle_name: row.middleName ?? "",
    date_of_birth: row.dateOfBirth ?? "",
    sex_at_birth: normalizeSex(firstOf(row.biologicalGender)),
    gender_identity: row.genderIdentity ?? "",
    race: toCoded(firstOf(row.race)),
    ethnicity: toCoded(firstOf(row.ethnicity)),
    preferred_language: "",
    last4_ssn: row.socialSecurityNumber ?? "",
    deceased: false,
    contacts,
    addresses,
    created_at: row.created ?? undefined,
  }
}

export function addressDtoToView(a: AddressDTO): AddressView {
  return {
    id: String(a.id),
    use: (a.use as AddressUseApi) ?? "work",
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    postal_code: a.postalCode,
    country: a.country ?? "United States",
    primary: Boolean(a.primary),
    validationStatus: a.validationStatus ?? undefined,
  }
}

// ============================================================================
// Low-level request helper
// ============================================================================

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getOneHealthBaseUrl()
  const res = await authFetch(`${baseUrl}/api${path}`, init)
  if (!res.ok) {
    let detail = ""
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(`1health API ${res.status}: ${detail || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ============================================================================
// Patient list / grid / find
// ============================================================================

export interface GridQuery {
  page?: number
  size?: number
  search?: string
  sortKey?: string
  sortOrder?: "ASC" | "DESC"
}

export async function fetchPatientGrid(q: GridQuery = {}): Promise<Page<PatientGridRow>> {
  const page = q.page ?? 0
  const size = q.size ?? 25
  const filterBy: unknown[] = []
  if (q.search && q.search.trim()) {
    // Broad contains match across common demographic columns.
    const value = q.search.trim()
    filterBy.push({ key: "lastName", operator: "contains", value })
  }
  const orderBy = q.sortKey
    ? [{ key: q.sortKey, order: q.sortOrder ?? "ASC" }]
    : [{ key: "created", order: "DESC" }]
  return request<Page<PatientGridRow>>(
    `/v3/health/grid/patient?page=${page}&size=${size}`,
    { method: "POST", body: JSON.stringify({ filterBy, orderBy }) },
  )
}

export async function findPatients(criteria: {
  firstName?: string
  lastName?: string
  dob?: string
  sexAtBirth?: string
  exact?: boolean
}): Promise<FindCandidate[]> {
  const params = new URLSearchParams()
  if (criteria.firstName) params.set("firstName", criteria.firstName)
  if (criteria.lastName) params.set("lastName", criteria.lastName)
  if (criteria.dob) params.set("dob", criteria.dob)
  if (criteria.sexAtBirth) params.set("sexAtBirth", criteria.sexAtBirth)
  if (criteria.exact) params.set("exact", "true")
  const data = await request<{ candidates: FindCandidate[] }>(
    `/v3/patient/find?${params.toString()}`,
    { method: "GET" },
  )
  return data?.candidates ?? []
}

// ============================================================================
// Single patient (with contacts + addresses)
// ============================================================================

export async function fetchPatient(id: string): Promise<Patient> {
  const [dto, contacts, addresses] = await Promise.all([
    request<PatientDTO>(`/v3/patient/${id}`, { method: "GET" }),
    listContacts(id).catch(() => []),
    listAddresses(id).catch(() => []),
  ])
  return dtoToPatient(dto, { contacts, addresses })
}

export async function createPatient(input: PatientCreateInput): Promise<PatientDTO> {
  return request<PatientDTO>(`/v3/patient`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function patchPatient(
  id: string,
  patch: Partial<PatientCreateInput>,
): Promise<PatientDTO> {
  return request<PatientDTO>(`/v3/patient/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function deletePatient(id: string): Promise<void> {
  await request<unknown>(`/v3/patient/${id}`, { method: "DELETE" })
}

// ============================================================================
// Contacts
// ============================================================================

function unwrapList<T>(data: unknown, ...keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === "object") {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k]
      if (Array.isArray(v)) return v as T[]
    }
  }
  return []
}

export async function listContacts(patientId: string): Promise<ContactDTO[]> {
  const data = await request<unknown>(`/v3/patient/${patientId}/contact`, { method: "GET" })
  return unwrapList<ContactDTO>(data, "contacts", "content", "items", "data")
}

export async function addContact(patientId: string, input: ContactInput): Promise<ContactDTO> {
  return request<ContactDTO>(`/v3/patient/${patientId}/contact`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateContact(
  patientId: string,
  contactId: string,
  input: Partial<ContactInput>,
): Promise<ContactDTO> {
  return request<ContactDTO>(`/v3/patient/${patientId}/contact/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deleteContact(patientId: string, contactId: string): Promise<void> {
  await request<unknown>(`/v3/patient/${patientId}/contact/${contactId}`, { method: "DELETE" })
}

// ============================================================================
// Addresses
// ============================================================================

export async function listAddresses(patientId: string): Promise<AddressDTO[]> {
  const data = await request<unknown>(`/v3/patient/${patientId}/address`, { method: "GET" })
  return unwrapList<AddressDTO>(data, "addresses", "content", "items", "data")
}

export async function addAddress(patientId: string, input: AddressInput): Promise<AddressDTO> {
  return request<AddressDTO>(`/v3/patient/${patientId}/address`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateAddress(
  patientId: string,
  addressId: string,
  input: Partial<AddressInput>,
): Promise<AddressDTO> {
  return request<AddressDTO>(`/v3/patient/${patientId}/address/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deleteAddress(patientId: string, addressId: string): Promise<void> {
  await request<unknown>(`/v3/patient/${patientId}/address/${addressId}`, { method: "DELETE" })
}

// ============================================================================
// Deceased
// ============================================================================

export async function setDeceased(
  patientId: string,
  body?: { deceasedDate?: string },
): Promise<void> {
  await request<unknown>(`/v3/patient/${patientId}/deceased`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  })
}

export async function clearDeceased(patientId: string): Promise<void> {
  await request<unknown>(`/v3/patient/${patientId}/deceased`, { method: "DELETE" })
}

// ============================================================================
// Seed orchestration
// ============================================================================

import type { SeedPatient } from "@/lib/seed-data"

export interface SeedProgress {
  index: number // 0-based index of the patient currently being created
  total: number
  label: string // human-readable current step
  createdId?: number
}

/**
 * Create a batch of hard-coded patients (with contacts, addresses, and an
 * optional deceased marker) against the real tenant vault. Reports progress
 * after each meaningful step so the UI can render a live progress modal.
 */
export async function seedPatients(
  batch: SeedPatient[],
  onProgress?: (p: SeedProgress) => void,
): Promise<number> {
  let created = 0
  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i]
    const name = `${entry.patient.firstName} ${entry.patient.lastName}`
    onProgress?.({ index: i, total: batch.length, label: `Creating ${name}` })

    const patient = await createPatient(entry.patient)
    const pid = String(patient.id)
    created++

    for (const contact of entry.contacts) {
      onProgress?.({ index: i, total: batch.length, label: `Adding contact for ${name}`, createdId: patient.id })
      await addContact(pid, contact).catch(() => undefined)
    }
    for (const address of entry.addresses) {
      onProgress?.({ index: i, total: batch.length, label: `Adding address for ${name}`, createdId: patient.id })
      await addAddress(pid, address).catch(() => undefined)
    }
    if (entry.deceased) {
      onProgress?.({ index: i, total: batch.length, label: `Marking ${name} deceased`, createdId: patient.id })
      await setDeceased(pid, entry.deceased).catch(() => undefined)
    }
  }
  onProgress?.({ index: batch.length, total: batch.length, label: "Done" })
  return created
}
