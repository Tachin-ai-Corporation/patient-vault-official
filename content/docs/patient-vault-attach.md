# POST /v3/patient/{id}/document
# GET /v3/patient/{id}/document

Attach clinical files and structured payloads to an existing patient, or list attachments already associated with that patient.

**Authentication**: Bearer JWT required for all endpoints.

---

## POST /v3/patient/{id}/document

Attaches a document, observation, wearable payload, or structured record to a patient.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Patient identifier. |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Attachment kind: `document`, `observation`, `wearable`, or `structured`. |
| `content` | string | Yes | Attachment content or encoded payload. |
| `contentType` | string | No | MIME type for file-backed content. |
| `title` | string | No | Human-readable attachment title. |

### Response

#### 200

Attachment created successfully.

---

## GET /v3/patient/{id}/document

Lists attachments for a patient. Use `type` to filter by attachment kind.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | No | One of `document`, `observation`, `wearable`, or `structured`. |

### Response

#### 200

A list of attachments associated with the patient.
