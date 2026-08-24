import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateAndNormalizeExternalIdentity,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './external-identity.ts'

test('creates a minimal payload and omits blank optional properties', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: '  MRN-42  ',
    type: '',
    authority_organization_id: '',
    active_from: '',
    active_until: '',
  })

  assert.deepEqual(result, { ok: true, body: { value: 'MRN-42' } })
})

test('rejects supplying both an authority ID and name', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: 'MRN-42',
    authority_organization_id: '12',
    authority_organization_name: 'Legacy EHR',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /either an organization ID or an organization name/i)
})

test('normalizes numeric authority IDs as numbers', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: 'MRN-42',
    authority_organization_id: '12',
    authority_external_system_id: '34',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.body.authority_organization_id, 12)
    assert.equal(result.body.authority_external_system_id, 34)
  }
})

test('rejects non-numeric authority IDs', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: 'MRN-42',
    authority_external_system_id: 'system-id',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /positive whole number/i)
})

test('accepts a valid activity range and serializes it', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: 'MRN-42',
    active_from: '2026-08-23T09:30',
    active_until: '2026-08-24T09:30',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.ok(result.body.active_from?.endsWith('Z'))
    assert.ok(result.body.active_until?.endsWith('Z'))
  }
})

test('retains every editable identity field in a normalized payload', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: '  MEMBER-9  ',
    type: ' custom_member ',
    authority_organization_name: ' Health Plan ',
    authority_external_system_id: '34',
    source_name: ' Portal import ',
    active_from: '2026-08-23T09:30',
    active_until: '2026-08-24T09:30',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.body.value, 'MEMBER-9')
    assert.equal(result.body.type, 'custom_member')
    assert.equal(result.body.authority_organization_name, 'Health Plan')
    assert.equal(result.body.authority_external_system_id, 34)
    assert.equal(result.body.source_name, 'Portal import')
    assert.ok(result.body.active_from?.endsWith('Z'))
    assert.ok(result.body.active_until?.endsWith('Z'))
  }
})

test('rejects an activity end before its start', () => {
  const result = validateAndNormalizeExternalIdentity({
    value: 'MRN-42',
    active_from: '2026-08-24T09:30',
    active_until: '2026-08-23T09:30',
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.message, /later than or equal/i)
})
