import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isCustomDataCapabilityMissing,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-capability.ts'

test('available-types 404 means the custom-data capability is not deployed', () => {
  assert.equal(isCustomDataCapabilityMissing(404), true)
})

test('non-404 failures are not misclassified as an undeployed capability', () => {
  assert.equal(isCustomDataCapabilityMissing(401), false)
  assert.equal(isCustomDataCapabilityMissing(500), false)
})
