# GET /v3/patient/{patientId}/address
# POST /v3/patient/{patientId}/address
# GET /v3/patient/{patientId}/address/{addressId}
# PUT /v3/patient/{patientId}/address/{addressId}
# PATCH /v3/patient/{patientId}/address/{addressId}
# DELETE /v3/patient/{patientId}/address/{addressId}

APIs for managing patient physical addresses. Supports creating, listing, updating, and deactivating address records with automatic address validation.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient/{patientId}/address` | GET | List patient addresses |
| `/v3/patient/{patientId}/address` | POST | Add a new address to a patient |
| `/v3/patient/{patientId}/address/{addressId}` | GET | Get a specific patient address |
| `/v3/patient/{patientId}/address/{addressId}` | PUT | Fully update a patient address |
| `/v3/patient/{patientId}/address/{addressId}` | PATCH | Partially update a patient address |
| `/v3/patient/{patientId}/address/{addressId}` | DELETE | Deactivate a patient address |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient/{patientId}/address

<h4>Overview</h4>
<p>Returns all active addresses for a patient. Supports optional filtering by primary status and use type.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Returns an array of address records (possibly empty)</li>
<li>Only active (non-deleted) addresses are returned</li>
<li>Use <code>?primary=true</code> to get only the primary address</li>
<li>Use <code>?use=home</code> to filter by address use type</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `primary` | boolean | No | Filter by primary status. When true, returns only the primary address. |
| `use` | string | No | Filter by address use type. Enum: `home`, `work`, `billing`, `mailing`, `temporary` |

### Response

#### 200

List of patient addresses.

**DTO**: `PatientAddressListResponseDTO`

```json
{
  "addresses": [
    {
      "city": "Springfield",
      "country": "United States",
      "effectiveFrom": "2024-01-01",
      "effectiveTo": "2024-01-15",
      "id": 12345,
      "line1": 742,
      "line2": "Apt 4B",
      "postalCode": 62704,
      "primary": true,
      "state": "IL",
      "use": "home",
      "validationCandidates": [],
      "validationStatus": "verified"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | Array<PatientAddressResponseDTO> | No | List of patient address records. |

#### 400

Invalid use filter value.

**DTO**: `PatientAddressListResponseDTO`

```json
{
  "addresses": [
    {
      "city": "Springfield",
      "country": "United States",
      "effectiveFrom": "2024-01-01",
      "effectiveTo": "2024-01-15",
      "id": 12345,
      "line1": 742,
      "line2": "Apt 4B",
      "postalCode": 62704,
      "primary": true,
      "state": "IL",
      "use": "home",
      "validationCandidates": [],
      "validationStatus": "verified"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | Array<PatientAddressResponseDTO> | No | List of patient address records. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAddressListResponseDTO`

```json
{
  "addresses": [
    {
      "city": "Springfield",
      "country": "United States",
      "effectiveFrom": "2024-01-01",
      "effectiveTo": "2024-01-15",
      "id": 12345,
      "line1": 742,
      "line2": "Apt 4B",
      "postalCode": 62704,
      "primary": true,
      "state": "IL",
      "use": "home",
      "validationCandidates": [],
      "validationStatus": "verified"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | Array<PatientAddressResponseDTO> | No | List of patient address records. |

#### 404

Patient not found.

**DTO**: `PatientAddressListResponseDTO`

```json
{
  "addresses": [
    {
      "city": "Springfield",
      "country": "United States",
      "effectiveFrom": "2024-01-01",
      "effectiveTo": "2024-01-15",
      "id": 12345,
      "line1": 742,
      "line2": "Apt 4B",
      "postalCode": 62704,
      "primary": true,
      "state": "IL",
      "use": "home",
      "validationCandidates": [],
      "validationStatus": "verified"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addresses` | Array<PatientAddressResponseDTO> | No | List of patient address records. |

---

## POST /v3/patient/{patientId}/address

<h4>Overview</h4>
<p>Appends a new physical address to the patient record. Old addresses are preserved for audit trail. The address is validated against the Google Address Validation API.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Creates a new address record — existing addresses are not modified</li>
<li>If <code>primary</code> is set to <code>true</code>, any existing primary address is automatically unset</li>
<li>If this is the patient's first address and <code>primary</code> is not specified, it is automatically set as primary</li>
<li>Address validation is performed automatically. The <code>validationStatus</code> field indicates the result: <code>verified</code>, <code>unverified</code>, or <code>unknown</code></li>
<li>If validation returns <code>unverified</code>, candidate suggestions may be included in <code>validationCandidates</code></li>
<li>Addresses are never rejected on validation grounds — the record is always created</li>
<li><code>effectiveFrom</code> defaults to the current date if not provided</li>
<li><code>country</code> defaults to <code>United States</code> if not provided</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Required fields: <code>line1</code>, <code>city</code>, <code>state</code>, <code>postalCode</code></li>
<li><code>use</code> defaults to <code>work</code> if not provided</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient to add an address to. |

### Request Body

**DTO**: `PatientAddressRequestDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2025-12-31",
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | Yes | City or municipality. Cannot be cleared. |
| `country` | string | No | Country name. Valid country names available from /v2/public/countries. |
| `effectiveFrom` | string(date) | No | When this address became valid in YYYY-MM-DD format. Defaults to current date. |
| `effectiveTo` | string(date) | No | When this address stopped being valid in YYYY-MM-DD format. Null means current. Send <code>1970-01-01</code> to clear the end date (address treated as currently effective). |
| `line1` | string | Yes | Street address line 1. Cannot be cleared. |
| `line2` | string | No | Apt, suite, unit, floor. Optional; clear with <code>n/a</code>. |
| `postalCode` | string | Yes | ZIP or postal code. Cannot be cleared. |
| `primary` | boolean | No | Mark as primary address. Only one can be primary at a time. Send <code>false</code> to unset (another address must already be primary). |
| `state` | string | Yes | State / province / region code. Cannot be cleared. |
| `use` | string | Yes | Address use type. Enum: `home`, `work`, `billing`, `mailing`, `temporary` |

### Response

#### 201

Address created successfully.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 400

Invalid request. Possible causes:<br>• A required field (line1, city, state, postalCode) is missing, blank, or set to n/a<br>• Invalid use value<br>• Invalid date format for effectiveFrom or effectiveTo<br>• effectiveTo is before effectiveFrom

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 404

Patient not found.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

---

## GET /v3/patient/{patientId}/address/{addressId}

<h4>Overview</h4>
<p>Returns a single address record for a patient.</p>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the address ID is not found for this patient</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `addressId` | integer | Yes | The ID of the address record. |

### Response

#### 200

Address record found.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 404

Address not found — re-fetch the list to find the current record.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

---

## PUT /v3/patient/{patientId}/address/{addressId}

<h4>Overview</h4>
<p>Replaces all fields of an existing address record. All required fields must be provided. Re-validation is triggered if address data has changed or the current status is <code>unknown</code>.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>All required fields must be present in the request</li>
<li>If <code>primary</code> is changed to <code>true</code>, the previous primary address is automatically unset</li>
<li>Address validation is re-triggered when address fields change or the current <code>validationStatus</code> is <code>unknown</code></li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the address does not exist for this patient</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `addressId` | integer | Yes | The ID of the address record to update. |

### Request Body

**DTO**: `PatientAddressRequestDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2025-12-31",
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | Yes | City or municipality. Cannot be cleared. |
| `country` | string | No | Country name. Valid country names available from /v2/public/countries. |
| `effectiveFrom` | string(date) | No | When this address became valid in YYYY-MM-DD format. Defaults to current date. |
| `effectiveTo` | string(date) | No | When this address stopped being valid in YYYY-MM-DD format. Null means current. Send <code>1970-01-01</code> to clear the end date (address treated as currently effective). |
| `line1` | string | Yes | Street address line 1. Cannot be cleared. |
| `line2` | string | No | Apt, suite, unit, floor. Optional; clear with <code>n/a</code>. |
| `postalCode` | string | Yes | ZIP or postal code. Cannot be cleared. |
| `primary` | boolean | No | Mark as primary address. Only one can be primary at a time. Send <code>false</code> to unset (another address must already be primary). |
| `state` | string | Yes | State / province / region code. Cannot be cleared. |
| `use` | string | Yes | Address use type. Enum: `home`, `work`, `billing`, `mailing`, `temporary` |

### Response

#### 200

Address updated successfully.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 400

Invalid request. Possible causes:<br>• A required field (line1, city, state, postalCode) is missing, blank, or set to n/a<br>• Invalid use value<br>• Invalid date format for effectiveFrom or effectiveTo<br>• effectiveTo is before effectiveFrom<br>• Cannot unset primary without setting another address as primary first

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 404

Patient or address not found.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

---

## PATCH /v3/patient/{patientId}/address/{addressId}

<h4>Overview</h4>
<p>Updates only the fields provided in the request body. Fields not included are left unchanged. Re-validation is triggered if address fields change or the current status is <code>unknown</code>.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Only non-null fields are applied</li>
<li>Existing values for omitted fields are preserved</li>
</ul>
<h4>Clearing a value</h4>
<p>Sending <code>null</code> (or omitting a field) leaves it unchanged, so an optional field is cleared by sending the default value for its type:</p>
<ul>
<li><b>Text</b> (<code>line2</code>) — send <code>n/a</code></li>
<li><b>Date</b> (<code>effectiveTo</code>) — send <code>1970-01-01</code> to clear the end date so the address is treated as currently effective</li>
<li><b>Boolean</b> (<code>primary</code>) — send <code>false</code> to unset it (allowed only when another address is already primary)</li>
<li><code>effectiveFrom</code> cannot be emptied; sending it blank resets it to the current date</li>
<li><code>line1</code>, <code>city</code>, <code>state</code> and <code>postalCode</code> are required and cannot be cleared</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `addressId` | integer | Yes | The ID of the address record to partially update. |

### Request Body

**DTO**: `PatientAddressRequestDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2025-12-31",
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | Yes | City or municipality. Cannot be cleared. |
| `country` | string | No | Country name. Valid country names available from /v2/public/countries. |
| `effectiveFrom` | string(date) | No | When this address became valid in YYYY-MM-DD format. Defaults to current date. |
| `effectiveTo` | string(date) | No | When this address stopped being valid in YYYY-MM-DD format. Null means current. Send <code>1970-01-01</code> to clear the end date (address treated as currently effective). |
| `line1` | string | Yes | Street address line 1. Cannot be cleared. |
| `line2` | string | No | Apt, suite, unit, floor. Optional; clear with <code>n/a</code>. |
| `postalCode` | string | Yes | ZIP or postal code. Cannot be cleared. |
| `primary` | boolean | No | Mark as primary address. Only one can be primary at a time. Send <code>false</code> to unset (another address must already be primary). |
| `state` | string | Yes | State / province / region code. Cannot be cleared. |
| `use` | string | Yes | Address use type. Enum: `home`, `work`, `billing`, `mailing`, `temporary` |

### Response

#### 200

Address partially updated successfully.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 400

Invalid request. Possible causes:<br>• Invalid use value<br>• Invalid date format for effectiveFrom or effectiveTo<br>• effectiveTo is before effectiveFrom<br>• Attempting to clear a required field (line1, city, state, postalCode)<br>• Cannot unset primary without setting another address as primary first

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

#### 404

Patient or address not found.

**DTO**: `PatientAddressResponseDTO`

```json
{
  "city": "Springfield",
  "country": "United States",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-01-15",
  "id": 12345,
  "line1": 742,
  "line2": "Apt 4B",
  "postalCode": 62704,
  "primary": true,
  "state": "IL",
  "use": "home",
  "validationCandidates": [],
  "validationStatus": "verified"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | string | No | City or municipality. |
| `country` | string | No | Country name. |
| `effectiveFrom` | string(date) | No | When this address became valid. |
| `effectiveTo` | string(date) | No | When this address stopped being valid. Null means current. |
| `id` | integer(int64) | No | Address record ID. |
| `line1` | string | No | Street address line 1. |
| `line2` | string | No | Apt, suite, unit, floor. |
| `postalCode` | string | No | ZIP or postal code. |
| `primary` | boolean | No | Whether this is the primary address. |
| `state` | string | No | State / province / region code. |
| `use` | string | No | Address use type. |
| `validationCandidates` | Array<object> | No | Candidate addresses suggested by the validation service. Only populated when validationStatus is 'unverified'. |
| `validationStatus` | string | No | Address validation status. Enum: `verified`, `unverified`, `unknown` |

---

## DELETE /v3/patient/{patientId}/address/{addressId}

<h4>Overview</h4>
<p>Soft-deletes an address record. The address is deactivated but preserved for audit trail.</p>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Cannot delete a primary address — first set another address as primary</li>
<li>Returns 404 if the address does not exist</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `addressId` | integer | Yes | The ID of the address record to deactivate. |

### Response

#### 200

Address deactivated successfully.

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

#### 400

Cannot delete primary address — set another as primary first.

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

Patient or address not found.

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
