// Single in-app source of truth for the Patient Vault API request shapes.
//
// Every endpoint's method, path, and required/optional fields is defined ONCE
// here. The published /llms.txt, /agent-brief, and /openapi.json (via
// lib/openapi-spec) are all generated from these definitions so the docs never
// drift.
//
// NOTE: the marketing/AEO surface only reads the endpoint *metadata* (fields,
// method, path, descriptions) to render machine-readable specs. It does not
// execute any calls, so the original in-app `execute` handlers (which required
// a local mock vault store) are intentionally omitted here.

export const API_BASE = 'https://api.1health.io/v2'

export interface EndpointField {
  name: string
  label: string
  required: boolean
  type: 'text' | 'date' | 'select' | 'file' | 'textarea'
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string
  example?: string
  helpText?: string
  in: 'body' | 'query'
  // Show this field only when another field's value is one of `equals`.
  // Used to branch the Attach form by attachment kind.
  visibleWhen?: { field: string; equals: string[] }
  // For `file` fields: the name of the sibling field to auto-populate with the
  // browser-detected MIME type (file.type) when a file is selected.
  autofillContentTypeInto?: string
  // Derived fields are populated by the form (e.g. from a selected file) and
  // are NOT rendered as inputs, but ARE included in the request body/snippet
  // when they hold a value.
  derived?: boolean
}

// A field is visible when it has no `visibleWhen` guard, or the guarded field
// currently holds one of the allowed values. Validation, body building, and the
// panel rendering all share this single definition so they never diverge.
export function isFieldVisible(f: EndpointField, values: Record<string, string>): boolean {
  if (!f.visibleWhen) return true
  return f.visibleWhen.equals.includes(values[f.visibleWhen.field] ?? '')
}

// The canonical attachment kinds. Attach's "kind" selector and Document Search's
// type filter both derive from this list so they stay in lockstep.
export const ATTACHMENT_KINDS = ['document', 'observation', 'wearable', 'structured'] as const

export type SnippetLang = 'curl' | 'node' | 'python' | 'ruby'

export interface EndpointDef {
  key: string
  name: string
  safeLetter?: 'S' | 'A' | 'F' | 'E'
  method: 'GET' | 'POST'
  pathTemplate: string // {id} is replaced with the selected patient id
  needsPatient: boolean
  description: string
  fields: EndpointField[]
}

function opt(values: string[]): { value: string; label: string }[] {
  return values.map((v) => ({ value: v, label: v === '' ? '—' : v }))
}

// --- the canonical endpoint definitions -------------------------------------

export const ENDPOINTS: EndpointDef[] = [
  {
    key: 'patient',
    name: 'Patient (Store)',
    safeLetter: 'S',
    method: 'POST',
    pathTemplate: '/patient',
    needsPatient: false,
    description: 'Create a patient. Returns a server-assigned patientId.',
    fields: [
      { name: 'firstName', label: 'First name', required: true, type: 'text', placeholder: 'Maria', example: 'Maria', in: 'body' },
      { name: 'lastName', label: 'Last name', required: true, type: 'text', placeholder: 'Santos', example: 'Santos', in: 'body' },
      { name: 'dob', label: 'Date of birth', required: true, type: 'date', example: '1988-04-12', helpText: 'ISO 8601 (YYYY-MM-DD).', in: 'body' },
      { name: 'sex_at_birth', label: 'Sex at birth', required: true, type: 'select', options: opt(['female', 'male', 'other', 'unknown']), defaultValue: 'female', in: 'body' },
      { name: 'middleName', label: 'Middle name', required: false, type: 'text', placeholder: 'Anne', example: 'Anne', in: 'body' },
      { name: 'prefix', label: 'Prefix', required: false, type: 'text', placeholder: 'Ms.', example: 'Ms.', in: 'body' },
      { name: 'suffix', label: 'Suffix', required: false, type: 'text', placeholder: 'Jr.', example: 'Jr.', in: 'body' },
    ],
  },
  {
    key: 'address',
    name: 'Address',
    method: 'POST',
    pathTemplate: '/patient/{id}/address',
    needsPatient: true,
    description: 'Attach a postal address to a patient.',
    fields: [
      { name: 'line1', label: 'Line 1', required: true, type: 'text', placeholder: '742 Evergreen Terrace', example: '742 Evergreen Terrace', in: 'body' },
      { name: 'city', label: 'City', required: true, type: 'text', placeholder: 'Chicago', example: 'Chicago', in: 'body' },
      { name: 'state', label: 'State', required: true, type: 'text', placeholder: 'IL', example: 'IL', in: 'body' },
      { name: 'postalCode', label: 'Postal code', required: true, type: 'text', placeholder: '60614', example: '60614', in: 'body' },
      { name: 'line2', label: 'Line 2', required: false, type: 'text', placeholder: 'Apt 4B', example: 'Apt 4B', in: 'body' },
      { name: 'country', label: 'Country', required: false, type: 'text', placeholder: 'US', defaultValue: 'US', example: 'US', in: 'body' },
      { name: 'use', label: 'Use', required: false, type: 'select', options: opt(['', 'home', 'work', 'temp']), in: 'body' },
    ],
  },
  {
    key: 'alias',
    name: 'Alias',
    method: 'POST',
    pathTemplate: '/patient/{id}/alias',
    needsPatient: true,
    description: 'Attach an alternate name (nickname, maiden name, AKA).',
    fields: [
      { name: 'firstName', label: 'First name', required: true, type: 'text', placeholder: 'Mari', example: 'Mari', in: 'body' },
      { name: 'lastName', label: 'Last name', required: true, type: 'text', placeholder: 'Santos', example: 'Santos', in: 'body' },
      { name: 'use', label: 'Use', required: false, type: 'select', options: opt(['', 'nickname', 'maiden', 'aka']), in: 'body' },
    ],
  },
  {
    key: 'identifier',
    name: 'Identifier',
    method: 'POST',
    pathTemplate: '/patient/{id}/identifier',
    needsPatient: true,
    description: 'Attach an external identity. Authority is optional; the API uses CONEXT and Unknown defaults when omitted.',
    fields: [
      { name: 'value', label: 'Value', required: true, type: 'text', placeholder: 'MRN-449120', example: 'MRN-449120', in: 'body' },
      { name: 'type', label: 'Type', required: false, type: 'text', placeholder: 'mrn', example: 'mrn', in: 'body' },
      { name: 'authority_organization_id', label: 'Authority organization ID', required: false, type: 'text', placeholder: '12312312313', in: 'body' },
      { name: 'authority_organization_name', label: 'Authority organization name', required: false, type: 'text', placeholder: 'org_legacyehr', in: 'body' },
      { name: 'authority_external_system_id', label: 'Authority external system ID', required: false, type: 'text', placeholder: '789789789', in: 'body' },
      { name: 'authority_external_system_name', label: 'Authority external system name', required: false, type: 'text', placeholder: 'Epic', in: 'body' },
      { name: 'source_name', label: 'Source', required: false, type: 'text', placeholder: 'ADT import', in: 'body' },
      { name: 'active_from', label: 'Active from', required: false, type: 'text', placeholder: '2024-01-01T00:00:00Z', in: 'body' },
      { name: 'active_until', label: 'Active until', required: false, type: 'text', placeholder: '2026-05-14T09:00:00Z', in: 'body' },
    ],
  },
  {
    key: 'contact',
    name: 'Contact',
    method: 'POST',
    pathTemplate: '/patient/{id}/contact',
    needsPatient: true,
    description: 'Attach a phone or email contact point.',
    fields: [
      { name: 'system', label: 'System', required: true, type: 'select', options: opt(['phone', 'email']), defaultValue: 'phone', in: 'body' },
      { name: 'value', label: 'Value', required: true, type: 'text', placeholder: '+1-312-555-0142', example: '+1-312-555-0142', in: 'body' },
      { name: 'use', label: 'Use', required: false, type: 'select', options: opt(['', 'mobile', 'home', 'work']), in: 'body' },
    ],
  },
  {
    key: 'find',
    name: 'Find',
    safeLetter: 'F',
    method: 'GET',
    pathTemplate: '/patient/find',
    needsPatient: false,
    description: 'Match a patient by demographics.',
    fields: [
      { name: 'firstName', label: 'First name', required: false, type: 'text', placeholder: 'Maria', example: 'Maria', in: 'query' },
      { name: 'lastName', label: 'Last name', required: false, type: 'text', placeholder: 'Santos', example: 'Santos', in: 'query' },
      { name: 'dob', label: 'Date of birth', required: false, type: 'date', example: '1988-04-12', in: 'query' },
      { name: 'sexAtBirth', label: 'Sex at birth', required: false, type: 'select', options: opt(['', 'female', 'male', 'intersex', 'unknown']), in: 'query' },
      { name: 'exact', label: 'Exact match', required: false, type: 'select', options: opt(['', 'true', 'false']), helpText: 'true returns only full matches.', in: 'query' },
    ],
  },
  {
    key: 'attach',
    name: 'Attach',
    safeLetter: 'A',
    method: 'POST',
    pathTemplate: '/patient/{id}/document',
    needsPatient: true,
    description: 'Attach a document, observation, wearable, or structured payload to a patient.',
    fields: [
      {
        name: 'type',
        label: 'Attachment kind',
        required: true,
        type: 'select',
        options: opt([...ATTACHMENT_KINDS]),
        defaultValue: 'document',
        helpText: 'The kind of thing you are attaching. Distinct from Content type (the MIME type of an uploaded file).',
        in: 'body',
      },
      // Document kind: real file picker. The browser-detected MIME type
      // auto-populates Content type below.
      {
        name: 'file',
        label: 'File',
        required: false,
        type: 'file',
        helpText: 'Pick a file. Filename, size, and content type are read client-side (mock vault — nothing is uploaded).',
        in: 'body',
        visibleWhen: { field: 'type', equals: ['document'] },
        autofillContentTypeInto: 'contentType',
      },
      {
        name: 'contentType',
        label: 'Content type',
        required: false,
        type: 'text',
        placeholder: 'application/pdf',
        defaultValue: 'application/pdf',
        example: 'application/pdf',
        helpText: 'MIME type. Auto-filled from the file; editable for files the browser cannot detect (e.g. DICOM, which often reports blank or application/octet-stream).',
        in: 'body',
        visibleWhen: { field: 'type', equals: ['document'] },
      },
      // Captured from the selected file; included in the body/snippet, not rendered.
      { name: 'filename', label: 'Filename', required: false, type: 'text', in: 'body', derived: true, visibleWhen: { field: 'type', equals: ['document'] } },
      { name: 'size', label: 'Size', required: false, type: 'text', in: 'body', derived: true, visibleWhen: { field: 'type', equals: ['document'] } },
      // Non-document kinds: JSON payload textarea instead of a file.
      {
        name: 'payload',
        label: 'JSON payload',
        required: false,
        type: 'textarea',
        placeholder: '{\n  "code": "8867-4",\n  "value": 72,\n  "unit": "beats/min"\n}',
        helpText: 'The structured body for this observation, wearable reading, or structured record.',
        in: 'body',
        visibleWhen: { field: 'type', equals: ['observation', 'wearable', 'structured'] },
      },
      { name: 'title', label: 'Title', required: false, type: 'text', placeholder: 'Intake form', example: 'Intake form', in: 'body' },
    ],
  },
  {
    key: 'document-search',
    name: 'Document Search',
    method: 'GET',
    pathTemplate: '/patient/{id}/document',
    needsPatient: true,
    description: 'List documents attached to a patient, optionally filtered by kind.',
    fields: [
      {
        name: 'type',
        label: 'Kind',
        required: false,
        type: 'select',
        options: [{ value: '', label: 'Any' }, ...ATTACHMENT_KINDS.map((k) => ({ value: k, label: k }))],
        helpText: 'Filter by attachment kind. "Any" returns all kinds.',
        in: 'query',
      },
      { name: 'createdAfter', label: 'Created after', required: false, type: 'date', helpText: 'Only documents created on or after this date.', in: 'query' },
      { name: 'filename', label: 'Filename contains', required: false, type: 'text', placeholder: 'intake', helpText: 'Match documents whose title/filename contains this text.', in: 'query' },
    ],
  },
  {
    key: 'echo',
    name: 'Echo',
    safeLetter: 'E',
    method: 'GET',
    pathTemplate: '/patient/{id}',
    needsPatient: true,
    description: 'Read the full patient record with all attached data.',
    fields: [],
  },
]

export function getEndpoint(key: string, endpoints: EndpointDef[] = ENDPOINTS): EndpointDef | undefined {
  return endpoints.find((e) => e.key === key)
}

// Build a representative set of example values for an endpoint, drawn from each
// field's example/default. Used to render the tutorial snippets.
export function exampleValues(ep: EndpointDef, opts: { requiredOnly?: boolean } = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of ep.fields) {
    if (opts.requiredOnly && !f.required) continue
    const v = f.example ?? f.defaultValue
    if (v != null && v !== '') out[f.name] = v
  }
  return out
}

export interface TutorialStep {
  stepNumber: number
  safeLetter: string
  key: string
  title: string
  description: string
  endpoint: EndpointDef
  exampleId: string
  values: Record<string, string>
}

// The SAFE tutorial (Store / Attach / Find / Echo) reads from the same endpoint
// definitions, so the reference cards never drift from the published specs.
const SAFE_TITLES: Record<string, { title: string; description: string }> = {
  S: { title: 'STORE: Create a patient', description: 'POST to /patient. Returns a server-assigned patientId.' },
  A: { title: 'ATTACH: Attach a document', description: 'POST to /patient/{id}/document. Same pattern for address, alias, identifier, and contact.' },
  F: { title: 'FIND: Find the patient', description: 'GET /patient/find with a purpose and demographics. Returns scored candidates.' },
  E: { title: 'ECHO: Echo the full record', description: 'GET /patient/{id}. Returns the full record with all attached data.' },
}
const SAFE_ORDER: ('S' | 'A' | 'F' | 'E')[] = ['S', 'A', 'F', 'E']

export function deriveTutorialSteps(endpoints: EndpointDef[] = ENDPOINTS): TutorialStep[] {
  const exampleId = 'pt_a8f3c2b9d4e7'
  const byLetter = new Map<string, EndpointDef>()
  for (const ep of endpoints) {
    if (ep.safeLetter) byLetter.set(ep.safeLetter, ep)
  }
  const steps: TutorialStep[] = []
  SAFE_ORDER.forEach((letter, i) => {
    const ep = byLetter.get(letter)
    if (!ep) return
    const meta = SAFE_TITLES[letter] ?? { title: ep.name, description: ep.description }
    steps.push({
      stepNumber: i + 1,
      safeLetter: letter,
      key: ep.key,
      title: meta.title,
      description: meta.description,
      endpoint: ep,
      exampleId,
      values: exampleValues(ep, { requiredOnly: letter !== 'F' }),
    })
  })
  return steps
}

// ---- path + request assembly ------------------------------------------------

export function buildPath(ep: EndpointDef, patientId: string, values: Record<string, string>): string {
  let path = ep.pathTemplate.replace('{id}', patientId || '{id}')
  if (ep.method === 'GET') {
    const params = new URLSearchParams()
    for (const f of ep.fields) {
      if (f.in !== 'query') continue
      if (!isFieldVisible(f, values)) continue
      const val = values[f.name]
      if (val && val.trim() !== '') params.append(f.name, val)
    }
    const qs = params.toString()
    if (qs) path += `?${qs}`
  }
  return path
}

function buildBody(ep: EndpointDef, values: Record<string, string>): Record<string, string> {
  const body: Record<string, string> = {}
  for (const f of ep.fields) {
    if (f.in !== 'body') continue
    if (f.type === 'file') continue // the file picker is a control, not a body value
    if (!isFieldVisible(f, values)) continue
    const val = values[f.name]
    if (val && val.trim() !== '') body[f.name] = val
  }
  return body
}

// ---- snippet generation (all derived from the request shape) ----------------

function indentBlock(str: string, pad: string): string {
  return str
    .split('\n')
    .map((line, i) => (i === 0 ? line : `${pad}${line}`))
    .join('\n')
}

function buildCurl(ep: EndpointDef, url: string, values: Record<string, string>, apiKey: string): string {
  const auth = `-H "Authorization: Bearer ${apiKey}"`
  if (ep.method === 'GET') return `curl "${url}" \\\n  ${auth}`
  const body = indentBlock(JSON.stringify(buildBody(ep, values), null, 2), '  ')
  return `curl -X POST "${url}" \\\n  ${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`
}

function buildNode(ep: EndpointDef, url: string, values: Record<string, string>, apiKey: string): string {
  const headers = [`'Authorization': 'Bearer ${apiKey}'`]
  if (ep.method === 'POST') headers.push(`'Content-Type': 'application/json'`)
  const opts = [`  method: '${ep.method}',`, `  headers: {\n    ${headers.join(',\n    ')},\n  },`]
  if (ep.method === 'POST') {
    opts.push(`  body: JSON.stringify(${indentBlock(JSON.stringify(buildBody(ep, values), null, 2), '  ')}),`)
  }
  return `const response = await fetch('${url}', {\n${opts.join('\n')}\n});`
}

function buildPython(ep: EndpointDef, url: string, values: Record<string, string>, apiKey: string): string {
  const fn = ep.method === 'GET' ? 'get' : 'post'
  const lines = [`import requests`, ``, `response = requests.${fn}(`, `    '${url}',`]
  const headers = [`'Authorization': 'Bearer ${apiKey}'`]
  if (ep.method === 'POST') headers.push(`'Content-Type': 'application/json'`)
  lines.push(`    headers={\n        ${headers.join(',\n        ')},\n    },`)
  if (ep.method === 'POST') {
    const body = buildBody(ep, values)
    const pyBody = Object.entries(body)
      .map(([k, v]) => `        '${k}': '${v}'`)
      .join(',\n')
    lines.push(`    json={\n${pyBody}${pyBody ? ',' : ''}\n    },`)
  }
  lines.push(`)`)
  return lines.join('\n')
}

function buildRuby(ep: EndpointDef, url: string, values: Record<string, string>, apiKey: string): string {
  const klass = ep.method === 'GET' ? 'Get' : 'Post'
  const lines = [
    `require 'net/http'`,
    `require 'json'`,
    ``,
    `uri = URI('${url}')`,
    `http = Net::HTTP.new(uri.host, uri.port)`,
    `http.use_ssl = true`,
    ``,
    `request = Net::HTTP::${klass}.new(uri)`,
    `request['Authorization'] = 'Bearer ${apiKey}'`,
  ]
  if (ep.method === 'POST') {
    lines.push(`request['Content-Type'] = 'application/json'`)
    const body = buildBody(ep, values)
    const rbBody = Object.entries(body)
      .map(([k, v]) => `${k}: '${v}'`)
      .join(', ')
    lines.push(`request.body = { ${rbBody} }.to_json`)
  }
  lines.push(``, `response = http.request(request)`)
  return lines.join('\n')
}

// Generate a snippet in any supported language for a given endpoint + values.
// `apiBase` lets callers target the active environment's host (demo vs prod).
export function buildSnippet(
  lang: SnippetLang,
  ep: EndpointDef,
  patientId: string,
  values: Record<string, string>,
  apiKey: string,
  apiBase: string = API_BASE
): string {
  const url = `${apiBase}${buildPath(ep, patientId, values)}`
  switch (lang) {
    case 'node':
      return buildNode(ep, url, values, apiKey)
    case 'python':
      return buildPython(ep, url, values, apiKey)
    case 'ruby':
      return buildRuby(ep, url, values, apiKey)
    default:
      return buildCurl(ep, url, values, apiKey)
  }
}
