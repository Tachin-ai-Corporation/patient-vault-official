import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node's strip-types runner requires the runtime extension.
import { encodeCustomFieldDisplayName } from './custom-field-sections.ts'
import {
  findUsableCustomField,
  normalizeCustomFieldDefinitions,
  resolveCustomFieldAfterWrite,
  type CustomFieldDefinitionLike,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-resolution.ts'

const field = {
  id: 2,
  displayName: encodeCustomFieldDisplayName('demographics', 'field 1'),
  fieldKey: 'field1',
  fieldType: 'TEXT' as const,
}
const definition: CustomFieldDefinitionLike = {
  id: 1,
  appId: 94,
  boClassId: 9,
  name: 'Demographics: field 1',
  fields: [field],
}

test('normalizes direct create DTOs and supported list wrappers', () => {
  assert.deepEqual(normalizeCustomFieldDefinitions(definition), [definition])
  assert.deepEqual(normalizeCustomFieldDefinitions({ data: [definition] }), [definition])
  assert.deepEqual(normalizeCustomFieldDefinitions({ definitions: [definition] }), [definition])
  assert.deepEqual(normalizeCustomFieldDefinitions({ content: [definition] }), [definition])
})

test('only resolves a matching field after its generated key is usable', () => {
  const incomplete = { ...definition, fields: [{ ...field, fieldKey: '' }] }
  assert.equal(findUsableCustomField([incomplete], 'demographics', 'Person', 'field 1'), undefined)
  assert.equal(findUsableCustomField([definition], 'demographics', 'Person', 'field 1')?.field.fieldKey, 'field1')
})

test('resolves the requested field section inside a mixed same-name definition', () => {
  const contactField = {
    ...field,
    id: 3,
    displayName: encodeCustomFieldDisplayName('contacts', 'field 1'),
    fieldKey: 'contactField1',
  }
  const mixed = { ...definition, fields: [contactField, field] }

  assert.equal(
    findUsableCustomField([mixed], 'demographics', 'Person', 'field 1')?.field.fieldKey,
    'field1',
  )
  assert.equal(
    findUsableCustomField([mixed], 'contacts', 'Person', 'field 1')?.field.fieldKey,
    'contactField1',
  )
})

test('polls until a delayed generated field key appears', async () => {
  let reads = 0
  const incomplete = { ...definition, fields: [{ ...field, fieldKey: '' }] }
  const result = await resolveCustomFieldAfterWrite(
    async () => (++reads < 3 ? [incomplete] : [definition]),
    {
      sectionKey: 'demographics',
      boClass: 'Person',
      displayName: 'field 1',
      delays: [0, 1, 1],
      wait: async () => undefined,
    },
  )

  assert.equal(reads, 3)
  assert.equal(result.field?.fieldKey, 'field1')
})

test('returns the latest definitions when the key never becomes available', async () => {
  const incomplete = { ...definition, fields: [{ ...field, fieldKey: '' }] }
  const result = await resolveCustomFieldAfterWrite(async () => [incomplete], {
    sectionKey: 'demographics',
    boClass: 'Person',
    displayName: 'field 1',
    delays: [0],
  })

  assert.equal(result.field, undefined)
  assert.deepEqual(result.definitions, [incomplete])
})
