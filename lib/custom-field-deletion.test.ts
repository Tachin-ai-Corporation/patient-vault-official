import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateFieldDeletion,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-deletion.ts'

test('allows the selected field when it is the definition’s only field', () => {
  assert.deepEqual(
    validateFieldDeletion({ definition: { id: 10, fields: [{ id: 21 }] }, field: { id: 21 } }),
    { safe: true },
  )
})

test('allows one selected field in a multi-field definition', () => {
  assert.deepEqual(
    validateFieldDeletion({
      definition: { id: 10, fields: [{ id: 21 }, { id: 22 }] },
      field: { id: 21 },
    }),
    { safe: true },
  )
})

test('blocks a selected field that does not belong to the expected definition', () => {
  const result = validateFieldDeletion({ definition: { id: 10, fields: [{ id: 21 }] }, field: { id: 22 } })
  assert.equal(result.safe, false)
  if (!result.safe) assert.match(result.reason, /does not belong/)
})

test('blocks a missing or invalid field id without falling back to definition deletion', () => {
  const result = validateFieldDeletion({ definition: { id: 10, fields: [{ id: 0 }] }, field: { id: 0 } })
  assert.equal(result.safe, false)
  if (!result.safe) assert.match(result.reason, /invalid field identifier/)
})
