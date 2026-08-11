# GET /v3/health-grid/patient/{id}

Retrieve the Health Grid representation associated with a Patient Vault patient.

**Authentication**: Bearer JWT required.

---

## GET /v3/health-grid/patient/{id}

Returns the connected longitudinal health record for a patient.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Patient identifier. |

### Response

#### 200

The patient Health Grid record available to the authenticated organization.
