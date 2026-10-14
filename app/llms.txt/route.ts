import { NextResponse } from 'next/server'
import { ENDPOINTS, API_BASE } from '@/lib/api-endpoints'
import { faqs } from '@/components/faq'

// Plain-text, zero-JS capability summary for coding agents and LLMs.
// Generated from the same endpoint + FAQ data the UI uses, so it never drifts.
// Served at /patient-vault/llms.txt (basePath applies).

export const dynamic = 'force-static'

function endpointLines(): string {
  return ENDPOINTS.map((ep) => {
    const required = ep.fields.filter((f) => f.required && f.type !== 'file').map((f) => f.name)
    const optional = ep.fields.filter((f) => !f.required && f.type !== 'file' && !f.derived).map((f) => f.name)
    const parts = [`${ep.method} ${ep.pathTemplate} — ${ep.description}`]
    if (required.length) parts.push(`    required: ${required.join(', ')}`)
    if (optional.length) parts.push(`    optional: ${optional.join(', ')}`)
    return parts.join('\n')
  }).join('\n')
}

function faqLines(): string {
  return faqs
    .map((f) => `Q: ${f.q}\nA: ${f.a.replace(/\n+/g, ' ')}`)
    .join('\n\n')
}

export async function GET() {
  const body = `# Patient Vault

> The patient database for your healthcare app. A canonical, HIPAA-compliant
> patient record exposed as a simple API. SOC 2 Type II. BAA executed at production activation.
> Free for your first 1,000 patients, then $1/patient/year.

Patient Vault is the developer-facing patient database service of 1health.
You build the workflow your users came for; Patient Vault holds the patient
data underneath it. It speaks FHIR (R4/R5) on the wire and adds the parts FHIR
leaves to you: identity, audit, BAA, and isolation.

## Base URL
${API_BASE}

## Authentication
Bearer token. Pass your API key in the Authorization header:
  Authorization: Bearer <YOUR_API_KEY>
Create a key at signup (no card required). Headless signup is supported for agents.

## The model: SAFE (four primitives)
- Store  — create a patient (POST /patient), returns a server-assigned patientId
- Attach — attach documents, observations, wearables, structured data, addresses,
           aliases, identifiers, and contacts to a patient
- Find   — match a patient by demographics (exact or scored candidates)
- Echo   — read the full patient record with all attached data

## Endpoints
${endpointLines()}

## Idempotency & errors
- Writes return the created/updated resource. Validation failures return 400 with
  { error, message, fields }. Missing/invalid keys return 401.
- Reads on existing patients always work, even past the free tier.

## Limits & pricing
- Free: first 1,000 patients, forever, no card.
- $1 per patient per year after 1,000. 1 GB attached data per patient included.
- Files: any type, virus-scanned, 50 MB each.

## Data portability
Export anytime in FHIR R4 or R5 with full provenance:
  GET /patient/{id}/export?format=fhir-r4

## Machine-readable specs
- /llms.txt        this file
- /openapi.json    full OpenAPI 3.1 spec (generated from the same definitions)
- /agent-brief     structured JSON brief: model, auth, endpoints, examples

## FAQ
${faqLines()}

## More
Platform: https://dev.1health.io
BAA (public): https://pv.1health.io/baa
`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
