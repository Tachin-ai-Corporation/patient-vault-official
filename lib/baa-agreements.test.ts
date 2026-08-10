import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptanceBody,
  isHipaaCoveredEntity,
  normalizeBaaAgreements,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './baa-agreements.ts'

test('normalizes accepted agreements', () => {
  assert.deepEqual(
    normalizeBaaAgreements([
      { id: 123, state: { accepted: true } },
      { id: 456, state: { accepted: true } },
    ]),
    { accepted: true, pendingIds: [] },
  )
})

test('selects only unaccepted agreement template IDs', () => {
  assert.deepEqual(
    normalizeBaaAgreements([
      { id: 123, state: { accepted: true } },
      { id: 456, state: { accepted: false } },
    ]),
    { accepted: false, pendingIds: [456] },
  )
})

test('fails closed for empty or malformed agreement responses', () => {
  assert.equal(normalizeBaaAgreements([]), null)
  assert.equal(normalizeBaaAgreements([{ id: 123, state: {} }]), null)
  assert.equal(normalizeBaaAgreements({ accepted: true }), null)
})

test('maps both organization classifications to the API boolean', () => {
  assert.equal(isHipaaCoveredEntity('covered'), true)
  assert.equal(isHipaaCoveredEntity('non-covered'), false)
})

test('acceptance body contains only agreement template IDs', () => {
  assert.deepEqual(acceptanceBody([123, 456]), { ids: [123, 456] })
})
