# GET /v3/patient
# POST /v3/patient
# GET /v3/patient/find
# GET /v3/patient/{id}
# PUT /v3/patient/{id}
# PATCH /v3/patient/{id}
# DELETE /v3/patient/{id}

APIs for managing patient demographic records. Supports creating, updating (full and partial), and deleting patient information including demographics, gender identity, and SSN.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient` | GET | List patient records |
| `/v3/patient` | POST | Create a patient record |
| `/v3/patient/find` | GET | Find patients matching demographic criteria |
| `/v3/patient/{id}` | GET | Get a patient record by ID |
| `/v3/patient/{id}` | PUT | Fully update a patient record |
| `/v3/patient/{id}` | PATCH | Partially update a patient record |
| `/v3/patient/{id}` | DELETE | Delete a patient record |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient

<h4>Overview</h4>
<p>Returns a paginated list of patient demographic records for the current tenant's organization. Each entry carries the same demographic fields as the single-patient endpoint.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Only patients of the caller's organization are returned</li>
<li>Soft-deleted patients are excluded</li>
<li>Results are returned page by page; use <code>page</code> and <code>size</code> to navigate</li>
<li>Returns <code>200</code> with an empty list when the organization has no patients — not a <code>404</code></li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li><code>page</code> is zero-based and defaults to <code>0</code></li>
<li><code>size</code> defaults to <code>50</code></li>
</ul>

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Zero-based page index to retrieve. Defaults to 0 when omitted. Default: `0` |
| `size` | integer | No | Number of records per page. Defaults to 50 when omitted. Default: `50` |

### Response

#### 200

Paginated list of patient records (possibly empty).

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 401

Not authenticated — valid session required.

**DTO**: `PagePatientResponseDTO`

```json
{
  "data": [
    {
      "dob": "1990-05-15",
      "ethnicity": "Not Hispanic or Latino",
      "firstName": "John",
      "gender": "Male",
      "genderIdentity": "Non-binary",
      "id": 12345,
      "lastName": "Doe",
      "middleName": "Michael",
      "preferredLanguage": "English",
      "race": "White",
      "sexAtBirth": "Male",
      "ssnPreview": "***-**-1234"
    }
  ],
  "emptyPage": true,
  "firstPage": true,
  "lastPage": true,
  "numberOfElements": 1,
  "offset": 1,
  "pageNumber": 1,
  "pageSize": 1,
  "totalElements": 1,
  "totalPages": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | Array<PatientResponseDTO> | No |  |
| `emptyPage` | boolean | No |  |
| `firstPage` | boolean | No |  |
| `lastPage` | boolean | No |  |
| `numberOfElements` | integer(int64) | No |  |
| `offset` | integer(int64) | No |  |
| `pageNumber` | integer(int32) | No |  |
| `pageSize` | integer(int32) | No |  |
| `totalElements` | integer(int64) | No |  |
| `totalPages` | integer(int32) | No |  |

---

## POST /v3/patient

<h4>Overview</h4>
<p>Creates a new patient demographic record in the Patient Vault. Required fields are first name, last name, and date of birth. Enum fields (gender, race, ethnicity) default to Unknown if not provided.</p>
<h4>Duplicate handling</h4>
<p>The Patient Vault never decides whether two records are the same person, and never blocks or merges based on similarity. Every call creates a new, distinct patient — even when an identical record (same <code>firstName</code>, <code>lastName</code>, and <code>dob</code>, and even the same <code>last4Ssn</code>, <code>race</code>, and <code>ethnicity</code>) already exists in the tenant. No SSN, race, or ethnicity is ever required to disambiguate. Use the patient find/match API to detect and resolve potential duplicates yourself.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>If <code>last4Ssn</code> is provided, it is stored in masked format (e.g. <code>***-**-1234</code>) — the full SSN is never stored or returned</li>
<li>All value-list fields (<code>gender</code>, <code>race</code>, <code>ethnicity</code>) are validated against their allowed values</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Date fields must be in <code>YYYY-MM-DD</code> format</li>
<li>Date of birth cannot be in the future</li>
<li>Deceased status is read-only here — manage it via the <code>/v3/patient/{patientId}/deceased</code> endpoints</li>
</ul>

### Request Body

**DTO**: `PatientRequestDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "last4Ssn": 1234,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | Yes | Date of birth in YYYY-MM-DD format. Cannot be cleared. |
| `ethnicity` | string | No | OMB ethnicity category. Allowed values: Hispanic or Latino, Not Hispanic or Latino, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `firstName` | string | Yes | Legal first name. Cannot be cleared. |
| `gender` | string | No | Administrative sex. Allowed values: Male, Female, Other, Unknown, Asked but not answered. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `genderIdentity` | string | No | Self-reported gender identity (freeform or coded). Optional; clear with <code>n/a</code>. |
| `last4Ssn` | string | No | Last 4 digits of Social Security Number. Must be exactly 4 numeric digits. Cannot be cleared. |
| `lastName` | string | Yes | Legal last name / surname. Cannot be cleared. |
| `middleName` | string | No | Middle name or initial. Optional; clear with <code>n/a</code>. |
| `preferredLanguage` | string | No | Free form language name. Optional; clear with <code>n/a</code>. |
| `race` | string | No | OMB race category. Allowed values: American Indian or Alaska Native, Asian, Black or African American, Hispanic or Latino, Middle Eastern or North African, Native Hawaiian or other Pacific Islander, White, Other Race, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `sexAtBirth` | string | No | Biological sex at birth. Allowed values: Male, Female, Intersex, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. Enum: `Male`, `Female`, `Intersex`, `Unknown` |

### Response

#### 200

Patient record created successfully.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 400

Invalid request. Possible causes:<br>• A required field (firstName, lastName, dob) is missing, blank, or set to n/a<br>• Invalid value for gender, race, or ethnicity<br>• Invalid date format for dob<br>• Date of birth is in the future<br>• last4Ssn is not exactly 4 digits

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

---

## GET /v3/patient/find

<h4>Overview</h4>
<p>Looks up patients by demographic criteria and returns a ranked list of candidates, each with a confidence score. Use it before creating a patient to check whether the person already exists, or any time you need to resolve a person to a patient ID. This operation is read-only and never creates or modifies a patient.</p>
<h4>Matching modes</h4>
<ul>
<li><b>Fuzzy</b> (<code>exact=false</code>, the default) — tolerant matching that ranks candidates by how closely they resemble the supplied criteria, so minor typos and spelling variations still surface results.</li>
<li><b>Exact</b> (<code>exact=true</code>) — returns only patients whose supplied criteria match exactly, each with a <code>score</code> of <code>1.0</code>, or an empty list.</li>
</ul>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Supply any subset of <code>firstName</code>, <code>lastName</code>, <code>dob</code>, and <code>sexAtBirth</code> — at least one is required. The response shape is identical in both modes.</li>
<li>Criteria are combined with AND.</li>
<li>Each result includes a <code>score</code> between 0 and 1 and a <code>matchedOn</code> list of the criteria that contributed to the match.</li>
<li><code>sexAtBirth</code> is non-discriminating when omitted or <code>unknown</code> — it neither excludes candidates nor contributes to the score. A concrete value is applied as an exact filter and appears in <code>matchedOn</code>.</li>
<li>Returns <code>200</code> with an empty list when nobody matches — "no match" is a successful answer, not a <code>404</code>.</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>At least one criterion is required; a request with none (e.g. <code>exact</code> alone) returns <code>400</code></li>
<li><code>dob</code> must be in <code>YYYY-MM-DD</code> format</li>
<li>Only patients within the current tenant are searched</li>
</ul>

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstName` | string | No | Given name to match. |
| `lastName` | string | No | Family name to match. |
| `dob` | string | No | Date of birth in YYYY-MM-DD format. |
| `sexAtBirth` | string | No | Biological sex at birth. Non-discriminating when omitted or unknown. Enum: `male`, `female`, `intersex`, `unknown` |
| `exact` | boolean | No | When true, returns only exact matches (score 1.0). Defaults to false (fuzzy matching). Default: `False` |

### Response

#### 200

Ranked list of matching patients (possibly empty).

**DTO**: `PatientFindResponseDTO`

```json
{
  "patients": [
    {
      "id": 12345,
      "matchedOn": [
        "firstName",
        "lastName",
        "dob"
      ],
      "score": 0.97
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patients` | Array<PatientMatchDTO> | No | The matching patient candidates. Empty when no patient meets the criteria. |

#### 400

Invalid request. Possible causes:<br>• No demographic criteria provided (firstName, lastName, dob, or sexAtBirth)<br>• Invalid sexAtBirth value<br>• Invalid date format for dob

**DTO**: `PatientFindResponseDTO`

```json
{
  "patients": [
    {
      "id": 12345,
      "matchedOn": [
        "firstName",
        "lastName",
        "dob"
      ],
      "score": 0.97
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patients` | Array<PatientMatchDTO> | No | The matching patient candidates. Empty when no patient meets the criteria. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientFindResponseDTO`

```json
{
  "patients": [
    {
      "id": 12345,
      "matchedOn": [
        "firstName",
        "lastName",
        "dob"
      ],
      "score": 0.97
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patients` | Array<PatientMatchDTO> | No | The matching patient candidates. Empty when no patient meets the criteria. |

---

## GET /v3/patient/{id}

<h4>Overview</h4>
<p>Returns the demographic record of a single patient by ID. The response carries the same fields as each entry in the patient list.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Returns the patient's demographics including name, date of birth, gender, race, ethnicity, preferred language, and masked SSN preview</li>
<li>The full SSN is never returned — only the masked preview (e.g. <code>***-**-1234</code>)</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Idempotent — repeated calls return the same result</li>
<li>Returns 404 if the patient does not exist in the current tenant</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The ID of the patient record to retrieve. |

### Response

#### 200

Patient record found.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 404

Not found — patient with the specified ID does not exist in this tenant.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

---

## PUT /v3/patient/{id}

<h4>Overview</h4>
<p>Replaces all demographic fields of an existing patient record. All required fields must be provided. Optional fields omitted from the request will be cleared.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>All required fields (<code>firstName</code>, <code>lastName</code>, <code>dob</code>) must be present</li>
<li>Optional fields not included in the request body are set to null</li>
<li>Use PATCH instead if you only want to update specific fields without clearing others</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the patient does not exist in the current tenant</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The ID of the patient record to update. |

### Request Body

**DTO**: `PatientRequestDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "last4Ssn": 1234,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | Yes | Date of birth in YYYY-MM-DD format. Cannot be cleared. |
| `ethnicity` | string | No | OMB ethnicity category. Allowed values: Hispanic or Latino, Not Hispanic or Latino, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `firstName` | string | Yes | Legal first name. Cannot be cleared. |
| `gender` | string | No | Administrative sex. Allowed values: Male, Female, Other, Unknown, Asked but not answered. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `genderIdentity` | string | No | Self-reported gender identity (freeform or coded). Optional; clear with <code>n/a</code>. |
| `last4Ssn` | string | No | Last 4 digits of Social Security Number. Must be exactly 4 numeric digits. Cannot be cleared. |
| `lastName` | string | Yes | Legal last name / surname. Cannot be cleared. |
| `middleName` | string | No | Middle name or initial. Optional; clear with <code>n/a</code>. |
| `preferredLanguage` | string | No | Free form language name. Optional; clear with <code>n/a</code>. |
| `race` | string | No | OMB race category. Allowed values: American Indian or Alaska Native, Asian, Black or African American, Hispanic or Latino, Middle Eastern or North African, Native Hawaiian or other Pacific Islander, White, Other Race, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `sexAtBirth` | string | No | Biological sex at birth. Allowed values: Male, Female, Intersex, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. Enum: `Male`, `Female`, `Intersex`, `Unknown` |

### Response

#### 200

Patient record updated successfully.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 400

Invalid request. Possible causes:<br>• A required field (firstName, lastName, dob) is missing, blank, or set to n/a<br>• Invalid value for gender, race, or ethnicity<br>• Invalid date format<br>• Date validation failures<br>• last4Ssn is not exactly 4 digits

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 404

Not found — patient with the specified ID does not exist in this tenant.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

---

## PATCH /v3/patient/{id}

<h4>Overview</h4>
<p>Updates only the fields provided in the request body. Fields not included in the request are left unchanged.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Only non-null fields in the request body are applied to the patient record</li>
<li>Existing values for omitted fields are preserved</li>
<li>Value-list fields are validated only when provided</li>
</ul>
<h4>Clearing a value</h4>
<p>Sending <code>null</code> (or omitting a field) leaves it unchanged, so an optional field is cleared by sending the default value for its type:</p>
<ul>
<li><b>Text</b> (<code>middleName</code>, <code>genderIdentity</code>, <code>preferredLanguage</code>) — send <code>n/a</code></li>
<li><b>Coded</b> (<code>gender</code>, <code>race</code>, <code>ethnicity</code>, <code>sexAtBirth</code>) — send <code>n/a</code> (or <code>Unknown</code>); the field resets to <code>Unknown</code></li>
<li><code>firstName</code>, <code>lastName</code> and <code>dob</code> are required and cannot be cleared; <code>last4Ssn</code> accepts only 4 digits and cannot be cleared</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the patient does not exist in the current tenant</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The ID of the patient record to partially update. |

### Request Body

**DTO**: `PatientRequestDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "last4Ssn": 1234,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | Yes | Date of birth in YYYY-MM-DD format. Cannot be cleared. |
| `ethnicity` | string | No | OMB ethnicity category. Allowed values: Hispanic or Latino, Not Hispanic or Latino, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `firstName` | string | Yes | Legal first name. Cannot be cleared. |
| `gender` | string | No | Administrative sex. Allowed values: Male, Female, Other, Unknown, Asked but not answered. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `genderIdentity` | string | No | Self-reported gender identity (freeform or coded). Optional; clear with <code>n/a</code>. |
| `last4Ssn` | string | No | Last 4 digits of Social Security Number. Must be exactly 4 numeric digits. Cannot be cleared. |
| `lastName` | string | Yes | Legal last name / surname. Cannot be cleared. |
| `middleName` | string | No | Middle name or initial. Optional; clear with <code>n/a</code>. |
| `preferredLanguage` | string | No | Free form language name. Optional; clear with <code>n/a</code>. |
| `race` | string | No | OMB race category. Allowed values: American Indian or Alaska Native, Asian, Black or African American, Hispanic or Latino, Middle Eastern or North African, Native Hawaiian or other Pacific Islander, White, Other Race, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. |
| `sexAtBirth` | string | No | Biological sex at birth. Allowed values: Male, Female, Intersex, Unknown. Defaults to Unknown if not provided; send <code>n/a</code> to reset to Unknown. Enum: `Male`, `Female`, `Intersex`, `Unknown` |

### Response

#### 200

Patient record partially updated successfully.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 400

Invalid request. Possible causes:<br>• Invalid value for gender, race, or ethnicity<br>• Invalid date format for dob<br>• Date of birth is in the future<br>• last4Ssn is not exactly 4 digits

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

#### 404

Not found — patient with the specified ID does not exist in this tenant.

**DTO**: `PatientResponseDTO`

```json
{
  "dob": "1990-05-15",
  "ethnicity": "Not Hispanic or Latino",
  "firstName": "John",
  "gender": "Male",
  "genderIdentity": "Non-binary",
  "id": 12345,
  "lastName": "Doe",
  "middleName": "Michael",
  "preferredLanguage": "English",
  "race": "White",
  "sexAtBirth": "Male",
  "ssnPreview": "***-**-1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dob` | string(date) | No | Date of birth (YYYY-MM-DD). |
| `ethnicity` | string | No | OMB ethnicity category. |
| `firstName` | string | No | Legal first name. |
| `gender` | string | No | Administrative sex. |
| `genderIdentity` | string | No | Self-reported gender identity. |
| `id` | integer(int64) | No | Person instance ID. |
| `lastName` | string | No | Legal last name / surname. |
| `middleName` | string | No | Middle name or initial. |
| `preferredLanguage` | string | No | Preferred language. |
| `race` | string | No | OMB race category. |
| `sexAtBirth` | string | No | Biological sex at birth. Enum: `Male`, `Female`, `Intersex`, `Unknown` |
| `ssnPreview` | string | No | Masked SSN preview. Only last 4 digits shown. |

---

## DELETE /v3/patient/{id}

<h4>Overview</h4>
<p>Soft-deletes a patient record. The record is marked as deleted but not permanently removed.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>The patient record is soft-deleted and will no longer appear in queries</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the patient does not exist in the current tenant</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The ID of the patient record to delete. |

### Response

#### 200

Patient record deleted successfully.

**DTO**: `OneHealthResponseDTO`

```json
{
  "id": 1,
  "message": "<message>",
  "name": "<name>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No |  |
| `message` | string | No |  |
| `name` | string | No |  |

#### 401

Not authenticated — valid session required.

**DTO**: `OneHealthResponseDTO`

```json
{
  "id": 1,
  "message": "<message>",
  "name": "<name>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No |  |
| `message` | string | No |  |
| `name` | string | No |  |

#### 404

Not found — patient with the specified ID does not exist in this tenant.

**DTO**: `OneHealthResponseDTO`

```json
{
  "id": 1,
  "message": "<message>",
  "name": "<name>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No |  |
| `message` | string | No |  |
| `name` | string | No |  |

---
