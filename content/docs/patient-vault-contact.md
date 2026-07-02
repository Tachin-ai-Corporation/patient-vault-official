# GET /v3/patient/{patientId}/contact
# POST /v3/patient/{patientId}/contact
# GET /v3/patient/{patientId}/contact/{contactId}
# PUT /v3/patient/{patientId}/contact/{contactId}
# PATCH /v3/patient/{patientId}/contact/{contactId}
# DELETE /v3/patient/{patientId}/contact/{contactId}

APIs for managing patient contact points (email, phone, fax). Supports creating, listing, updating, and deactivating contact points. The collection is append-only — old contact points are retained for audit and outreach history.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/patient/{patientId}/contact` | GET | List patient contact points |
| `/v3/patient/{patientId}/contact` | POST | Add a new contact point to a patient |
| `/v3/patient/{patientId}/contact/{contactId}` | GET | Get a specific patient contact point |
| `/v3/patient/{patientId}/contact/{contactId}` | PUT | Fully update a patient contact point |
| `/v3/patient/{patientId}/contact/{contactId}` | PATCH | Partially update a patient contact point |
| `/v3/patient/{patientId}/contact/{contactId}` | DELETE | Deactivate a patient contact point |

**Authentication**: Bearer JWT required for all endpoints.

---

## GET /v3/patient/{patientId}/contact

<h4>Overview</h4>
<p>Returns all active contact points for a patient. Supports optional filtering by type and primary status.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Returns an array of contact points (possibly empty)</li>
<li>Only active (non-deactivated) contact points are returned</li>
<li>Use <code>?type=mobile</code> to filter by type</li>
<li>Use <code>?primary=true</code> to return only primary contact points</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by contact point type. Enum: `email`, `mobile`, `home`, `work`, `fax`, `other` |
| `primary` | boolean | No | When true, returns only primary contact points. |

### Response

#### 200

List of patient contact points.

**DTO**: `PatientContactListResponseDTO`

```json
{
  "contacts": [
    {
      "id": 67890,
      "isPrimary": true,
      "label": "Work",
      "notificationsEnabled": true,
      "region": "us",
      "type": "mobile",
      "value": "+14155550100"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Array<PatientContactResponseDTO> | No | List of contact point records. |

#### 400

Invalid type filter value.

**DTO**: `PatientContactListResponseDTO`

```json
{
  "contacts": [
    {
      "id": 67890,
      "isPrimary": true,
      "label": "Work",
      "notificationsEnabled": true,
      "region": "us",
      "type": "mobile",
      "value": "+14155550100"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Array<PatientContactResponseDTO> | No | List of contact point records. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactListResponseDTO`

```json
{
  "contacts": [
    {
      "id": 67890,
      "isPrimary": true,
      "label": "Work",
      "notificationsEnabled": true,
      "region": "us",
      "type": "mobile",
      "value": "+14155550100"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Array<PatientContactResponseDTO> | No | List of contact point records. |

#### 404

Patient not found.

**DTO**: `PatientContactListResponseDTO`

```json
{
  "contacts": [
    {
      "id": 67890,
      "isPrimary": true,
      "label": "Work",
      "notificationsEnabled": true,
      "region": "us",
      "type": "mobile",
      "value": "+14155550100"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Array<PatientContactResponseDTO> | No | List of contact point records. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactListResponseDTO`

```json
{
  "contacts": [
    {
      "id": 67890,
      "isPrimary": true,
      "label": "Work",
      "notificationsEnabled": true,
      "region": "us",
      "type": "mobile",
      "value": "+14155550100"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contacts` | Array<PatientContactResponseDTO> | No | List of contact point records. |

---

## POST /v3/patient/{patientId}/contact

<h4>Overview</h4>
<p>Appends a new contact point to the patient record. Old contact points are preserved for audit trail — each call creates a new record with its own ID.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Creates a new contact point — existing contact points are not modified</li>
<li><b>type</b> is one of: <code>email</code>, <code>mobile</code>, <code>home</code>, <code>work</code>, <code>fax</code>, <code>other</code></li>
<li><b>label</b> is a free-text usage label, e.g. <code>Work</code>, <code>Home</code></li>
<li>Setting <b>isPrimary</b> to <code>true</code> marks this as the preferred contact point for its type; any existing primary of the same type is automatically unset (its <code>isPrimary</code> becomes <code>false</code>) and retained</li>
<li>If <b>isPrimary</b> is omitted, the first contact point of a given type is automatically set as primary; subsequent contact points of that type default to non-primary</li>
<li>At most one contact point per type may be primary</li>
</ul>
<h4>Field Handling</h4>
<ul>
<li>Optional fields (<code>label</code>, <code>region</code>) omitted or sent blank are stored as their default value</li>
<li><code>notificationsEnabled</code> defaults to <code>false</code> when omitted</li>
<li><code>region</code> is a hint stored alongside the value; it is ignored for non-phone types</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Required fields: <code>type</code>, <code>value</code> (neither may be blank)</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient to add a contact point to. |

### Request Body

**DTO**: `PatientContactRequestDTO`

```json
{
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isPrimary` | boolean | No | Marks this as the preferred contact point for its type. Only one contact point per type can be primary at a time. Send <code>false</code> to make it non-primary. |
| `label` | string | No | Free-text label for this contact point. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. Defaults to <code>false</code>. |
| `region` | string | No | Region hint for phone normalization, e.g. "us". Ignored for non-phone types. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `type` | string | Yes | The type of contact point. Cannot be cleared. Enum: `email`, `mobile`, `home`, `work`, `fax`, `other` |
| `value` | string | Yes | The address or number for this contact point. Cannot be cleared. |

### Response

#### 201

Contact point created successfully.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 400

Invalid request. Possible causes:<br>• A required field (type, value) is missing, blank, or set to n/a<br>• Invalid type value

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 404

Patient not found.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

---

## GET /v3/patient/{patientId}/contact/{contactId}

<h4>Overview</h4>
<p>Returns a single contact point for a patient.</p>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the contact point ID is not found for this patient</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `contactId` | integer | Yes | The ID of the contact point record. |

### Response

#### 200

Contact point found.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 404

Contact point not found.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

---

## PUT /v3/patient/{patientId}/contact/{contactId}

<h4>Overview</h4>
<p>Replaces all fields of an existing contact point. Required fields must be provided; optional fields absent or sent blank are reset to their default value.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>All required fields (<code>type</code>, <code>value</code>) must be present and non-blank</li>
<li>Optional fields (<code>label</code>, <code>region</code>) omitted or blank are reset to default; <code>notificationsEnabled</code> omitted is treated as <code>false</code></li>
<li>Omitting <b>isPrimary</b> preserves the current primary status; sending <code>false</code> makes the contact point non-primary</li>
<li>If <b>isPrimary</b> is set to <code>true</code>, the previous primary of the same type is automatically unset (its <code>isPrimary</code> becomes <code>false</code>)</li>
<li>At most one contact point per type may be primary</li>
</ul>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>Returns 404 if the contact point does not exist for this patient</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `contactId` | integer | Yes | The ID of the contact point to update. |

### Request Body

**DTO**: `PatientContactRequestDTO`

```json
{
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isPrimary` | boolean | No | Marks this as the preferred contact point for its type. Only one contact point per type can be primary at a time. Send <code>false</code> to make it non-primary. |
| `label` | string | No | Free-text label for this contact point. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. Defaults to <code>false</code>. |
| `region` | string | No | Region hint for phone normalization, e.g. "us". Ignored for non-phone types. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `type` | string | Yes | The type of contact point. Cannot be cleared. Enum: `email`, `mobile`, `home`, `work`, `fax`, `other` |
| `value` | string | Yes | The address or number for this contact point. Cannot be cleared. |

### Response

#### 200

Contact point updated successfully.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 400

Invalid request. Possible causes:<br>• A required field (type, value) is missing, blank, or set to n/a<br>• Invalid type value

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 404

Patient or contact point not found.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

---

## PATCH /v3/patient/{patientId}/contact/{contactId}

<h4>Overview</h4>
<p>Updates only the fields sent in the request body. Fields that are omitted <i>or</i> sent as <code>null</code> are left unchanged.</p>
<h4>Behavior &amp; Use Cases</h4>
<ul>
<li>Omitted or <code>null</code> fields keep their existing values</li>
<li>An optional field (<code>label</code>, <code>region</code>) sent as a blank string is cleared and reset to its default value</li>
<li>Required fields (<code>type</code>, <code>value</code>) cannot be blanked — sending them empty returns <code>400</code></li>
<li>Setting <b>isPrimary</b> to <code>true</code> unsets the previous primary of the same type (its <code>isPrimary</code> becomes <code>false</code>)</li>
</ul>
<h4>Clearing a value</h4>
<p>Sending <code>null</code> (or omitting a field) leaves it unchanged, so an optional field is cleared by sending the default value for its type:</p>
<ul>
<li><b>Text</b> (<code>label</code>, <code>region</code>) — send <code>n/a</code> (a blank string is also accepted and normalized to <code>n/a</code>)</li>
<li><b>Boolean</b> (<code>notificationsEnabled</code>) — send <code>false</code></li>
<li><b>Boolean</b> (<code>isPrimary</code>) — send <code>false</code> to make the contact point non-primary</li>
<li>Required fields (<code>type</code>, <code>value</code>) cannot be cleared</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `contactId` | integer | Yes | The ID of the contact point to partially update. |

### Request Body

**DTO**: `PatientContactRequestDTO`

```json
{
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isPrimary` | boolean | No | Marks this as the preferred contact point for its type. Only one contact point per type can be primary at a time. Send <code>false</code> to make it non-primary. |
| `label` | string | No | Free-text label for this contact point. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. Defaults to <code>false</code>. |
| `region` | string | No | Region hint for phone normalization, e.g. "us". Ignored for non-phone types. Optional; clear with <code>n/a</code> (a blank value is also normalized to <code>n/a</code>). |
| `type` | string | Yes | The type of contact point. Cannot be cleared. Enum: `email`, `mobile`, `home`, `work`, `fax`, `other` |
| `value` | string | Yes | The address or number for this contact point. Cannot be cleared. |

### Response

#### 200

Contact point partially updated successfully.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 400

Invalid request. Possible causes:<br>• Invalid type value

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 404

Patient or contact point not found.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactResponseDTO`

```json
{
  "id": 67890,
  "isPrimary": true,
  "label": "Work",
  "notificationsEnabled": true,
  "region": "us",
  "type": "mobile",
  "value": "+14155550100"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer(int64) | No | Contact point record ID. |
| `isPrimary` | boolean | No | Whether this is the preferred contact point for its type. |
| `label` | string | No | Free-text label for this contact point. |
| `notificationsEnabled` | boolean | No | Whether this contact point may receive notifications. |
| `region` | string | No | Region hint for phone normalization. |
| `type` | string | No | The type of contact point. |
| `value` | string | No | The address or number for this contact point. |

---

## DELETE /v3/patient/{patientId}/contact/{contactId}

<h4>Overview</h4>
<p>Soft-deletes a contact point. The record is deactivated but preserved for outreach history.</p>
<h4>Important Notes</h4>
<ul>
<li>Requires authentication</li>
<li>A primary contact point cannot be deleted — first promote another contact point of the same type to primary (<code>isPrimary=true</code>), then delete this one</li>
<li>Returns 404 if the contact point does not exist for this patient</li>
</ul>

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. |
| `contactId` | integer | Yes | The ID of the contact point to deactivate. |

### Response

#### 200

Contact point deactivated successfully.

**DTO**: `PatientContactDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the contact point is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the contact point was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated contact point. |

#### 400

Cannot delete a primary contact point — promote another of the same type first.

**DTO**: `PatientContactDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the contact point is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the contact point was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated contact point. |

#### 401

Not authenticated — valid session required.

**DTO**: `PatientContactDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the contact point is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the contact point was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated contact point. |

#### 404

Patient or contact point not found.

**DTO**: `PatientContactDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the contact point is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the contact point was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated contact point. |

#### 500

Unexpected error while processing the contact point request.

**DTO**: `PatientContactDeleteResponseDTO`

```json
{
  "active": false,
  "deletedAt": "2026-05-14T09:00:00",
  "id": 67890
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `active` | boolean | No | Whether the contact point is active. |
| `deletedAt` | string(date-time) | No | Timestamp when the contact point was deactivated. |
| `id` | integer(int64) | No | The ID of the deactivated contact point. |

---
