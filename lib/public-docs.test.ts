import assert from 'node:assert/strict'
import test from 'node:test'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  groupDocNav,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './docs-groups.ts'
import type { DocManifest } from './docs-shared.ts'

const docsDirectory = path.join(process.cwd(), 'content', 'docs')

async function manifest(): Promise<DocManifest> {
  return JSON.parse(await readFile(path.join(docsDirectory, 'docs-manifest.json'), 'utf8'))
}

test('public documentation exposes all generated resource groups', async () => {
  assert.deepEqual(
    groupDocNav((await manifest()).nav).map(({ group }) => group),
    ['Store', 'Attach', 'Find', 'Platform'],
  )
})

test('every manifest resource has a renderable filesystem document', async () => {
  for (const item of (await manifest()).nav) {
    const file = path.join(docsDirectory, path.basename(item.file))
    await access(file)
    assert.ok((await readFile(file, 'utf8')).trim())
  }
})

test('patient find is grouped under Find despite its nested route', async () => {
  const find = (await manifest()).nav.find((item) => item.slug === 'find')
  assert.equal(find?.group, 'Find')
  assert.match(await readFile(path.join(docsDirectory, find!.file), 'utf8'), /\/v3\/patient\/find/)
})
