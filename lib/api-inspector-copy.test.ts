import assert from 'node:assert/strict'
import test from 'node:test'

// Node's strip-types test runner requires the runtime `.ts` extension.
import {
  buildCurl,
  buildRequestJson,
  buildResponseJson,
  versionedPath,
  type CopyableApiCall,
// @ts-expect-error TypeScript compilation intentionally omits that extension mode.
} from './api-inspector-copy.ts'

const baseCall: CopyableApiCall = {
  method: 'GET',
  baseUrl: 'https://1health.demo.1health.io',
  path: '/api/v3/patient?limit=1',
  responseBody: { data: [{ id: 'patient_1' }] },
}

test('cURL uses connected base URL when UI environment disagrees', () => {
  const call = {
    ...baseCall,
    // Deliberately contradictory UI-only state. buildCurl must not consult it.
    environment: 'production',
  }
  const command = buildCurl(call)

  assert.match(command, /https:\/\/1health\.demo\.1health\.io\/api\/v3\/patient\?limit=1/)
  assert.doesNotMatch(command, /api\.1health\.io/)
  assert.match(command, /Authorization: Bearer \$PV_API_KEY/)
  assert.match(command, /Content-Type: application\/json/)
})

test('write cURL includes method, escaped JSON body, and public v3 suffix', () => {
  const command = buildCurl({
    ...baseCall,
    method: 'POST',
    path: '/api/v3/patient',
    requestBody: { firstName: "D'Arcy", active: true },
  })

  assert.match(command, /^curl --request POST/)
  assert.match(command, /\/api\/v3\/patient'/)
  assert.match(command, /--data/)
  assert.match(command, /D'"'"'Arcy/)
})

test('request and response JSON copy exactly their pretty-printed payloads', () => {
  const call: CopyableApiCall = {
    ...baseCall,
    method: 'POST',
    requestBody: { firstName: 'Ada' },
    responseBody: { id: 'patient_1', firstName: 'Ada' },
  }

  const request = buildRequestJson(call)
  const response = buildResponseJson(call)

  assert.deepEqual(JSON.parse(request), call.requestBody)
  assert.deepEqual(JSON.parse(response), call.responseBody)
  assert.match(request, /\n  "firstName"/)
  assert.match(response, /\n  "id"/)
})

test('versionedPath supports platform v2 and patient v3 routes', () => {
  assert.equal(versionedPath('/api/v3/patient/123'), '/v3/patient/123')
  assert.equal(
    versionedPath('/api/v2/tenant/sys-config?Tenant%20IDs=55911'),
    '/v2/tenant/sys-config?Tenant%20IDs=55911',
  )
  assert.throws(
    () => versionedPath('/health'),
    /does not contain a versioned API path/,
  )
})

test('v2 platform calls produce a copyable cURL without crashing', () => {
  const command = buildCurl({
    ...baseCall,
    path: '/api/v2/tenant/sys-config?Tenant%20IDs=55911&includeAllRelations=true',
  })

  assert.match(
    command,
    /https:\/\/1health\.demo\.1health\.io\/api\/v2\/tenant\/sys-config\?Tenant%20IDs=55911&includeAllRelations=true/,
  )
})
