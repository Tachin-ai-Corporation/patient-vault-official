# GET /v3/patient/{patientId}/identifier
# POST /v3/patient/{patientId}/identifier
# GET /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}
# PUT /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}
# PATCH /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}
# DELETE /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}

APIs for managing a patient's external identifiers. Supports adding, listing, fetching, replacing, amending, and deactivating identifiers that link a patient to records in external systems. Multi-tenant administrators operate across all tenants (reading and writing identifiers regardless of owning tenant); other users are scoped to their own tenant.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient/{patientId}/identifier` | GET | List a patient's external identifiers |
| `/v3/patient/{patientId}/identifier` | POST | Add an external identifier to a patient |
| `/v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}` | GET | Get a single patient external identifier |
| `/v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}` | PUT | Fully update a patient external identifier |
| `/v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}` | PATCH | Partially update a patient external identifier |
| `/v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}` | DELETE | Deactivate a patient external identifier |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient/{patientId}/identifier

<h4>Overview</h4><p>Returns all external identifiers for a patient.</p><h4>Behavior &amp; Use Cases</h4><ul><li>Deactivated identifiers (those whose <code>active_until</code> is in the past) are excluded by default</li><li>Use <code>active=all</code> to include deactivated identifiers, <code>active=false</code> for only deactivated</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `active` | string | No | Filter by activation state: true (default, active only), false (deactivated only), all. Enum: `true`, `false`, `all` Default: `true` |

### Response

#### 200

List of patient external identifiers.

**DTO**: `PatientIdentifierListResponseDTO`

```json
{
  "identifiers": [
    {
      "active_from": "2024-01-01T00:00:00Z",
      "active_until": "2026-05-14T09:00:00Z",
      "external_system_id": 789789789,
      "external_system_name": "Epic",
      "id": 12345,
      "organization_id": 12312312313,
      "organization_name": "org_legacyehr",
      "source_name": "ADT import",
      "type": "mrn",
      "value": "MRN-88821"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifiers` | Array<PatientIdentifierResponseDTO> | No | The patient's external identifier records. |

#### 400

Invalid <code>active</code> value — allowed values are <code>true</code>, <code>false</code>, <code>all</code>.

**DTO**: `PatientIdentifierListResponseDTO`

```json
{
  "identifiers": [
    {
      "active_from": "2024-01-01T00:00:00Z",
      "active_until": "2026-05-14T09:00:00Z",
      "external_system_id": 789789789,
      "external_system_name": "Epic",
      "id": 12345,
      "organization_id": 12312312313,
      "organization_name": "org_legacyehr",
      "source_name": "ADT import",
      "type": "mrn",
      "value": "MRN-88821"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifiers` | Array<PatientIdentifierResponseDTO> | No | The patient's external identifier records. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierListResponseDTO`

```json
{
  "identifiers": [
    {
      "active_from": "2024-01-01T00:00:00Z",
      "active_until": "2026-05-14T09:00:00Z",
      "external_system_id": 789789789,
      "external_system_name": "Epic",
      "id": 12345,
      "organization_id": 12312312313,
      "organization_name": "org_legacyehr",
      "source_name": "ADT import",
      "type": "mrn",
      "value": "MRN-88821"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifiers` | Array<PatientIdentifierResponseDTO> | No | The patient's external identifier records. |

#### 404

Patient not found.

**DTO**: `PatientIdentifierListResponseDTO`

```json
{
  "identifiers": [
    {
      "active_from": "2024-01-01T00:00:00Z",
      "active_until": "2026-05-14T09:00:00Z",
      "external_system_id": 789789789,
      "external_system_name": "Epic",
      "id": 12345,
      "organization_id": 12312312313,
      "organization_name": "org_legacyehr",
      "source_name": "ADT import",
      "type": "mrn",
      "value": "MRN-88821"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifiers` | Array<PatientIdentifierResponseDTO> | No | The patient's external identifier records. |

---

## POST /v3/patient/{patientId}/identifier

<h4>Overview</h4><p>Appends a new external identifier to a patient, recorded as an (authority organization + external system) pair.</p><h4>Behavior &amp; Use Cases</h4><ul><li><code>value</code> is required</li><li>Organization may be given by <code>authority_organization_id</code> or <code>authority_organization_name</code>, but not both; if a name does not match an existing organization a new tenant (and its organization) is provisioned and linked; if neither is provided the caller's context organization is used</li><li>External system may be given by <code>authority_external_system_id</code> or <code>authority_external_system_name</code>, but not both; if a name does not match an existing system one is created and linked; if neither is provided a unique <code>Unknown-&lt;uuid&gt;</code> placeholder system is created per identifier (so multiple placeholder identifiers for the same patient do not collide on the (organization, external system) uniqueness rule)</li><li>Providing both an id and a name for the same authority is rejected with 400</li><li>If an <code>*_id</code> is provided but does not exist, the request fails with 400</li><li>The record is keyed by its (organization, external system) pair — adding the same pair twice is rejected</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Request Body

**DTO**: `PatientIdentifierRequestDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "authority_external_system_id": 789789789,
  "authority_external_system_name": "Epic",
  "authority_organization_id": 12312312313,
  "authority_organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active, as an ISO-8601 instant; stored as UTC. Null = active since record creation. Accepts offset/Z (2024-01-01T00:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated, as an ISO-8601 instant; stored as UTC. Null = currently active. Accepts offset/Z (2026-05-14T09:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `authority_external_system_id` | integer(int64) | No | ID of the external system. Mutually exclusive with authority_external_system_name — providing both is rejected. If neither id nor name is provided, a unique 'Unknown-<uuid>' placeholder system is created per identifier. If an id is provided but does not exist, the request fails. |
| `authority_external_system_name` | string | No | Name of the external information system (e.g. "Epic", "Cerner"). Mutually exclusive with authority_external_system_id — providing both is rejected. If the name does not match an existing system, one is created and linked. |
| `authority_organization_id` | integer(int64) | No | ID of the organization that issued the identifier (the organization that owns the external system). Mutually exclusive with authority_organization_name — providing both is rejected. If neither id nor name is provided, the caller's context organization is used. If an id is provided but does not exist, the request fails. |
| `authority_organization_name` | string | No | Name of the organization that issued the identifier. Mutually exclusive with authority_organization_id — providing both is rejected. If the name does not match an existing organization, a new tenant (and its organization) is provisioned and linked. |
| `source_name` | string | No | Where this identifier came from — e.g. "payer feed", "manual entry", "ADT import". |
| `type` | string | No | Identifier type label — e.g. mrn, member_id, ssn, npi, passport, driver_license, custom. |
| `value` | string | Yes | The identifier value itself — the id of the patient record in the external system. |

### Response

#### 201

Identifier added successfully.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (<code>value</code>)<br>• Both an id and a name were provided for the authority organization or external system<br>• Neither an authority organization id nor name was provided and the current tenant has no context organization<br>• Referenced <code>authority_organization_id</code> or <code>authority_external_system_id</code> does not exist<br>• An identifier with this (organization, external system) pair already exists for this patient<br>• Invalid <code>active_from</code> / <code>active_until</code> timestamp<br>• <code>active_until</code> is before <code>active_from</code>

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 404

Patient not found.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

---

## GET /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}

<h4>Overview</h4><p>Returns one external identifier by its (organization, external system) pair.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if no identifier exists for that pair</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `organizationId` | integer | Yes | The ID of the authority organization. |
| `externalSystemId` | integer | Yes | The ID of the external system. |

### Response

#### 200

Identifier found.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 404

No identifier found for that (organization, external system) pair.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

---

## PUT /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}

<h4>Overview</h4><p>Replaces the mutable fields (<code>value</code>, <code>type</code>, <code>source_name</code>, <code>active_from</code>, <code>active_until</code>) of an identifier. The (organization, external system) pair is fixed by the URL.</p><h4>Behavior &amp; Use Cases</h4><ul><li><code>value</code> is required</li><li>Fields not provided are cleared to defaults</li></ul><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the identifier does not exist</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `organizationId` | integer | Yes | The ID of the authority organization. |
| `externalSystemId` | integer | Yes | The ID of the external system. |

### Request Body

**DTO**: `PatientIdentifierRequestDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "authority_external_system_id": 789789789,
  "authority_external_system_name": "Epic",
  "authority_organization_id": 12312312313,
  "authority_organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active, as an ISO-8601 instant; stored as UTC. Null = active since record creation. Accepts offset/Z (2024-01-01T00:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated, as an ISO-8601 instant; stored as UTC. Null = currently active. Accepts offset/Z (2026-05-14T09:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `authority_external_system_id` | integer(int64) | No | ID of the external system. Mutually exclusive with authority_external_system_name — providing both is rejected. If neither id nor name is provided, a unique 'Unknown-<uuid>' placeholder system is created per identifier. If an id is provided but does not exist, the request fails. |
| `authority_external_system_name` | string | No | Name of the external information system (e.g. "Epic", "Cerner"). Mutually exclusive with authority_external_system_id — providing both is rejected. If the name does not match an existing system, one is created and linked. |
| `authority_organization_id` | integer(int64) | No | ID of the organization that issued the identifier (the organization that owns the external system). Mutually exclusive with authority_organization_name — providing both is rejected. If neither id nor name is provided, the caller's context organization is used. If an id is provided but does not exist, the request fails. |
| `authority_organization_name` | string | No | Name of the organization that issued the identifier. Mutually exclusive with authority_organization_id — providing both is rejected. If the name does not match an existing organization, a new tenant (and its organization) is provisioned and linked. |
| `source_name` | string | No | Where this identifier came from — e.g. "payer feed", "manual entry", "ADT import". |
| `type` | string | No | Identifier type label — e.g. mrn, member_id, ssn, npi, passport, driver_license, custom. |
| `value` | string | Yes | The identifier value itself — the id of the patient record in the external system. |

### Response

#### 200

Identifier updated successfully.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 400

Invalid request. Possible causes:<br>• Missing required field (<code>value</code>)<br>• Invalid <code>active_from</code> / <code>active_until</code> timestamp<br>• <code>active_until</code> is before <code>active_from</code>

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 404

No identifier found for that (organization, external system) pair.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

---

## PATCH /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}

<h4>Overview</h4><p>Updates only the fields provided in the request body. Fields not included are left unchanged. To deactivate, set <code>active_until</code> to the deactivation timestamp.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the identifier does not exist</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `organizationId` | integer | Yes | The ID of the authority organization. |
| `externalSystemId` | integer | Yes | The ID of the external system. |

### Request Body

**DTO**: `PatientIdentifierRequestDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "authority_external_system_id": 789789789,
  "authority_external_system_name": "Epic",
  "authority_organization_id": 12312312313,
  "authority_organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active, as an ISO-8601 instant; stored as UTC. Null = active since record creation. Accepts offset/Z (2024-01-01T00:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated, as an ISO-8601 instant; stored as UTC. Null = currently active. Accepts offset/Z (2026-05-14T09:00:00Z), zoneless (interpreted as UTC), or date-only (UTC start of day). |
| `authority_external_system_id` | integer(int64) | No | ID of the external system. Mutually exclusive with authority_external_system_name — providing both is rejected. If neither id nor name is provided, a unique 'Unknown-<uuid>' placeholder system is created per identifier. If an id is provided but does not exist, the request fails. |
| `authority_external_system_name` | string | No | Name of the external information system (e.g. "Epic", "Cerner"). Mutually exclusive with authority_external_system_id — providing both is rejected. If the name does not match an existing system, one is created and linked. |
| `authority_organization_id` | integer(int64) | No | ID of the organization that issued the identifier (the organization that owns the external system). Mutually exclusive with authority_organization_name — providing both is rejected. If neither id nor name is provided, the caller's context organization is used. If an id is provided but does not exist, the request fails. |
| `authority_organization_name` | string | No | Name of the organization that issued the identifier. Mutually exclusive with authority_organization_id — providing both is rejected. If the name does not match an existing organization, a new tenant (and its organization) is provisioned and linked. |
| `source_name` | string | No | Where this identifier came from — e.g. "payer feed", "manual entry", "ADT import". |
| `type` | string | No | Identifier type label — e.g. mrn, member_id, ssn, npi, passport, driver_license, custom. |
| `value` | string | Yes | The identifier value itself — the id of the patient record in the external system. |

### Response

#### 200

Identifier partially updated successfully.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 400

Invalid request. Possible causes:<br>• Invalid <code>active_from</code> / <code>active_until</code> timestamp<br>• Resulting <code>active_until</code> is before <code>active_from</code>

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

#### 404

No identifier found for that (organization, external system) pair.

**DTO**: `PatientIdentifierResponseDTO`

```json
{
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr",
  "source_name": "ADT import",
  "type": "mrn",
  "value": "MRN-88821"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_from` | string(date-time) | No | When this identifier became active (UTC). Null = active since record creation. |
| `active_until` | string(date-time) | No | When this identifier expires or was deactivated (UTC). Null = currently active. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |
| `source_name` | string | No | Where this identifier came from. |
| `type` | string | No | Identifier type label. |
| `value` | string | No | The identifier value in the external system. |

---

## DELETE /v3/patient/{patientId}/identifier/{organizationId}/{externalSystemId}

<h4>Overview</h4><p>Soft-deletes an identifier: its <code>active_until</code> is set to the current timestamp and the record is marked deleted. The (organization, external system) cross-reference is preserved on the record for history and dedup audit.</p><h4>Important Notes</h4><ul><li>Requires authentication</li><li>Returns 404 if the identifier does not exist</li></ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `organizationId` | integer | Yes | The ID of the authority organization. |
| `externalSystemId` | integer | Yes | The ID of the external system. |

### Response

#### 200

Identifier deactivated successfully.

**DTO**: `PatientIdentifierDeleteResponseDTO`

```json
{
  "active_until": "2026-05-14T09:00:00Z",
  "deletedAt": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_until` | string(date-time) | No | When the identifier was deactivated (UTC). |
| `deletedAt` | string(date-time) | No | Timestamp when the identifier was soft-deleted. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientIdentifierDeleteResponseDTO`

```json
{
  "active_until": "2026-05-14T09:00:00Z",
  "deletedAt": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_until` | string(date-time) | No | When the identifier was deactivated (UTC). |
| `deletedAt` | string(date-time) | No | Timestamp when the identifier was soft-deleted. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |

#### 404

No identifier found for that (organization, external system) pair.

**DTO**: `PatientIdentifierDeleteResponseDTO`

```json
{
  "active_until": "2026-05-14T09:00:00Z",
  "deletedAt": "2026-05-14T09:00:00Z",
  "external_system_id": 789789789,
  "external_system_name": "Epic",
  "id": 12345,
  "organization_id": 12312312313,
  "organization_name": "org_legacyehr"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active_until` | string(date-time) | No | When the identifier was deactivated (UTC). |
| `deletedAt` | string(date-time) | No | Timestamp when the identifier was soft-deleted. |
| `external_system_id` | integer(int64) | No | ID of the external system. |
| `external_system_name` | string | No | Name of the external system. |
| `id` | integer(int64) | No | ID of the identifier (external system mapping) record. |
| `organization_id` | integer(int64) | No | ID of the organization that issued the identifier. |
| `organization_name` | string | No | Name of the organization that issued the identifier. |

---
