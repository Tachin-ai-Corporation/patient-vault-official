import { NextResponse } from 'next/server'
import {
  ENDPOINTS,
  API_BASE,
  buildSnippet,
  buildPath,
  exampleValues,
} from '@/lib/api-endpoints'
import { faqs } from '@/components/faq'

// Structured, machine-readable brief for coding agents. One fetch gives an
// agent everything it needs to write working code against Patient Vault: the
// model, auth, error shapes, and a per-endpoint brief with a working curl.
// Generated from the same ENDPOINTS source as the console and /openapi.json,
// so it never drifts. Served at /patient-vault/agent-brief (basePath applies).

export const dynamic = 'force-static'

const EXAMPLE_PATIENT_ID = 'pt_a8f3c2b9d4e7'
const EXAMPLE_KEY = '<YOUR_API_KEY>'

export async function GET() {
  const endpoints = ENDPOINTS.map((ep) => {
    const values = exampleValues(ep, { requiredOnly: ep.key !== 'find' })
    return {
      key: ep.key,
      name: ep.name,
      safeLetter: ep.safeLetter ?? null,
      method: ep.method,
      path: ep.pathTemplate,
      needsPatient: ep.needsPatient,
      description: ep.description,
      fields: ep.fields
        .filter((f) => f.type !== 'file' && !f.derived)
        .map((f) => ({
          name: f.name,
          required: f.required,
          in: f.in,
          type: f.type === 'date' ? 'string (ISO 8601 date)' : 'string',
          enum: f.options?.map((o) => o.value).filter((v) => v !== ''),
          example: f.example ?? f.defaultValue,
          description: f.helpText,
        })),
      examplePath: buildPath(ep, EXAMPLE_PATIENT_ID, values),
      exampleCurl: buildSnippet('curl', ep, EXAMPLE_PATIENT_ID, values, EXAMPLE_KEY),
    }
  })

  const brief = {
    name: 'Patient Vault',
    tagline: 'The patient database for your healthcare app.',
    summary:
      'A canonical, HIPAA-compliant patient record exposed as a simple REST API. Speaks FHIR (R4/R5) on the wire; adds identity, audit, BAA, and per-tenant isolation. The developer-facing patient database service of 1health.',
    baseUrl: API_BASE,
    auth: {
      type: 'bearer',
      header: 'Authorization: Bearer <YOUR_API_KEY>',
      howToGetKey:
        'Create a key at signup (no card required). Headless/programmatic signup is supported for agents — no browser, no human.',
    },
    model: {
      name: 'SAFE',
      description: 'Four primitives cover the entire surface.',
      primitives: [
        { letter: 'S', name: 'Store', description: 'Create a patient. Returns a server-assigned patientId.' },
        { letter: 'A', name: 'Attach', description: 'Attach documents, observations, wearables, structured data, addresses, aliases, identifiers, and contacts.' },
        { letter: 'F', name: 'Find', description: 'Match a patient by demographics (exact or scored candidates).' },
        { letter: 'E', name: 'Echo', description: 'Read the full patient record with all attached data.' },
      ],
    },
    conventions: {
      idShape: 'Patient ids are opaque strings, e.g. "pt_a8f3c2b9d4e7". Always use the server-assigned id.',
      writes: 'Writes return the created/updated resource as JSON.',
      reads: 'Reads on existing patients always succeed, even past the free tier.',
      dates: 'Dates are ISO 8601 (YYYY-MM-DD).',
      contentType: 'POST bodies are application/json.',
    },
    errors: {
      shape: { error: 'string', message: 'string', fields: 'string[] (present on validation errors)' },
      examples: [
        { status: 400, error: 'missing_required_fields', message: 'Required field "dob" is missing.', fields: ['dob'] },
        { status: 401, error: 'unauthorized', message: 'Missing or invalid API key.' },
      ],
    },
    limits: {
      freeTier: 'First 1,000 patients are free forever, no card required.',
      pricing: '$1 per patient per year after 1,000.',
      storage: '1 GB attached data per patient included.',
      files: 'Any type, virus-scanned, 50 MB max each.',
    },
    export: {
      description: 'Export anytime in FHIR R4 or R5 with full provenance.',
      example: `${API_BASE}/patient/${EXAMPLE_PATIENT_ID}/export?format=fhir-r4`,
    },
    endpoints,
    specs: {
      llmsTxt: '/llms.txt',
      openapi: '/openapi.json',
      agentBrief: '/agent-brief',
    },
    faq: faqs.map((f) => ({ q: f.q, a: f.a.replace(/\n+/g, ' ') })),
    links: {
      platform: 'https://dev.1health.io',
      baa: 'https://pv.1health.io/baa',
    },
  }

  return NextResponse.json(brief, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
