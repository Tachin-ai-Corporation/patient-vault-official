import fs from 'node:fs'
import path from 'node:path'
import {
  HTTP_METHODS,
  slugifyHeading,
  type DocEndpoint,
  type DocManifest,
  type DocNavItem,
  type GlobalEndpoint,
  type LoadedDoc,
} from '@/lib/docs-shared'

// Server-only docs loader. Content is read from /content/docs at request time
// so the rendered reference is driven entirely by the markdown files and the
// manifest — editing a .md file or flipping a status changes the docs with no
// code change.

export type {
  DocStatus,
  DocNavItem,
  DocManifest,
  DocEndpoint,
  GlobalEndpoint,
  LoadedDoc,
} from '@/lib/docs-shared'

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs')
const ENDPOINT_RE = new RegExp(
  `^##\\s+(${HTTP_METHODS.join('|')})\\s+(.+?)\\s*$`,
)

export function getManifest(): DocManifest {
  const raw = fs.readFileSync(path.join(DOCS_DIR, 'docs-manifest.json'), 'utf8')
  return JSON.parse(raw) as DocManifest
}

export function getNav(): DocNavItem[] {
  return getManifest().nav
}

export function getNavItem(slug: string): DocNavItem | undefined {
  return getNav().find((item) => item.slug === slug)
}

export function getDefaultSlug(): string {
  return getNav()[0]?.slug ?? 'patient'
}

// Strip the leading stack of repeated H1 endpoint headings (and any blank
// lines) so the rendered body starts at the intro paragraph. The manifest
// title is used as the page heading instead.
function stripLeadingH1Stack(raw: string): string {
  const lines = raw.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || /^#\s+\S/.test(line)) {
      i++
      continue
    }
    break
  }
  return lines.slice(i).join('\n').trimStart()
}

function parseEndpoints(body: string): DocEndpoint[] {
  const endpoints: DocEndpoint[] = []
  for (const line of body.split('\n')) {
    const match = line.match(ENDPOINT_RE)
    if (!match) continue
    const method = match[1]
    const endpointPath = match[2]
    endpoints.push({
      method,
      path: endpointPath,
      id: slugifyHeading(`${method} ${endpointPath}`),
    })
  }
  return endpoints
}

export function loadDoc(slug: string): LoadedDoc | null {
  const item = getNavItem(slug)
  if (!item) return null

  const filePath = path.join(DOCS_DIR, item.file)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const body = stripLeadingH1Stack(raw)

  return {
    slug: item.slug,
    title: item.title,
    status: item.status,
    summary: item.summary,
    body,
    endpoints: parseEndpoints(body),
  }
}

// Flatten every resource's endpoints into one index for cross-resource search.
export function getAllEndpoints(): GlobalEndpoint[] {
  const out: GlobalEndpoint[] = []
  for (const item of getNav()) {
    const doc = loadDoc(item.slug)
    if (!doc) continue
    for (const endpoint of doc.endpoints) {
      out.push({
        ...endpoint,
        slug: item.slug,
        resourceTitle: item.title,
        status: item.status,
      })
    }
  }
  return out
}
