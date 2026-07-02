// Patient data model + USCDI-aligned value sets + synthetic generator.
//
// NOTE (v0 mock): The generator below runs CLIENT-SIDE to fabricate sample
// records for the console preview. In production this is replaced by a
// server-side `POST /seed?count=N` endpoint backed by a Synthea-derived
// synthetic patient generator. See seedPatients() in lib/session-context.tsx
// for the swap point.

export type Coded = { code: string; label: string }

export type AddressUse = 'home' | 'work' | 'temp'
export type Address = {
  use: AddressUse
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

export type ContactSystem = 'phone' | 'email'
export type ContactUse = 'home' | 'work' | 'mobile'
export type Contact = {
  system: ContactSystem
  value: string
  use: ContactUse
}

export type Provider = {
  name: string
  role: string
  npi: string
}

// Attachment metadata only — never the file payload. Mirrors what the
// production manifest endpoint (GET /patient/{id}?view=manifest) returns.
export type Attachment = {
  id: string
  patient_id: string
  filename: string
  content_type: string
  size_bytes: number
  created_at: string // ISO datetime
}

export type SexAtBirth = 'Male' | 'Female' | 'Unknown'

export type Patient = {
  id: string
  given_name: string
  family_name: string
  date_of_birth: string // ISO yyyy-mm-dd
  sex_at_birth: SexAtBirth
  gender_identity: string
  pronouns: string
  race: Coded
  ethnicity: Coded
  preferred_language: string // BCP 47
  deceased: boolean
  addresses: Address[]
  contacts: Contact[]
  providers: Provider[]
  // Real attachment metadata objects. attachment_count is kept as a derived
  // convenience equal to attachments.length so existing grid/drawer reads work.
  attachments: Attachment[]
  attachment_count: number
  // Prior names absorbed when other records are merged into this one. In
  // production these are FHIR Patient.name entries with use=old preserved on
  // the surviving record; here they are kept as display strings.
  aliases?: string[]
  // When the record was created in the vault (ISO datetime). Optional so older
  // persisted records and manually-added patients without a timestamp still
  // render — the grid shows an em dash when absent.
  created_at?: string
}

// ---- USCDI value sets -------------------------------------------------------

export const SEX_AT_BIRTH_OPTIONS: SexAtBirth[] = ['Male', 'Female', 'Unknown']

// USCDI gender identity value set (short list)
export const GENDER_IDENTITY_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Transgender male',
  'Transgender female',
  'Other',
  'Declined',
]

// LOINC 90778-2 pronoun answers
export const PRONOUN_OPTIONS = ['she/her', 'he/him', 'they/them']

// CDC Race & Ethnicity code system
export const RACE_OPTIONS: Coded[] = [
  { code: '2106-3', label: 'White' },
  { code: '2054-5', label: 'Black or African American' },
  { code: '2028-9', label: 'Asian' },
  { code: '1002-5', label: 'American Indian or Alaska Native' },
  { code: '2076-8', label: 'Native Hawaiian or Other Pacific Islander' },
]

export const ETHNICITY_OPTIONS: Coded[] = [
  { code: '2135-2', label: 'Hispanic or Latino' },
  { code: '2186-5', label: 'Not Hispanic or Latino' },
]

// BCP 47 language tags
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'tl', label: 'Tagalog' },
]

export const ADDRESS_USE_OPTIONS: AddressUse[] = ['home', 'work', 'temp']
export const CONTACT_SYSTEM_OPTIONS: ContactSystem[] = ['phone', 'email']
export const CONTACT_USE_OPTIONS: ContactUse[] = ['home', 'work', 'mobile']

// ---- id generation ----------------------------------------------------------

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomId(prefix: string, len = 6): string {
  let suffix = ''
  for (let i = 0; i < len; i++) {
    suffix += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)]
  }
  return `${prefix}_${suffix}`
}

export function generatePatientId(): string {
  return randomId('pat')
}

export function generateAttachmentId(): string {
  return randomId('att')
}

// Human-readable byte size, e.g. 24.1 KB, 1.8 MB.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

// ---- synthetic generation (v0 mock only) ------------------------------------

const GIVEN_NAMES_F = [
  'Maria', 'Aisha', 'Sofia', 'Wei', 'Linda', 'Priya', 'Grace', 'Fatima',
  'Elena', 'Mei', 'Carmen', 'Hannah', 'Yuki', 'Rosa', 'Naomi', 'Leila',
]
const GIVEN_NAMES_M = [
  'James', 'Mohammed', 'Diego', 'Chen', 'Robert', 'Arjun', 'Daniel', 'Omar',
  'Luis', 'Hiroshi', 'Marcus', 'Samuel', 'Kofi', 'Andre', 'Ivan', 'Tariq',
]
const GIVEN_NAMES_N = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Taylor']

const FAMILY_NAMES = [
  'Nguyen', 'Garcia', 'Smith', 'Khan', 'Johnson', 'Patel', 'Lee', 'Hassan',
  'Martinez', 'Wang', 'Brown', 'Okafor', 'Rossi', 'Kim', 'Silva', 'Cohen',
  'Ahmed', 'Torres', 'Nakamura', 'Williams',
]

const STREETS = [
  'Maple Ave', 'Oak St', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Sunset Blvd',
  'Park Way', 'Lake Dr', '2nd Ave', 'Market St',
]

const CITIES: { city: string; state: string; zip: string }[] = [
  { city: 'Austin', state: 'TX', zip: '78701' },
  { city: 'Seattle', state: 'WA', zip: '98101' },
  { city: 'Denver', state: 'CO', zip: '80202' },
  { city: 'Boston', state: 'MA', zip: '02108' },
  { city: 'Atlanta', state: 'GA', zip: '30303' },
  { city: 'Phoenix', state: 'AZ', zip: '85003' },
  { city: 'Chicago', state: 'IL', zip: '60601' },
  { city: 'Portland', state: 'OR', zip: '97201' },
]

const PROVIDER_NAMES = [
  'Dr. Anita Rao', 'Dr. Mark Feld', 'Dr. Susan Cho', 'Dr. Eli Romero',
  'Dr. Tara Singh', 'Dr. Owen Pratt', 'Dr. Lena Voss', 'Dr. Carl Mensah',
]
const PROVIDER_ROLES = [
  'Primary Care Physician',
  'Cardiologist',
  'Endocrinologist',
  'Pediatrician',
  'Internist',
]

// Healthcare-aware attachment templates: { filename, content_type }.
const ATTACHMENT_TEMPLATES: { filename: string; content_type: string }[] = [
  { filename: 'lab_results.pdf', content_type: 'application/pdf' },
  { filename: 'discharge_summary.pdf', content_type: 'application/pdf' },
  { filename: 'referral_letter.pdf', content_type: 'application/pdf' },
  { filename: 'immunization_record.pdf', content_type: 'application/pdf' },
  { filename: 'chest_xray.png', content_type: 'image/png' },
  { filename: 'mri_scan.png', content_type: 'image/png' },
  { filename: 'insurance_card.jpg', content_type: 'image/jpeg' },
  { filename: 'ekg_strip.png', content_type: 'image/png' },
  { filename: 'visit_notes.txt', content_type: 'text/plain' },
  { filename: 'echocardiogram.dcm', content_type: 'application/dicom' },
]

// ---- scenario packs (v0 mock flavor) ---------------------------------------
//
// A scenario biases the synthetic generation toward a clinical population.
// It only shapes EXISTING fields — provider role, attachment mix (whose
// filenames stand in for the patient's conditions/observations), date of
// birth, and contacts. No new patient fields are introduced; every seeded
// patient still carries full, valid USCDI demographics.

export type ScenarioKey =
  | 'general'
  | 'diabetes'
  | 'behavioral'
  | 'rpm'
  | 'pediatric'
  | 'urgent'

export const SCENARIO_OPTIONS: { key: ScenarioKey; label: string }[] = [
  { key: 'general', label: 'General population' },
  { key: 'diabetes', label: 'Diabetes clinic' },
  { key: 'behavioral', label: 'Behavioral health intake' },
  { key: 'rpm', label: 'Remote patient monitoring' },
  { key: 'pediatric', label: 'Pediatric (guardian / minor)' },
  { key: 'urgent', label: 'Urgent care' },
]

type ScenarioProfile = {
  // Provider roles plausible for this population.
  providerRoles: string[]
  // Attachment templates whose filenames evoke this population's conditions
  // and observations (e.g. hba1c_results.pdf for a diabetes clinic).
  attachments: { filename: string; content_type: string }[]
  // Inclusive [min, max] number of attachments to generate per patient.
  attachmentCount: [number, number]
  // Optional birth-year range override (used to bias age, e.g. pediatric).
  dobYearRange?: [number, number]
  // When true, add an extra guardian contact (a minor's caregiver phone).
  guardianContact?: boolean
}

const SCENARIO_PROFILES: Record<ScenarioKey, ScenarioProfile> = {
  general: {
    providerRoles: PROVIDER_ROLES,
    attachments: ATTACHMENT_TEMPLATES,
    attachmentCount: [0, 3],
  },
  diabetes: {
    providerRoles: ['Endocrinologist', 'Primary Care Physician', 'Diabetes Educator'],
    attachments: [
      { filename: 'hba1c_results.pdf', content_type: 'application/pdf' },
      { filename: 'glucose_log.csv', content_type: 'text/csv' },
      { filename: 'metformin_rx.pdf', content_type: 'application/pdf' },
      { filename: 'diabetic_foot_exam.pdf', content_type: 'application/pdf' },
      { filename: 'retinopathy_screening.png', content_type: 'image/png' },
      { filename: 'lipid_panel.pdf', content_type: 'application/pdf' },
    ],
    attachmentCount: [2, 4],
  },
  behavioral: {
    providerRoles: [
      'Psychiatrist',
      'Behavioral Health Clinician',
      'Licensed Therapist',
    ],
    attachments: [
      { filename: 'phq9_assessment.pdf', content_type: 'application/pdf' },
      { filename: 'gad7_screening.pdf', content_type: 'application/pdf' },
      { filename: 'intake_notes.txt', content_type: 'text/plain' },
      { filename: 'care_plan.pdf', content_type: 'application/pdf' },
      { filename: 'safety_plan.pdf', content_type: 'application/pdf' },
    ],
    attachmentCount: [1, 3],
  },
  rpm: {
    providerRoles: ['Cardiologist', 'Primary Care Physician', 'RPM Care Manager'],
    attachments: [
      { filename: 'wearable_vitals.json', content_type: 'application/json' },
      { filename: 'bp_telemetry.csv', content_type: 'text/csv' },
      { filename: 'glucose_cgm_export.csv', content_type: 'text/csv' },
      { filename: 'spo2_readings.csv', content_type: 'text/csv' },
      { filename: 'heart_rate_trend.png', content_type: 'image/png' },
    ],
    attachmentCount: [2, 4],
  },
  pediatric: {
    providerRoles: ['Pediatrician', 'Family Medicine Physician'],
    attachments: [
      { filename: 'well_child_visit.pdf', content_type: 'application/pdf' },
      { filename: 'immunization_record.pdf', content_type: 'application/pdf' },
      { filename: 'growth_chart.png', content_type: 'image/png' },
      { filename: 'school_physical.pdf', content_type: 'application/pdf' },
    ],
    attachmentCount: [1, 2],
    dobYearRange: [2008, 2024],
    guardianContact: true,
  },
  urgent: {
    providerRoles: ['Emergency Medicine Physician', 'Urgent Care Physician'],
    attachments: [
      { filename: 'triage_notes.txt', content_type: 'text/plain' },
      { filename: 'xray_results.png', content_type: 'image/png' },
      { filename: 'discharge_instructions.pdf', content_type: 'application/pdf' },
      { filename: 'rapid_test_result.pdf', content_type: 'application/pdf' },
    ],
    attachmentCount: [0, 2],
  },
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function randomDob(): string {
  const year = randInt(1940, 2018)
  const month = randInt(1, 12)
  const day = randInt(1, 28)
  return `${year}-${pad(month)}-${pad(day)}`
}

function npi(): string {
  let n = ''
  for (let i = 0; i < 10; i++) n += randInt(0, 9)
  return n
}

function phone(): string {
  return `+1${randInt(200, 989)}${randInt(200, 989)}${randInt(1000, 9999)}`
}

// Random ISO datetime within roughly the last two years.
function randomCreatedAt(): string {
  const now = Date.now()
  const twoYears = 1000 * 60 * 60 * 24 * 730
  return new Date(now - Math.floor(Math.random() * twoYears)).toISOString()
}

// Generate real attachment metadata objects for a patient, biased by the
// active scenario profile (count range + filename templates).
function generateAttachments(
  patientId: string,
  profile: ScenarioProfile,
): Attachment[] {
  const [min, max] = profile.attachmentCount
  const count = randInt(min, max)
  const used = new Set<string>()
  const out: Attachment[] = []
  for (let i = 0; i < count; i++) {
    let tpl = pick(profile.attachments)
    // Avoid duplicate filenames on the same patient where possible.
    let guard = 0
    while (used.has(tpl.filename) && guard < 5) {
      tpl = pick(profile.attachments)
      guard++
    }
    used.add(tpl.filename)
    out.push({
      id: generateAttachmentId(),
      patient_id: patientId,
      filename: tpl.filename,
      content_type: tpl.content_type,
      size_bytes: randInt(12 * 1024, 8 * 1024 * 1024),
      created_at: randomCreatedAt(),
    })
  }
  return out
}

export function generateSyntheticPatient(
  scenario: ScenarioKey = 'general',
): Patient {
  const profile = SCENARIO_PROFILES[scenario] ?? SCENARIO_PROFILES.general
  const sex = pick<SexAtBirth>(['Male', 'Female', 'Female', 'Male', 'Unknown'])
  const given =
    sex === 'Male'
      ? pick(GIVEN_NAMES_M)
      : sex === 'Female'
        ? pick(GIVEN_NAMES_F)
        : pick(GIVEN_NAMES_N)
  const family = pick(FAMILY_NAMES)
  const city = pick(CITIES)
  const lang = pick(LANGUAGE_OPTIONS)

  // gender identity loosely coherent with sex at birth, with variation
  const gender =
    Math.random() < 0.82
      ? sex === 'Male'
        ? 'Male'
        : sex === 'Female'
          ? 'Female'
          : pick(GENDER_IDENTITY_OPTIONS)
      : pick(GENDER_IDENTITY_OPTIONS)

  const pronouns =
    gender === 'Male'
      ? 'he/him'
      : gender === 'Female'
        ? 'she/her'
        : pick(PRONOUN_OPTIONS)

  const id = generatePatientId()
  const attachments = generateAttachments(id, profile)
  // Scenario may bias age (e.g. pediatric → minors) via a birth-year range.
  const dob = profile.dobYearRange
    ? `${randInt(profile.dobYearRange[0], profile.dobYearRange[1])}-${pad(
        randInt(1, 12),
      )}-${pad(randInt(1, 28))}`
    : randomDob()

  return {
    id,
    given_name: given,
    family_name: family,
    date_of_birth: dob,
    sex_at_birth: sex,
    gender_identity: gender,
    pronouns,
    race: pick(RACE_OPTIONS),
    ethnicity: pick(ETHNICITY_OPTIONS),
    preferred_language: lang.code,
    deceased: Math.random() < 0.04,
    addresses: [
      {
        use: 'home',
        line1: `${randInt(100, 9999)} ${pick(STREETS)}`,
        line2: '',
        city: city.city,
        state: city.state,
        postal_code: city.zip,
        country: 'US',
      },
    ],
    contacts: [
      { system: 'phone', value: phone(), use: 'mobile' },
      {
        system: 'email',
        value: `${given.toLowerCase()}.${family.toLowerCase()}@example.com`,
        use: 'home',
      },
      // Pediatric scenario: add a guardian/caregiver contact (home phone).
      ...(profile.guardianContact
        ? [{ system: 'phone' as const, value: phone(), use: 'home' as const }]
        : []),
    ],
    providers: [
      {
        name: pick(PROVIDER_NAMES),
        role: pick(profile.providerRoles),
        npi: npi(),
      },
    ],
    attachments,
    attachment_count: attachments.length,
    created_at: randomCreatedAt(),
  }
}

// Flatten every project patient's attachments into one project-wide list, newest first.
export function collectAttachments(patients: Patient[]): Attachment[] {
  return patients
    .flatMap((p) => p.attachments)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export function generateSyntheticPatients(
  count: number,
  scenario: ScenarioKey = 'general',
): Patient[] {
  return Array.from({ length: count }, () =>
    generateSyntheticPatient(scenario),
  )
}

export function patientFullName(p: Patient): string {
  return `${p.given_name} ${p.family_name}`
}

export function languageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code
}
