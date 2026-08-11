import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error Node's strip-types runner requires the runtime extension.
import { buildPatientFindPath, hasPatientFindCriteria } from './patient-find.ts'

test('builds only documented find parameters in canonical order', () => {
  assert.equal(
    buildPatientFindPath({
      firstName: ' Ada ',
      lastName: 'Lovelace',
      dob: '1815-12-10',
      sexAtBirth: 'Female',
      exact: true,
    }),
    '/v3/patient/find?firstName=Ada&lastName=Lovelace&dob=1815-12-10&sexAtBirth=Female&exact=true',
  )
})

test('always includes exact and requires one demographic criterion', () => {
  const empty = { firstName: '', lastName: '', dob: '', sexAtBirth: '', exact: false }
  assert.equal(buildPatientFindPath(empty), '/v3/patient/find?exact=false')
  assert.equal(hasPatientFindCriteria(empty), false)
  assert.equal(hasPatientFindCriteria({ ...empty, lastName: 'Ng' }), true)
})
