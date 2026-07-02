# GET /v3/patient/{patientId}/alias
# POST /v3/patient/{patientId}/alias
# GET /v3/patient/{patientId}/alias/{aliasId}
# PUT /v3/patient/{patientId}/alias/{aliasId}
# PATCH /v3/patient/{patientId}/alias/{aliasId}
# DELETE /v3/patient/{patientId}/alias/{aliasId}

APIs for managing patient name aliases. Supports creating, listing, updating, and deactivating alternate name records (maiden names, nicknames, legal changes, etc.).

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient/{patientId}/alias` | GET | List patient name aliases |
| `/v3/patient/{patientId}/alias` | POST | Add a new name alias to a patient |
| `/v3/patient/{patientId}/alias/{aliasId}` | GET | Get a specific patient name alias |
| `/v3/patient/{patientId}/alias/{aliasId}` | PUT | Fully update a patient name alias |
| `/v3/patient/{patientId}/alias/{aliasId}` | PATCH | Partially update a patient name alias |
| `/v3/patient/{patientId}/alias/{aliasId}` | DELETE | Deactivate a patient name alias |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient/{patientId}/alias

<h4>Overview</h4><p>Returns all active name aliases for a patient.</p><h4>Behavior &amp; Use Cases</h4><ul><li>Returns an array of alias records (possibly empty)</li><li>Only active (non-deleted) aliases are returned</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Response

#### 200

List of patient name aliases.

**DTO**: `PatientAliasListResponseDTO`

```json
{
  "aliases": [
    {
      "alias": "Mari",
      "effectiveFrom": "2015-06-15",
      "effectiveTo": "2020-06-15",
      "firstName": "Maria",
      "fullName": "Maria Gutierrez Santos",
      "id": 12345,
      "lastName": "Gutierrez",
      "type": "maiden"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `aliases` | Array<PatientAliasResponseDTO> | No | List of name alias records. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasListResponseDTO`

```json
{
  "aliases": [
    {
      "alias": "Mari",
      "effectiveFrom": "2015-06-15",
      "effectiveTo": "2020-06-15",
      "firstName": "Maria",
      "fullName": "Maria Gutierrez Santos",
      "id": 12345,
      "lastName": "Gutierrez",
      "type": "maiden"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `aliases` | Array<PatientAliasResponseDTO> | No | List of name alias records. |

#### 404

Patient not found.

**DTO**: `PatientAliasListResponseDTO`

```json
{
  "aliases": [
    {
      "alias": "Mari",
      "effectiveFrom": "2015-06-15",
      "effectiveTo": "2020-06-15",
      "firstName": "Maria",
      "fullName": "Maria Gutierrez Santos",
      "id": 12345,
      "lastName": "Gutierrez",
      "type": "maiden"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `aliases` | Array<PatientAliasResponseDTO> | No | List of name alias records. |

---

## POST /v3/patient/{patientId}/alias

<h4>Overview</h4><p>Creates a new name alias record for a patient. Used to track alternate names such as maiden names, nicknames, legal name changes, or preferred names.</p><h4>Behavior &amp; Use Cases</h4><ul><li>Creates a new alias record — existing aliases are not modified</li><li>At least one of <code>alias</code>, <code>firstName</code>, <code>lastName</code>, or <code>fullName</code> must be provided</li><li><code>type</code> is required and must be one of: <code>maiden</code>, <code>nickname</code>, <code>preferred</code>, <code>previous</code>, <code>legal_change</code>, <code>alias</code></li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient to add an alias to. |

### Request Body

**DTO**: `PatientAliasRequestDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use in YYYY-MM-DD format. |
| `effectiveTo` | string(date) | No | When this name stopped being used in YYYY-MM-DD format. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name for mononyms or cultural formats. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | Yes | Type of name alias. Enum: `maiden`, `nickname`, `preferred`, `previous`, `legal_change`, `alias` |

### Response

#### 201

Alias created successfully.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (type)<br>• No name field provided (alias, firstName, lastName, or fullName)<br>• Invalid type value<br>• effectiveTo is before effectiveFrom

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 404

Patient not found.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

---

## GET /v3/patient/{patientId}/alias/{aliasId}

<h4>Overview</h4><p>Returns a single name alias record for a patient.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the alias ID is not found for this patient</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `aliasId` | integer | Yes | The ID of the alias record. |

### Response

#### 200

Alias record found.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 404

Alias not found — re-fetch the list to find the current record.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

---

## PUT /v3/patient/{patientId}/alias/{aliasId}

<h4>Overview</h4><p>Replaces all fields of an existing alias record. The <code>type</code> field and at least one name field are required.</p><h4>Behavior &amp; Use Cases</h4><ul><li>All required fields must be present in the request</li><li>Fields not provided will be cleared</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the alias does not exist for this patient</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `aliasId` | integer | Yes | The ID of the alias record to update. |

### Request Body

**DTO**: `PatientAliasRequestDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use in YYYY-MM-DD format. |
| `effectiveTo` | string(date) | No | When this name stopped being used in YYYY-MM-DD format. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name for mononyms or cultural formats. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | Yes | Type of name alias. Enum: `maiden`, `nickname`, `preferred`, `previous`, `legal_change`, `alias` |

### Response

#### 200

Alias updated successfully.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (type)<br>• No name field provided (alias, firstName, lastName, or fullName)<br>• Invalid type value<br>• Invalid date format for effectiveFrom or effectiveTo<br>• effectiveTo is before effectiveFrom

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 404

Patient or alias not found.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

---

## PATCH /v3/patient/{patientId}/alias/{aliasId}

<h4>Overview</h4><p>Updates only the fields provided in the request body. Fields not included are left unchanged.</p><h4>Behavior &amp; Use Cases</h4><ul><li>Only non-null fields are applied</li><li>Existing values for omitted fields are preserved</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `aliasId` | integer | Yes | The ID of the alias record to partially update. |

### Request Body

**DTO**: `PatientAliasRequestDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use in YYYY-MM-DD format. |
| `effectiveTo` | string(date) | No | When this name stopped being used in YYYY-MM-DD format. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name for mononyms or cultural formats. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | Yes | Type of name alias. Enum: `maiden`, `nickname`, `preferred`, `previous`, `legal_change`, `alias` |

### Response

#### 200

Alias partially updated successfully.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 400

Invalid request. Possible causes:<br>• Invalid type value<br>• Invalid date format for effectiveFrom or effectiveTo<br>• effectiveTo is before effectiveFrom

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

#### 404

Patient or alias not found.

**DTO**: `PatientAliasResponseDTO`

```json
{
  "alias": "Mari",
  "effectiveFrom": "2015-06-15",
  "effectiveTo": "2020-06-15",
  "firstName": "Maria",
  "fullName": "Maria Gutierrez Santos",
  "id": 12345,
  "lastName": "Gutierrez",
  "type": "maiden"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `alias` | string | No | Alias or nickname. |
| `effectiveFrom` | string(date) | No | When this name was in use. |
| `effectiveTo` | string(date) | No | When this name stopped being used. |
| `firstName` | string | No | Alternate first name. |
| `fullName` | string | No | Full alternate name. |
| `id` | integer(int64) | No | Alias record ID. |
| `lastName` | string | No | Alternate last name. |
| `type` | string | No | Type of name alias. |

---

## DELETE /v3/patient/{patientId}/alias/{aliasId}

<h4>Overview</h4><p>Soft-deletes an alias record. The alias is deactivated but preserved for audit trail.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the alias does not exist</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `aliasId` | integer | Yes | The ID of the alias record to deactivate. |

### Response

#### 200

Alias deactivated successfully.

**DTO**: `PatientAliasDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the alias is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the alias was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated alias. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAliasDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the alias is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the alias was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated alias. |

#### 404

Patient or alias not found.

**DTO**: `PatientAliasDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the alias is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the alias was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated alias. |

---
