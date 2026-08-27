import { withResolvedDocGroup, type DocGroup } from '@/lib/docs-groups'
import {
  HTTP_METHODS,
  slugifyHeading,
  type DocEndpoint,
  type DocManifest,
  type DocNavItem,
  type GlobalEndpoint,
  type LoadedDoc,
} from '@/lib/docs-shared'

export type {
  DocStatus,
  DocNavItem,
  DocManifest,
  DocEndpoint,
  GlobalEndpoint,
  LoadedDoc,
} from '@/lib/docs-shared'

export type DocsEnvironment = 'demo' | 'prod'

export type DocsPayload = {
  manifest: DocManifest
  doc: LoadedDoc | null
  endpoints: GlobalEndpoint[]
}

export const DOC_SEARCH_QUERIES = [
  'v3/patient',
  'v3/custom',
  'v3/health/grid/patient',
  'v2/user/myself',
] as const

export type CanonicalDocResult = {
  env: string
  route: string
  site_path: string
  kind: string
  methods: string[]
  api_version: string
  parent: string | null
  source_version: string
  generated_at: string
  agents_md_url: string
}

type CanonicalSearchResponse = {
  results?: unknown
}

type IndexedDoc = DocNavItem & {
  route: string
  sitePath: string
  sourceUrl: string
}

const DOCS_ORIGIN = 'https://agents.1health.io'
const SEARCH_PATH = '/api/v1/docs/search'
const ENDPOINT_RE = new RegExp(`^##\\s+(${HTTP_METHODS.join('|')})\\s+(.+?)\\s*$`)

export function documentationEnvironment(environment?: string | null): DocsEnvironment {
  return environment === 'prod' || environment === 'production' ? 'prod' : 'demo'
}

export function buildDocsSearchUrl(environment: DocsEnvironment, query: string): string {
  const url = new URL(SEARCH_PATH, DOCS_ORIGIN)
  url.searchParams.set('env', environment)
  url.searchParams.set('q', query)
  return url.toString()
}

function isCanonicalResult(value: unknown): value is CanonicalDocResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<CanonicalDocResult>
  return typeof result.route === 'string'
    && typeof result.site_path === 'string'
    && typeof result.agents_md_url === 'string'
    && Array.isArray(result.methods)
}

function validSourceUrl(value: string, environment: DocsEnvironment): string | null {
  try {
    const url = new URL(value)
    if (url.origin !== DOCS_ORIGIN) return null
    if (!url.pathname.startsWith(`/public/${environment}/api/`) || !url.pathname.endsWith('/agents.md')) return null
    return url.toString()
  } catch {
    return null
  }
}

function stripDocumentPreamble(raw: string): string {
  const withoutFrontmatter = raw.replace(/^\s*---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, '')
  const lines = withoutFrontmatter.split('\n')
  let index = 0
  while (index < lines.length && (lines[index].trim() === '' || /^#\s+\S/.test(lines[index]))) index += 1
  return lines.slice(index).join('\n').trimStart()
}

function parseEndpoints(body: string): DocEndpoint[] {
  return body.split('\n').flatMap((line) => {
    const match = line.match(ENDPOINT_RE)
    return match ? [{ method: match[1], path: match[2], id: slugifyHeading(`${match[1]} ${match[2]}`) }] : []
  })
}

function titleCaseSegment(segment: string): string {
  return segment
    .replace(/[{}]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function groupForCanonicalRoute(route: string): DocGroup {
  if (route.startsWith('/v3/custom') || route.startsWith('/v3/health/grid/patient') || route.startsWith('/v2/user/myself')) return 'Platform'
  if (route.includes('/attach')) return 'Attach'
  if (route.includes('/find')) return 'Find'
  return 'Store'
}

function describeRoute(route: string): { title: string; param?: string } {
  if (route.startsWith('/v3/health/grid/patient')) return { title: 'Health Grid / Patient' }
  if (route.startsWith('/v2/user/myself')) return { title: 'User / Myself' }

  const segments = route.split('/').filter(Boolean)
  const rootLength = route.startsWith('/v3/custom') ? 2 : 2
  const rest = segments.slice(rootLength)
  const named = rest.filter((segment) => !segment.startsWith('{'))
  const last = rest.at(-1)
  const param = last?.startsWith('{') ? last.slice(1, -1) : undefined

  if (route.startsWith('/v3/custom')) {
    return { title: named.length ? `Custom Fields / ${named.map(titleCaseSegment).join(' / ')}` : 'Custom Fields', param }
  }
  return { title: named.length ? named.map(titleCaseSegment).join(' / ') : 'Patients', param }
}

function slugFromSitePath(sitePath: string): string {
  return sitePath
    .replace(/\/agents\.md$/, '')
    .replace(/^\//, '')
    .replace(/_/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function toIndexedDoc(result: CanonicalDocResult, environment: DocsEnvironment): IndexedDoc | null {
  if (!result.site_path.startsWith('/') || result.site_path.includes('..')) return null
  const sourceUrl = validSourceUrl(result.agents_md_url, environment)
  if (!sourceUrl) return null
  const { title, param } = describeRoute(result.route)
  return {
    slug: slugFromSitePath(result.site_path),
    title,
    param,
    file: result.site_path,
    sitePath: result.site_path,
    sourceUrl,
    route: result.route,
    group: groupForCanonicalRoute(result.route),
    status: 'live',
    summary: `${result.route} endpoint reference.`,
  }
}

async function searchDocs(environment: DocsEnvironment, query: string): Promise<CanonicalDocResult[]> {
  const response = await fetch(buildDocsSearchUrl(environment, query), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Documentation search for ${query} returned ${response.status}.`)
  const payload = await response.json() as CanonicalSearchResponse
  return Array.isArray(payload.results) ? payload.results.filter(isCanonicalResult) : []
}

function rewriteRelativeLinks(body: string, sourceUrl: string, docs: IndexedDoc[]): string {
  const slugByUrl = new Map(docs.map((doc) => [doc.sourceUrl, doc.slug]))
  return body.replace(/\]\(([^)]+\.md)(#[^)]+)?\)/g, (match, href: string, hash = '') => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return match
    const resolved = new URL(href, sourceUrl).toString()
    const slug = slugByUrl.get(resolved)
    return slug ? `](/documentation/${slug}${hash})` : match
  })
}

async function fetchDocument(item: IndexedDoc, docs: IndexedDoc[]): Promise<LoadedDoc> {
  const response = await fetch(item.sourceUrl, {
    next: { revalidate: 300 },
    headers: { Accept: 'text/markdown' },
  })
  if (!response.ok) throw new Error(`Documentation file returned ${response.status}.`)
  const body = rewriteRelativeLinks(stripDocumentPreamble(await response.text()), item.sourceUrl, docs)
  return { ...item, body, endpoints: parseEndpoints(body) }
}

export async function loadDocs(environmentInput: DocsEnvironment | string, requestedSlug?: string): Promise<DocsPayload> {
  const environment = documentationEnvironment(environmentInput)
  const searches = await Promise.allSettled(DOC_SEARCH_QUERIES.map((query) => searchDocs(environment, query)))
  const unique = new Map<string, IndexedDoc>()
  searches.forEach((search) => {
    if (search.status !== 'fulfilled') return
    search.value.forEach((result) => {
      const item = toIndexedDoc(result, environment)
      if (item && !unique.has(item.sitePath)) unique.set(item.sitePath, item)
    })
  })

  const indexedDocs = Array.from(unique.values())
  if (!indexedDocs.length) throw new Error('Canonical Patient Vault documentation is unavailable.')

  const settledDocs = await Promise.allSettled(indexedDocs.map((item) => fetchDocument(item, indexedDocs)))
  const loadedDocs = settledDocs.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const availableSlugs = new Set(loadedDocs.map((doc) => doc.slug))
  const availableDocs = indexedDocs.filter((doc) => availableSlugs.has(doc.slug))
  const nav = availableDocs.map(({ sitePath: _sitePath, sourceUrl: _sourceUrl, route: _route, ...item }) => withResolvedDocGroup(item))
  const selectedSlug = requestedSlug ?? availableDocs[0]?.slug
  const doc = loadedDocs.find((item) => item.slug === selectedSlug) ?? null
  const endpoints = loadedDocs.flatMap((item) => item.endpoints.map((endpoint) => ({
    ...endpoint,
    slug: item.slug,
    resourceTitle: item.title,
    status: item.status,
  })))

  return {
    manifest: {
      section: 'Patient Vault v3 API',
      description: 'Canonical Patient Vault API documentation from 1health Agents.',
      nav,
    },
    doc,
    endpoints,
  }
}
