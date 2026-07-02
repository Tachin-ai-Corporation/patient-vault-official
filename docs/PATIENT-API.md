# Patient Vault — 1health v3 API reference

All patient data is sourced from the real 1health v3 Patient Vault API through
`authFetch` (client-side, see `lib/auth-client.ts`). The typed wrappers +
DTO↔view-model mappers live in `lib/api/patient.ts`. Screens consume them via
SWR. There is no local/mock persistence.

## Endpoints used

| Purpose | Method | Path |
|---|---|---|
| List (grid, gives email/phone/city columns) | POST | `/v3/health/grid/patient?page&size` |
| List (simple demographics) | GET | `/v3/patient?page&size` |
| Find / search | GET | `/v3/patient/find?firstName&lastName&dob&sexAtBirth&exact` |
| Get one | GET | `/v3/patient/{id}` |
| Create | POST | `/v3/patient` |
| Partial update | PATCH | `/v3/patient/{id}` |
| Delete (soft) | DELETE | `/v3/patient/{id}` |
| List contacts | GET | `/v3/patient/{patientId}/contact` |
| Add contact | POST | `/v3/patient/{patientId}/contact` |
| Update / delete contact | PATCH/DELETE | `/v3/patient/{patientId}/contact/{contactId}` |
| List addresses | GET | `/v3/patient/{patientId}/address` |
| Add address | POST | `/v3/patient/{patientId}/address` |
| Update / delete address | PATCH/DELETE | `/v3/patient/{patientId}/address/{addressId}` |
| Set / clear deceased | POST/DELETE | `/v3/patient/{patientId}/deceased` |

## PatientResponseDTO

`{ id:Long, firstName, lastName, middleName, dob (YYYY-MM-DD), gender, race,
ethnicity, sexAtBirth, genderIdentity, preferredLanguage, last4Ssn (masked
"***-**-1234"), deceased }`

- Create requires `firstName`, `lastName`, `dob`. Enum fields default to
  `Unknown`. `dob` cannot be in the future. `last4Ssn` must be 4 digits.
- `sexAtBirth`: `male` | `female` | `intersex` | `unknown`.
- `race` / `ethnicity` / `gender`: validated value-list strings
  (e.g. `white`, `not_hispanic`). `genderIdentity`, `preferredLanguage`: free text.
- `deceased` is read-only here — manage via the `/deceased` sub-resource.

## Grid response (`POST /v3/health/grid/patient`)

Body `{ filterBy:[{key,operator,value}], orderBy:[{key,order}] }`. Returns a
Spring `Page` (`content[]`, `totalElements`, `totalPages`, `number`, `size`).
Row fields include: `id, firstName, lastName, middleName, dateOfBirth,
race[], ethnicity[], biologicalGender[], genderIdentity, socialSecurityNumber,
email, phone, locationAddressCity, locationPostalCode, locationCounty,
locationCountry[], locationAddressStreet, created, updated`.

## Contacts / Addresses

- Contact: `{ type: email|mobile|home|work|fax|other, value, label?, region?,
  isPrimary?, notificationsEnabled? }`. First of a type auto-primary.
- Address: `{ line1, line2?, city, state, postalCode, country?, use?, primary?,
  effectiveFrom? }`. Required: line1, city, state, postalCode.

## Not available in this API (dropped from the demo UI)

pronouns, attachments/documents, providers, custom fields, aliases, and record
merge have **no** v3 endpoint and are intentionally omitted. Seeding therefore
creates patients + contacts + addresses (+ deceased) only.
