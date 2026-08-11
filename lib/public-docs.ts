import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { withResolvedDocGroup } from '@/lib/docs-groups'
import {
  HTTP_METHODS,
  slugifyHeading,
  type DocEndpoint,
  type DocManifest,
  type GlobalEndpoint,
  type LoadedDoc,
} from '@/lib/docs-shared'

export type PublicDocsPayload = {
  manifest: DocManifest
  doc: LoadedDoc | null
  endpoints: GlobalEndpoint[]
}

const DOCS_DIRECTORY = path.join(process.cwd(), 'content', 'docs')
const ENDPOINT_RE = new RegExp(`^##\\s+(${HTTP_METHODS.join('|')})\\s+(.+?)\\s*$`)

function parseEndpoints(body: string): DocEndpoint[] {
  return body.split('\n').flatMap((line) => {
    const match = line.match(ENDPOINT_RE)
    return match
      ? [{ method: match[1], path: match[2], id: slugifyHeading(`${match[1]} ${match[2]}`) }]
      : []
  })
}

function stripLeadingTitle(body: string): string {
  const lines = body.split('\n')
  const firstContent = lines.findIndex((line) => line.trim() !== '')
  if (firstContent >= 0 && /^#\s+/.test(lines[firstContent])) lines.splice(firstContent, 1)
  return lines.join('\n').trimStart()
}

export async function loadPublicDocs(requestedSlug?: string): Promise<PublicDocsPayload> {
  const manifest = JSON.parse(
    await readFile(path.join(DOCS_DIRECTORY, 'docs-manifest.json'), 'utf8'),
  ) as DocManifest

  const loadedDocs = await Promise.all(
    manifest.nav.map(async (item): Promise<LoadedDoc> => {
      const safeFile = path.basename(item.file)
      if (safeFile !== item.file || !safeFile.endsWith('.md')) {
        throw new Error('Documentation path is invalid.')
      }
      const body = stripLeadingTitle(await readFile(path.join(DOCS_DIRECTORY, safeFile), 'utf8'))
      return { ...withResolvedDocGroup(item), body, endpoints: parseEndpoints(body) }
    }),
  )

  const selectedSlug = requestedSlug ?? manifest.nav[0]?.slug
  const doc = loadedDocs.find((item) => item.slug === selectedSlug) ?? null
  const endpoints = loadedDocs.flatMap((item) =>
    item.endpoints.map((endpoint) => ({
      ...endpoint,
      slug: item.slug,
      resourceTitle: item.title,
      status: item.status,
    })),
  )

  return { manifest, doc, endpoints }
}
