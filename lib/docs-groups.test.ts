import assert from 'node:assert/strict'
import test from 'node:test'

import {
  groupDocNav,
  landingHrefForGroup,
  resolveDocGroup,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './docs-groups.ts'
import type { DocNavItem } from './docs-shared.ts'

function item(title: string, slug = title.toLowerCase().replaceAll(' ', '-')): DocNavItem {
  return {
    slug,
    title,
    file: `${slug}.md`,
    status: 'live',
    summary: `${title} docs`,
  }
}

test('fallback groups preserve source order within each ordered group', () => {
  const groups = groupDocNav([
    item('Patient'),
    item('Address'),
    item('Attach'),
    item('Find'),
    item('Health Grid / Patient'),
  ])

  assert.deepEqual(groups.map(({ group }) => group), ['Store', 'Attach', 'Find', 'Platform'])
  assert.deepEqual(groups[0].items.map(({ title }) => title), ['Patient', 'Address'])
})

test('a valid generated group key overrides fallback mapping', () => {
  assert.equal(resolveDocGroup({ ...item('Patient'), group: 'Find' }), 'Find')
})

test('an unknown resource remains visible exactly once in the final group', () => {
  const unknown = item('Future Resource')
  const groups = groupDocNav([item('Patient'), unknown])
  const flattened = groups.flatMap(({ items }) => items)
  const platform = groups.at(-1)

  assert.equal(platform?.group, 'Platform')
  assert.deepEqual(platform?.items, [unknown])
  assert.equal(flattened.filter(({ slug }) => slug === unknown.slug).length, 1)
})

test('Platform omits its landing backlink', () => {
  assert.equal(landingHrefForGroup('Store'), '/#store')
  assert.equal(landingHrefForGroup('Attach'), '/#attach')
  assert.equal(landingHrefForGroup('Find'), '/#find')
  assert.equal(landingHrefForGroup('Platform'), null)
})
