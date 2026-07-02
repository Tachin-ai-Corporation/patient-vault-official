# GET /v3/patient/{patientId}/deceased
# POST /v3/patient/{patientId}/deceased
# PUT /v3/patient/{patientId}/deceased
# PATCH /v3/patient/{patientId}/deceased
# DELETE /v3/patient/{patientId}/deceased

APIs for marking a patient deceased and managing the structured death record (date, time, cause, manner, place of death, certifier). Reversal is expressed via DELETE; corrections via PUT/PATCH.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient/{patientId}/deceased` | GET | Get a patient's deceased record |
| `/v3/patient/{patientId}/deceased` | POST | Mark a patient deceased |
| `/v3/patient/{patientId}/deceased` | PUT | Fully update a patient's deceased record |
| `/v3/patient/{patientId}/deceased` | PATCH | Partially update a patient's deceased record |
| `/v3/patient/{patientId}/deceased` | DELETE | Reverse a patient's deceased record |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient/{patientId}/deceased

<h4>Overview</h4><p>Returns the patient's deceased record.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the patient is not marked deceased</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Response

#### 200

Deceased record found.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 404

Patient not found, or patient is not marked deceased.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

---

## POST /v3/patient/{patientId}/deceased

<h4>Overview</h4><p>Creates the patient's deceased record and sets the deceased flag that blocks new appointments and orders. Returns a server-assigned <code>id</code>.</p><h4>Behavior &amp; Use Cases</h4><ul><li><code>deceasedDate</code> is required (YYYY-MM-DD); it cannot be in the future or before the patient's date of birth</li><li><code>manner</code>, when provided, must be one of: Natural, Accident, Homicide, Suicide, Undetermined, Pending</li><li>Not idempotent — returns 409 if the patient is already marked deceased (use PUT/PATCH to correct)</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Request Body

**DTO**: `PatientDeceasedRequestDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `deceasedDate` | string(date) | Yes | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `manner` | string | No | Manner of death — one of: Natural, Accident, Homicide, Suicide, Undetermined, Pending. |
| `notes` | string | No | Additional narrative notes. |
| `placeOfDeath` | string | No | Facility name or location description. |

### Response

#### 201

Deceased record created successfully.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (<code>deceasedDate</code>)<br>• Invalid <code>deceasedDate</code> format, in the future, or before date of birth<br>• Invalid <code>manner</code><br>• Invalid <code>deceasedTime</code> format (expected HH:MM, 24-hour)

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 404

Patient not found.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 409

Patient is already marked deceased.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

---

## PUT /v3/patient/{patientId}/deceased

<h4>Overview</h4><p>Replaces the deceased record. Use when correcting multiple fields at once.</p><h4>Behavior &amp; Use Cases</h4><ul><li><code>deceasedDate</code> is required</li><li>Optional fields that are omitted (or sent as their default value, e.g. <code>n/a</code> for text fields) are reset to their defaults</li><li>Does not reverse the record — the patient stays marked deceased</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the patient is not marked deceased</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Request Body

**DTO**: `PatientDeceasedRequestDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `deceasedDate` | string(date) | Yes | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `manner` | string | No | Manner of death — one of: Natural, Accident, Homicide, Suicide, Undetermined, Pending. |
| `notes` | string | No | Additional narrative notes. |
| `placeOfDeath` | string | No | Facility name or location description. |

### Response

#### 200

Deceased record updated successfully.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (<code>deceasedDate</code>)<br>• Invalid <code>deceasedDate</code> format, in the future, or before date of birth<br>• Invalid <code>manner</code><br>• Invalid <code>deceasedTime</code> format (expected HH:MM, 24-hour)

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 404

Patient not found, or patient is not marked deceased.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

---

## PATCH /v3/patient/{patientId}/deceased

<h4>Overview</h4><p>Updates only the fields provided in the request body. Use to correct a wrong date or other specific fields without reversing the record.</p><h4>Behavior &amp; Use Cases</h4><ul><li>Omitted fields are left unchanged</li><li>To clear an optional field, send its default value (<code>n/a</code> for text fields)</li><li><code>deceasedDate</code> is required and cannot be cleared</li><li>Does not reverse the record — the patient stays marked deceased</li><li>The response echoes only the fields changed by this request (plus <code>id</code>, <code>patientId</code> and <code>createdAt</code>); unchanged fields are omitted</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the patient is not marked deceased</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Request Body

**DTO**: `PatientDeceasedRequestDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `deceasedDate` | string(date) | Yes | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `manner` | string | No | Manner of death — one of: Natural, Accident, Homicide, Suicide, Undetermined, Pending. |
| `notes` | string | No | Additional narrative notes. |
| `placeOfDeath` | string | No | Facility name or location description. |

### Response

#### 200

Deceased record partially updated successfully.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 400

Invalid request. Possible causes:<br>• Invalid <code>deceasedDate</code> format, in the future, or before date of birth<br>• Invalid <code>manner</code><br>• Invalid <code>deceasedTime</code> format (expected HH:MM, 24-hour)

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

#### 404

Patient not found, or patient is not marked deceased.

**DTO**: `PatientDeceasedResponseDTO`

```json
{
  "cause": "I21.9",
  "certifierId": 1234567890,
  "createdAt": "2026-04-26T09:00:00Z",
  "deceasedDate": "2026-04-22",
  "deceasedTime": "14:30",
  "id": 67890,
  "manner": "Natural",
  "notes": "Pronounced at 14:35 by attending physician.",
  "patientId": 12345,
  "placeOfDeath": "Rush University Medical Center"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cause` | string | No | Cause of death — ICD-10 code or freeform text. |
| `certifierId` | string | No | NPI of the certifying provider. |
| `createdAt` | string(date-time) | No | When the record was created (UTC). |
| `deceasedDate` | string(date) | No | Date of death (YYYY-MM-DD). |
| `deceasedTime` | string | No | Time of death (HH:MM, 24-hour UTC). |
| `id` | integer(int64) | No | Deceased record ID. |
| `manner` | string | No | Manner of death. |
| `notes` | string | No | Additional narrative notes. |
| `patientId` | integer(int64) | No | ID of the patient this record is for. |
| `placeOfDeath` | string | No | Facility name or location description. |

---

## DELETE /v3/patient/{patientId}/deceased

<h4>Overview</h4><p>Reverses the record: the patient is no longer marked deceased. The original deceased record and this reversal are preserved in History (the record is soft-deleted, not removed).</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Idempotent — reversing an already-reversed (or never-set) record returns 200</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Response

#### 200

Deceased record reversed successfully.

**DTO**: `PatientDeceasedDeleteResponseDTO`

```json
{
  "id": 67890,
  "reversed": true,
  "reversedAt": "2026-04-28T11:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | ID of the reversed deceased record. Omitted when the patient was not marked deceased. |
| `reversed` | boolean | No | Always true — the patient is no longer marked deceased. |
| `reversedAt` | string(date-time) | No | When the reversal happened (UTC). |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientDeceasedDeleteResponseDTO`

```json
{
  "id": 67890,
  "reversed": true,
  "reversedAt": "2026-04-28T11:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | ID of the reversed deceased record. Omitted when the patient was not marked deceased. |
| `reversed` | boolean | No | Always true — the patient is no longer marked deceased. |
| `reversedAt` | string(date-time) | No | When the reversal happened (UTC). |

#### 404

Patient not found.

**DTO**: `PatientDeceasedDeleteResponseDTO`

```json
{
  "id": 67890,
  "reversed": true,
  "reversedAt": "2026-04-28T11:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | ID of the reversed deceased record. Omitted when the patient was not marked deceased. |
| `reversed` | boolean | No | Always true — the patient is no longer marked deceased. |
| `reversedAt` | string(date-time) | No | When the reversal happened (UTC). |

---
