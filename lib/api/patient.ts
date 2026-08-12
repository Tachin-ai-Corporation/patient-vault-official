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

import { apiRequest, apiFetch } from "@/lib/api/client"
import { buildPatientFindPath, type PatientFindCriteria } from "@/lib/patient-find"
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

/** A single row from POST /v3/health/grid/patient (PersonGridResponseDTO).
 *  Note: race, ethnicity, and biologicalGender come back as scalar strings
 *  (e.g. "White", "Female"), NOT arrays. */
export interface PatientGridRow {
  id: number
  firstName: string
  lastName: string
  middleName?: string | null
  dateOfBirth?: string | null
  race?: string | null
  ethnicity?: string | null
  biologicalGender?: string | null
  genderIdentity?: string | null
  socialSecurityNumber?: string | null
  email?: string | null
  phone?: string | null
  locationAddressCity?: string | null
  locationAddressStreet?: string | null
  locationPostalCode?: string | null
  locationCounty?: string | null
  locationCountry?: string | null
  created?: string | null
  updated?: string | null
}

/** The 1health grid pagination envelope (PagePersonGridResponseDTO).
 *  Rows live under `data` (not `content`). */
export interface Page<T> {
  data: T[]
  totalElements: number
  totalPages: number
  pageNumber: number
  pageSize: number
  numberOfElements: number
  firstPage: boolean
  lastPage: boolean
  emptyPage: boolean
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

// ---- enum normalization: app codes <-> API validated value sets ------------
//
// The v3 patient API validates gender/sexAtBirth/race/ethnicity against exact,
// space-and-capitalized display strings (e.g. "Male", "Black or African
// American", "Not Hispanic or Latino"). The app's internal view model uses
// lowercase snake_case codes. These maps translate app codes -> API values on
// write, and API values -> app codes on read.

/** Outgoing: administrative gender. API enum: Male, Female, Other, Unknown, Asked but not answered. */
const GENDER_TO_API: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  unknown: "Unknown",
  "asked but not answered": "Asked but not answered",
}

/** Outgoing: sex at birth. API enum: Male, Female, Intersex, Unknown. */
const SEX_TO_API: Record<string, string> = {
  male: "Male",
  female: "Female",
  intersex: "Intersex",
  unknown: "Unknown",
}

/** Outgoing: race. API OMB categories. */
const RACE_TO_API: Record<string, string> = {
  white: "White",
  black_or_african_american: "Black or African American",
  "black or african american": "Black or African American",
  asian: "Asian",
  american_indian_or_alaska_native: "American Indian or Alaska Native",
  "american indian or alaska native": "American Indian or Alaska Native",
  native_hawaiian_or_other_pacific_islander: "Native Hawaiian or other Pacific Islander",
  "native hawaiian or other pacific islander": "Native Hawaiian or other Pacific Islander",
  middle_eastern_or_north_african: "Middle Eastern or North African",
  hispanic_or_latino: "Hispanic or Latino",
  other: "Other Race",
  other_race: "Other Race",
  "other race": "Other Race",
  unknown: "Unknown",
}

/** Outgoing: ethnicity. API enum: Hispanic or Latino, Not Hispanic or Latino, Unknown. */
const ETHNICITY_TO_API: Record<string, string> = {
  hispanic: "Hispanic or Latino",
  "hispanic or latino": "Hispanic or Latino",
  not_hispanic: "Not Hispanic or Latino",
  "not hispanic or latino": "Not Hispanic or Latino",
  unknown: "Unknown",
}

/** Incoming: API race display value -> app code (aligned to RACE_OPTIONS). */
const RACE_FROM_API: Record<string, string> = {
  white: "white",
  "black or african american": "black_or_african_american",
  asian: "asian",
  "american indian or alaska native": "american_indian_or_alaska_native",
  "native hawaiian or other pacific islander": "native_hawaiian_or_other_pacific_islander",
  "other race": "other",
  other: "other",
  unknown: "unknown",
}

/** Incoming: API ethnicity display value -> app code (aligned to ETHNICITY_OPTIONS). */
const ETHNICITY_FROM_API: Record<string, string> = {
  "hispanic or latino": "hispanic",
  "not hispanic or latino": "not_hispanic",
  unknown: "unknown",
}

/** Map an app value to the API's validated string, tolerating either casing.
 *  Falls back to the original value so already-correct inputs pass through. */
function mapToApi(map: Record<string, string>, value?: string | null): string | undefined {
  if (value == null) return undefined
  const raw = value.toString().trim()
  if (!raw) return undefined
  return map[raw.toLowerCase()] ?? raw
}

/** Build the v3 request body from a create/patch input, normalizing every
 *  value-list field to the API's validated strings. */
function toApiPatientBody(
  input: Partial<PatientCreateInput>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...input }
  if (input.gender !== undefined) body.gender = mapToApi(GENDER_TO_API, input.gender)
  if (input.sexAtBirth !== undefined) body.sexAtBirth = mapToApi(SEX_TO_API, input.sexAtBirth)
  if (input.race !== undefined) body.race = mapToApi(RACE_TO_API, input.race)
  if (input.ethnicity !== undefined) body.ethnicity = mapToApi(ETHNICITY_TO_API, input.ethnicity)
  return body
}

/** Incoming race: turn an API display value into a coded {code,label} pair. */
function toRaceCoded(value?: string | null): Coded {
  const raw = (value ?? "").toString().trim()
  if (!raw) return { code: "unknown", label: "Unknown" }
  const code = RACE_FROM_API[raw.toLowerCase()] ?? raw.toLowerCase().replace(/\s+/g, "_")
  return { code, label: raw }
}

/** Incoming ethnicity: turn an API display value into a coded {code,label} pair. */
function toEthnicityCoded(value?: string | null): Coded {
  const raw = (value ?? "").toString().trim()
  if (!raw) return { code: "unknown", label: "Unknown" }
  const code = ETHNICITY_FROM_API[raw.toLowerCase()] ?? raw.toLowerCase().replace(/\s+/g, "_")
  return { code, label: raw }
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
  extra?: {
    contacts?: ContactDTO[]
    addresses?: AddressDTO[]
    deceased?: DeceasedRecord | null
  },
): Patient {
  // A patient is deceased if either the DTO flag says so or a deceased record
  // was returned from the dedicated endpoint (the latter is authoritative).
  const deceasedRecord = extra?.deceased ?? null
  const isDeceased = Boolean(dto.deceased) || deceasedRecord != null
  return {
    id: String(dto.id),
    given_name: dto.firstName,
    family_name: dto.lastName,
    middle_name: dto.middleName ?? "",
    date_of_birth: dto.dob,
    sex_at_birth: normalizeSex(dto.sexAtBirth),
    gender_identity: dto.genderIdentity ?? "",
    race: toRaceCoded(dto.race),
    ethnicity: toEthnicityCoded(dto.ethnicity),
    preferred_language: dto.preferredLanguage ?? "",
    last4_ssn: dto.last4Ssn ?? "",
    deceased: isDeceased,
    deceased_detail: deceasedRecord
      ? {
          deceasedDate: deceasedRecord.deceasedDate ?? undefined,
          deceasedTime: deceasedRecord.deceasedTime ?? undefined,
          manner: deceasedRecord.manner ?? undefined,
          cause: deceasedRecord.cause ?? undefined,
          placeOfDeath: deceasedRecord.placeOfDeath ?? undefined,
          notes: deceasedRecord.notes ?? undefined,
        }
      : undefined,
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
      country: row.locationCountry ?? "United States",
      primary: true,
    })
  }
  return {
    id: String(row.id),
    given_name: row.firstName,
    family_name: row.lastName,
    middle_name: row.middleName ?? "",
    date_of_birth: row.dateOfBirth ?? "",
    sex_at_birth: normalizeSex(row.biologicalGender),
    gender_identity: row.genderIdentity ?? "",
    race: toRaceCoded(row.race),
    ethnicity: toEthnicityCoded(row.ethnicity),
    preferred_language: "",
    last4_ssn: row.socialSecurityNumber ?? "",
    deceased: false,
    contacts,
    addresses,
    created_at: row.created ?? undefined,
    updated_at: row.updated ?? undefined,
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
// Low-level request helper (shared — see lib/api/client.ts)
// ============================================================================

// All patient calls route through the single shared client so the base path
// and `/api` prefix are assembled in exactly one place. Call sites keep passing
// the versioned path (e.g. `/v3/patient/...`).
const request = apiRequest

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

export async function findPatients(criteria: PatientFindCriteria): Promise<FindCandidate[]> {
  // The request, UI preview, and Inspector all share this exact builder.
  const data = await request<{ patients: FindCandidate[] }>(
    buildPatientFindPath(criteria),
    { method: "GET" },
  )
  return (data?.patients ?? []).toSorted((a, b) => b.score - a.score)
}

/**
 * Plain paginated list via GET /v3/patient?page&size (PatientResponseDTO page).
 *
 * The patients grid is driven by the richer POST /v3/health/grid/patient
 * endpoint, so this simpler GET is otherwise unused. It's exposed so the app
 * can exercise (and surface in the API Inspector) the vanilla list endpoint.
 */
export async function listPatients(page = 0, size = 25): Promise<Page<PatientDTO>> {
  return request<Page<PatientDTO>>(`/v3/patient?page=${page}&size=${size}`, {
    method: "GET",
  })
}

// ============================================================================
// Single patient (with contacts + addresses)
// ============================================================================

export async function fetchPatient(id: string): Promise<Patient> {
  const [dto, contacts, addresses, deceased] = await Promise.all([
    request<PatientDTO>(`/v3/patient/${id}`, { method: "GET" }),
    listContacts(id).catch(() => []),
    listAddresses(id).catch(() => []),
    // Deceased state is authoritative from its own endpoint (the patient DTO
    // does not reliably include it), so fetch it here to drive the indicator.
    fetchDeceased(id).catch(() => null),
  ])
  return dtoToPatient(dto, { contacts, addresses, deceased })
}

export async function createPatient(input: PatientCreateInput): Promise<PatientDTO> {
  return request<PatientDTO>(`/v3/patient`, {
    method: "POST",
    body: JSON.stringify(toApiPatientBody(input)),
  })
}

export async function patchPatient(
  id: string,
  patch: Partial<PatientCreateInput>,
): Promise<PatientDTO> {
  return request<PatientDTO>(`/v3/patient/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toApiPatientBody(patch)),
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

/** Structured death record (PatientDeceasedResponseDTO). */
export interface DeceasedRecord {
  id?: number
  patientId?: number
  cause?: string | null
  certifierId?: number | string | null
  deceasedDate?: string | null
  deceasedTime?: string | null
  manner?: string | null
  notes?: string | null
  placeOfDeath?: string | null
  createdAt?: string | null
}

/** POST/PUT/PATCH body (PatientDeceasedRequestDTO). deceasedDate is required
 *  by the API for POST/PUT and cannot be in the future or before the DOB. */
export interface DeceasedInput {
  deceasedDate: string
  deceasedTime?: string
  manner?: string
  cause?: string
  notes?: string
  placeOfDeath?: string
}

/**
 * GET the deceased record. Returns null when the patient simply has no death
 * record (the common case), rather than treating it as an error.
 *
 * The 1health API signals "no deceased record" inconsistently: the transport
 * status is HTTP 400, while the JSON body carries an application code of 404 —
 * e.g. `{ "code": 404, "message": "No deceased record found for patient..." }`.
 * (So the honest answer to "is it 400 or 404?" is: the HTTP status is 400 and
 * the body's `code` is 404 — they disagree.) We use the non-throwing `apiFetch`
 * so the call is still logged in the API Inspector, then inspect the real
 * status and body: the not-deceased case is detected from a 404 status, a body
 * `code` of 404, or a "no deceased record" message, and returns null. Any other
 * failure (e.g. a genuine malformed-request 400) is surfaced as an error.
 */
export async function fetchDeceased(patientId: string): Promise<DeceasedRecord | null> {
  const res = await apiFetch(`/v3/patient/${patientId}/deceased`, { method: "GET" })
  const text = await res.text().catch(() => "")

  if (res.ok) {
    return text ? (JSON.parse(text) as DeceasedRecord) : null
  }

  let bodyCode: number | undefined
  let bodyMessage = ""
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.code === "number") bodyCode = parsed.code
      if (typeof parsed.message === "string") bodyMessage = parsed.message
    }
  } catch {
    /* not JSON */
  }

  const noRecord =
    res.status === 404 || bodyCode === 404 || /no deceased record/i.test(bodyMessage)
  if (noRecord) return null

  throw new Error(bodyMessage || `1health API ${res.status}: ${text || res.statusText}`)
}

/** Mark a patient deceased. POST is not idempotent — if the patient is already
 *  marked deceased the API returns 409, so we transparently fall back to PATCH
 *  to correct the existing record instead of failing. */
export async function setDeceased(patientId: string, body: DeceasedInput): Promise<void> {
  try {
    await request<unknown>(`/v3/patient/${patientId}/deceased`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  } catch (e) {
    if (e instanceof Error && /\b409\b/.test(e.message)) {
      await request<unknown>(`/v3/patient/${patientId}/deceased`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
      return
    }
    throw e
  }
}

/** Correct an existing deceased record (PATCH — only provided fields change). */
export async function updateDeceased(
  patientId: string,
  body: Partial<DeceasedInput>,
): Promise<void> {
  await request<unknown>(`/v3/patient/${patientId}/deceased`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

/** Reverse a deceased record (DELETE). */
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
      const deceasedDate = entry.deceased.deceasedDate ?? new Date().toISOString().slice(0, 10)
      await setDeceased(pid, { deceasedDate }).catch(() => undefined)
    }
  }
  onProgress?.({ index: batch.length, total: batch.length, label: "Done" })
  return created
}
