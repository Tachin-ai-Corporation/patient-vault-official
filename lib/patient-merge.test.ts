import assert from 'node:assert/strict'
import test from 'node:test'
import type { Patient } from './patient-data.ts'
import {
  buildMergePlan,
  isMergeFieldIdentical,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './patient-merge.ts'

test('builds canonical redirects and defaults field sources', () => {
  const plan = buildMergePlan(['a', 'b', 'c'], 'b')
  assert.deepEqual(plan.mergedIds, ['a', 'c'])
  assert.deepEqual(plan.redirects, [
    { from: 'a', to: 'b', status: 308 },
    { from: 'c', to: 'b', status: 308 },
  ])
  assert.equal(plan.fieldSources.given_name, 'b')
})

test('keeps field-level and relation survivor choices separate from canonical identity', () => {
  const relationSelections = {
    addresses: [{ patientId: 'b', itemId: 'address-1', keep: true }],
    contacts: [{ patientId: 'a', itemId: 'contact-1', keep: false }],
  }
  const plan = buildMergePlan(['a', 'b'], 'a', { family_name: 'b' }, relationSelections)
  assert.equal(plan.canonicalId, 'a')
  assert.equal(plan.fieldSources.family_name, 'b')
  assert.equal(plan.fieldSources.date_of_birth, 'a')
  assert.deepEqual(plan.relationSelections, relationSelections)
})

test('requires two or three selected patients', () => {
  assert.throws(() => buildMergePlan(['a'], 'a'))
  assert.throws(() => buildMergePlan(['a', 'b', 'c', 'd'], 'a'))
})

test('distinguishes identical and conflicting values from selected records', () => {
  const base = {
    date_of_birth: '2001-10-14',
    sex_at_birth: 'male',
    race: { code: '', label: '' },
    ethnicity: { code: '', label: '' },
  } as Patient
  const patients = [
    { ...base, id: 'a', family_name: 'Roberson' },
    { ...base, id: 'b', family_name: 'Robertson' },
  ] as Patient[]
  assert.equal(isMergeFieldIdentical(patients, 'date_of_birth'), true)
  assert.equal(isMergeFieldIdentical(patients, 'sex_at_birth'), true)
  assert.equal(isMergeFieldIdentical(patients, 'family_name'), false)
})
