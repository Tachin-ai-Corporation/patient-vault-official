# GET /v3/patient/find

Find patient records by demographic criteria. Although this route is nested under patient, it belongs to the FIND resource group.

**Authentication**: Bearer JWT required.

---

## GET /v3/patient/find

Returns candidate patient records matching the supplied demographics.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `firstName` | string | No | Patient first name. |
| `lastName` | string | No | Patient last name. |
| `dob` | string(date) | No | Date of birth in `YYYY-MM-DD` format. |
| `sexAtBirth` | string | No | Sex at birth. |
| `exact` | boolean | No | When `true`, returns only full matches. |

### Response

#### 200

A scored list of candidate patient records. An empty list means no records matched.
