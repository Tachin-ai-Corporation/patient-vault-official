import assert from 'node:assert/strict'
import test from 'node:test'

import {
  customFieldDisplayName,
  decodeCustomFieldDisplayName,
  encodeCustomFieldDisplayName,
  resolveCustomFieldSection,
  resolveCustomFieldSectionForField,
  CUSTOM_FIELD_SECTIONS,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './custom-field-sections.ts'

const taggedAlias = encodeCustomFieldDisplayName('aliases', 'qwe')

test('section metadata round-trips without changing the visible label', () => {
  assert.deepEqual(decodeCustomFieldDisplayName(taggedAlias), {
    displayName: 'qwe',
    sectionKey: 'aliases',
  })
  assert.equal(customFieldDisplayName({ displayName: taggedAlias }), 'qwe')
})

test('field metadata wins when the API does not preserve the definition name', () => {
  const section = resolveCustomFieldSection(
    { name: 'qwe', fields: [{ displayName: taggedAlias }] },
    'Person',
  )
  assert.equal(section?.key, 'aliases')
})

test('each tagged field owns its section inside a mixed definition', () => {
  const contactField = { displayName: encodeCustomFieldDisplayName('contacts', 'Shared') }
  const demographicField = { displayName: encodeCustomFieldDisplayName('demographics', 'Shared') }
  const definition = { name: 'Mixed', fields: [contactField, demographicField] }

  assert.equal(resolveCustomFieldSectionForField(definition, contactField, 'Person')?.key, 'contacts')
  assert.equal(resolveCustomFieldSectionForField(definition, demographicField, 'Person')?.key, 'demographics')
})

test('legacy definition prefixes remain supported', () => {
  const section = resolveCustomFieldSection(
    { name: 'Contacts: Pager', fields: [{ displayName: 'Pager' }] },
    'Person',
  )
  assert.equal(section?.key, 'contacts')
})

test('collection sections use their available-types keys and never Person', () => {
  assert.deepEqual(
    Object.fromEntries(CUSTOM_FIELD_SECTIONS.map(({ key, boClass, scope }) => [key, { boClass, scope }])),
    {
      demographics: { boClass: 'Person', scope: 'patient' },
      contacts: { boClass: 'ContactPoint', scope: 'record' },
      addresses: { boClass: 'Location', scope: 'record' },
      aliases: { boClass: 'NameAlias', scope: 'record' },
      'external-identities': { boClass: 'ExternalSystemMapping', scope: 'record' },
      documents: { boClass: 'File', scope: 'record' },
    },
  )
})

test('untagged legacy definitions retain their BO-class fallback section', () => {
  assert.equal(
    resolveCustomFieldSection({ name: 'Legacy', fields: [{ displayName: 'Legacy' }] }, 'Person')?.key,
    'demographics',
  )
  assert.equal(
    resolveCustomFieldSection({ name: 'Legacy alias', fields: [{ displayName: 'Legacy alias' }] }, 'NameAlias')?.key,
    'aliases',
  )
  assert.equal(
    resolveCustomFieldSection({ name: 'Legacy file', fields: [{ displayName: 'Legacy file' }] }, 'File')?.key,
    'documents',
  )
})
