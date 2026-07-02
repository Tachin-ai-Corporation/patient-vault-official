// Hard-coded synthetic patient dataset for the "Seed sample data" action.
//
// Each entry is created against the real 1health v3 API: a patient record
// (POST /v3/patient) followed by its contacts (POST .../contact), addresses
// (POST .../address), and an optional deceased marker (POST .../deceased).
// Attachments are intentionally omitted — the v3 API has no attachment
// endpoint, so they cannot be persisted.

import type {
  PatientCreateInput,
  ContactInput,
  AddressInput,
} from "@/lib/api/patient"

export interface SeedPatient {
  patient: PatientCreateInput
  contacts: ContactInput[]
  addresses: AddressInput[]
  deceased?: { deceasedDate?: string }
}

export const SEED_PATIENTS: SeedPatient[] = [
  {
    patient: {
      firstName: "Maria",
      lastName: "Santos",
      middleName: "Elena",
      dob: "1988-04-12",
      gender: "female",
      race: "white",
      ethnicity: "hispanic",
      sexAtBirth: "female",
      genderIdentity: "woman",
      preferredLanguage: "Spanish",
      last4Ssn: "1234",
    },
    contacts: [
      { type: "mobile", value: "+15125550142", label: "Personal", isPrimary: true },
      { type: "email", value: "maria.santos@example.com", label: "Home" },
    ],
    addresses: [
      {
        line1: "1420 Maple Ave",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
  {
    patient: {
      firstName: "James",
      lastName: "Okafor",
      dob: "1975-09-03",
      gender: "male",
      race: "black_or_african_american",
      ethnicity: "not_hispanic",
      sexAtBirth: "male",
      genderIdentity: "man",
      preferredLanguage: "English",
      last4Ssn: "5678",
    },
    contacts: [
      { type: "mobile", value: "+12065550188", label: "Cell", isPrimary: true },
      { type: "work", value: "+12065550190", label: "Office" },
    ],
    addresses: [
      {
        line1: "88 Cedar Ln",
        line2: "Apt 4B",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
  {
    patient: {
      firstName: "Wei",
      lastName: "Chen",
      middleName: "Ming",
      dob: "1992-01-27",
      gender: "female",
      race: "asian",
      ethnicity: "not_hispanic",
      sexAtBirth: "female",
      genderIdentity: "woman",
      preferredLanguage: "Chinese",
    },
    contacts: [
      { type: "email", value: "wei.chen@example.com", label: "Personal", isPrimary: true },
      { type: "mobile", value: "+13035550164", label: "Cell" },
    ],
    addresses: [
      {
        line1: "512 Pine Rd",
        city: "Denver",
        state: "CO",
        postalCode: "80202",
        country: "United States",
        use: "home",
        primary: true,
      },
      {
        line1: "77 Market St",
        line2: "Suite 300",
        city: "Denver",
        state: "CO",
        postalCode: "80202",
        country: "United States",
        use: "work",
      },
    ],
  },
  {
    patient: {
      firstName: "Priya",
      lastName: "Patel",
      dob: "1983-06-18",
      gender: "female",
      race: "asian",
      ethnicity: "not_hispanic",
      sexAtBirth: "female",
      genderIdentity: "woman",
      preferredLanguage: "English",
      last4Ssn: "9012",
    },
    contacts: [
      { type: "mobile", value: "+16175550173", label: "Cell", isPrimary: true },
      { type: "home", value: "+16175550174", label: "Home" },
    ],
    addresses: [
      {
        line1: "230 Oak St",
        city: "Boston",
        state: "MA",
        postalCode: "02108",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
  {
    patient: {
      firstName: "Diego",
      lastName: "Martinez",
      middleName: "Luis",
      dob: "1969-11-30",
      gender: "male",
      race: "white",
      ethnicity: "hispanic",
      sexAtBirth: "male",
      genderIdentity: "man",
      preferredLanguage: "Spanish",
    },
    contacts: [
      { type: "mobile", value: "+14805550129", label: "Cell", isPrimary: true },
    ],
    addresses: [
      {
        line1: "915 Sunset Blvd",
        city: "Phoenix",
        state: "AZ",
        postalCode: "85003",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
  {
    patient: {
      firstName: "Aisha",
      lastName: "Hassan",
      dob: "1995-03-08",
      gender: "female",
      race: "black_or_african_american",
      ethnicity: "not_hispanic",
      sexAtBirth: "female",
      genderIdentity: "woman",
      preferredLanguage: "Arabic",
    },
    contacts: [
      { type: "email", value: "aisha.hassan@example.com", label: "Personal", isPrimary: true },
      { type: "mobile", value: "+13125550157", label: "Cell" },
    ],
    addresses: [
      {
        line1: "44 Lake Dr",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
  {
    patient: {
      firstName: "Robert",
      lastName: "Nguyen",
      dob: "1958-07-22",
      gender: "male",
      race: "asian",
      ethnicity: "not_hispanic",
      sexAtBirth: "male",
      genderIdentity: "man",
      preferredLanguage: "Vietnamese",
      last4Ssn: "3456",
    },
    contacts: [
      { type: "home", value: "+15035550111", label: "Home", isPrimary: true },
    ],
    addresses: [
      {
        line1: "612 2nd Ave",
        city: "Portland",
        state: "OR",
        postalCode: "97201",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
    // A deceased record to exercise the deceased sub-resource.
    deceased: { deceasedDate: "2023-12-05" },
  },
  {
    patient: {
      firstName: "Grace",
      lastName: "Williams",
      middleName: "Rose",
      dob: "2001-10-14",
      gender: "female",
      race: "white",
      ethnicity: "not_hispanic",
      sexAtBirth: "female",
      genderIdentity: "woman",
      preferredLanguage: "English",
    },
    contacts: [
      { type: "mobile", value: "+14045550198", label: "Cell", isPrimary: true },
      { type: "email", value: "grace.williams@example.com", label: "School" },
    ],
    addresses: [
      {
        line1: "1801 Elm St",
        line2: "Unit 12",
        city: "Atlanta",
        state: "GA",
        postalCode: "30303",
        country: "United States",
        use: "home",
        primary: true,
      },
    ],
  },
]
