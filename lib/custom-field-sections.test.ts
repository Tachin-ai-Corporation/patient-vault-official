import assert from 'node:assert/strict'
import test from 'node:test'

import {
  customFieldDisplayName,
  decodeCustomFieldDisplayName,
  encodeCustomFieldDisplayName,
  resolveCustomFieldSection,
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

test('legacy definition prefixes remain supported', () => {
  const section = resolveCustomFieldSection(
    { name: 'Contacts: Pager', fields: [{ displayName: 'Pager' }] },
    'Person',
  )
  assert.equal(section?.key, 'contacts')
})

test('untagged legacy definitions retain their BO-class fallback section', () => {
  assert.equal(
    resolveCustomFieldSection({ name: 'Legacy', fields: [{ displayName: 'Legacy' }] }, 'Person')?.key,
    'demographics',
  )
  assert.equal(
    resolveCustomFieldSection({ name: 'Legacy file', fields: [{ displayName: 'Legacy file' }] }, 'File')?.key,
    'documents',
  )
})
