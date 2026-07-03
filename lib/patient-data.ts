// Patient view model + option sets aligned to the 1health v3 Patient API.
//
// This is the app's internal representation of a patient. It maps 1:1 to the
// v3 patient DTO via the mappers in lib/api/patient.ts. Fields that the demo
// UI invented but the API cannot persist (pronouns, attachments, providers,
// aliases, custom fields) have been removed per "default to the API".

// ---- shared types -----------------------------------------------------------

// A coded value pair. The API stores race/ethnicity as validated string codes
// (e.g. "white", "not_hispanic"); we keep a human label alongside for display.
export type Coded = { code: string; label: string }

// Biological sex at birth — matches the API's validated lowercase value set.
export type SexAtBirth = "male" | "female" | "intersex" | "unknown"

// Contact + address use the API sub-resource shapes (see lib/api/patient.ts).
export type ContactType = "email" | "mobile" | "home" | "work" | "fax" | "other"
export type AddressUse = "home" | "work" | "temp"

export type Contact = {
  id: string
  type: ContactType
  value: string
  label: string
  isPrimary: boolean
}

export type Address = {
  id: string
  use: AddressUse
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  primary: boolean
  validationStatus?: string
}

export type Patient = {
  id: string
  given_name: string
  family_name: string
  middle_name: string
  date_of_birth: string // ISO yyyy-mm-dd
  sex_at_birth: SexAtBirth
  gender_identity: string
  race: Coded
  ethnicity: Coded
  preferred_language: string
  last4_ssn: string
  deceased: boolean
  // Structured death record (from GET /v3/patient/{id}/deceased). Present only
  // when `deceased` is true; drives the on-screen deceased indicator details.
  deceased_detail?: {
    deceasedDate?: string
    deceasedTime?: string
    manner?: string
    cause?: string
    placeOfDeath?: string
    notes?: string
  }
  contacts: Contact[]
  addresses: Address[]
  // When the record was created in the vault (ISO datetime), when the API
  // provides it. Optional so records without a timestamp still render.
  created_at?: string
}

// ---- API-validated value sets -----------------------------------------------

export const SEX_AT_BIRTH_OPTIONS: SexAtBirth[] = ["male", "female", "intersex", "unknown"]

// Administrative gender codes accepted by the API.
export const GENDER_OPTIONS = ["female", "male", "other", "unknown"]

// gender_identity is free text on the API; these are common suggestions.
export const GENDER_IDENTITY_OPTIONS = [
  "woman",
  "man",
  "non-binary",
  "transgender woman",
  "transgender man",
  "other",
  "prefer not to say",
]

// Race codes accepted by the API (OMB / CDC categories).
export const RACE_OPTIONS: Coded[] = [
  { code: "white", label: "White" },
  { code: "black_or_african_american", label: "Black or African American" },
  { code: "asian", label: "Asian" },
  { code: "american_indian_or_alaska_native", label: "American Indian or Alaska Native" },
  { code: "native_hawaiian_or_other_pacific_islander", label: "Native Hawaiian or Other Pacific Islander" },
  { code: "other", label: "Other" },
  { code: "unknown", label: "Unknown" },
]

// Ethnicity codes accepted by the API.
export const ETHNICITY_OPTIONS: Coded[] = [
  { code: "hispanic", label: "Hispanic or Latino" },
  { code: "not_hispanic", label: "Not Hispanic or Latino" },
  { code: "unknown", label: "Unknown" },
]

// preferredLanguage is free text on the API; these are common values.
export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Chinese",
  "French",
  "Vietnamese",
  "Arabic",
  "Tagalog",
]

export const CONTACT_TYPE_OPTIONS: ContactType[] = ["mobile", "home", "work", "email", "fax", "other"]
export const ADDRESS_USE_OPTIONS: AddressUse[] = ["home", "work", "temp"]

// ---- display helpers --------------------------------------------------------

// Turn an API code like "not_hispanic" into a human label "Not Hispanic".
export function prettifyCode(code: string): string {
  if (!code) return ""
  return code
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function patientFullName(p: Pick<Patient, "given_name" | "family_name">): string {
  return `${p.given_name} ${p.family_name}`.trim()
}

export function languageLabel(value: string): string {
  return value || "—"
}

export function contactTypeLabel(type: ContactType): string {
  return prettifyCode(type)
}
