// The published OpenAPI 3.1 spec is GENERATED from the single in-app source of
// truth in lib/api-endpoints.ts, so the docs served at /openapi.json never
// drift from the published specs.
//
// No vendor extensions (x-*) are emitted: this is a plain spec built from the
// same EndpointDef list. In the production console this published spec would
// instead come from the live platform OpenAPI/Swagger or MCP; that is out of
// scope here.

import { ENDPOINTS, API_BASE, type EndpointDef, type EndpointField } from '@/lib/api-endpoints'

export { API_BASE }

type JsonSchema = {
  type: string
  description?: string
  enum?: string[]
  default?: string
  example?: string
  format?: string
}

function fieldToSchema(f: EndpointField): JsonSchema {
  const schema: JsonSchema = { type: 'string' }
  if (f.helpText) schema.description = f.helpText
  if (f.type === 'date') schema.format = 'date'
  if (f.options) schema.enum = f.options.map((o) => o.value).filter((v) => v !== '')
  if (f.defaultValue) schema.default = f.defaultValue
  if (f.example) schema.example = f.example
  return schema
}

function operationFor(ep: EndpointDef) {
  const op: Record<string, unknown> = {
    operationId: ep.key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    summary: ep.description,
  }

  const parameters: unknown[] = []
  if (ep.needsPatient) {
    parameters.push({ name: 'id', in: 'path', required: true, description: 'Patient id.', schema: { type: 'string' } })
  }
  for (const f of ep.fields) {
    if (f.in !== 'query') continue
    if (f.type === 'file') continue
    parameters.push({ name: f.name, in: 'query', required: f.required, schema: fieldToSchema(f) })
  }
  if (parameters.length) op.parameters = parameters

  const bodyFields = ep.fields.filter((f) => f.in === 'body' && f.type !== 'file')
  if (bodyFields.length) {
    const properties: Record<string, JsonSchema> = {}
    const required: string[] = []
    for (const f of bodyFields) {
      properties[f.name] = fieldToSchema(f)
      if (f.required) required.push(f.name)
    }
    op.requestBody = {
      required: required.length > 0,
      content: { 'application/json': { schema: { type: 'object', required, properties } } },
    }
  }

  return op
}

// Assemble the OpenAPI paths object from the shared endpoint definitions.
function buildPaths() {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const ep of ENDPOINTS) {
    const verb = ep.method.toLowerCase()
    if (!paths[ep.pathTemplate]) paths[ep.pathTemplate] = {}
    paths[ep.pathTemplate][verb] = operationFor(ep)
  }
  return paths
}

export const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Patient Vault',
    version: '2.2',
    description:
      'The patient database for your healthcare app. A canonical, HIPAA-compliant patient record exposed as a simple REST API, built on four primitives — Store, Attach, Find, Echo (SAFE). SOC 2 Type II; BAA executed at production activation. Free for your first 1,000 patients.',
    contact: {
      name: '1health Developer Relations',
      url: 'https://dev.1health.io',
      email: 'devrel@1health.io',
    },
  },
  servers: [{ url: API_BASE, description: 'Production' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API Key' },
    },
  },
  paths: buildPaths(),
}
