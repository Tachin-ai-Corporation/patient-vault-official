import assert from 'node:assert/strict'
import test from 'node:test'

import {
  validateDefinitionDeletion,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-deletion.ts'

test('allows the selected field when it is the definition’s only field', () => {
  assert.deepEqual(
    validateDefinitionDeletion({ definition: { id: 10, fields: [{ id: 21 }] }, field: { id: 21 } }),
    { safe: true },
  )
})

test('blocks deletion of a field in a multi-field definition', () => {
  const result = validateDefinitionDeletion({
    definition: { id: 10, fields: [{ id: 21 }, { id: 22 }] },
    field: { id: 21 },
  })

  assert.equal(result.safe, false)
  if (!result.safe) assert.match(result.reason, /contains 2 fields/)
})

test('blocks a selected field that does not match the owning definition', () => {
  const result = validateDefinitionDeletion({ definition: { id: 10, fields: [{ id: 21 }] }, field: { id: 22 } })
  assert.equal(result.safe, false)
  if (!result.safe) assert.match(result.reason, /does not match/)
})

test('blocks deletion of an empty definition', () => {
  const result = validateDefinitionDeletion({ definition: { id: 10, fields: [] }, field: { id: 21 } })
  assert.equal(result.safe, false)
  if (!result.safe) assert.match(result.reason, /no fields/)
})
