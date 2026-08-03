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

export type DocsEnvironment = 'dev' | 'demo' | 'prod'

export type DocsPayload = {
  manifest: DocManifest
  doc: LoadedDoc | null
  endpoints: GlobalEndpoint[]
}

type DocsIndexResponse = {
  module?: unknown
  files?: unknown
}

type IndexedDoc = DocNavItem & { sourcePath: string }

const DOCS_ORIGIN = 'https://mcp.dev.1hdev.io'
const INDEX_PATH = '/agents-docs-index/patient'
const DOC_PATH_RE =
  /^\/agents-docs\/(dev|demo|prod)\/v\d+\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/agents\.md$/
const ENDPOINT_RE = new RegExp(`^##\\s+(${HTTP_METHODS.join('|')})\\s+(.+?)\\s*$`)

// Standalone docs that are not published in the patient index but should still
// appear in the documentation navigation. Each path is environment-aware; a
// doc that 404s for the active environment is skipped rather than failing the
// whole page.
const EXTRA_DOC_DEFINITIONS: Array<{
  buildPath: (environment: DocsEnvironment) => string
  slug: string
  title: string
  summary: string
}> = [
  {
    buildPath: (environment) => `/agents-docs/${environment}/v3/health/grid/patient/agents.md`,
    slug: 'health-grid-patient',
    title: 'Health Grid / Patient',
    summary: '/v3/health/grid/patient endpoint reference.',
  },
  {
    buildPath: (environment) => `/agents-docs/${environment}/v2/user/myself/agents.md`,
    slug: 'user-myself',
    title: 'User / Myself',
    summary: '/v2/user/myself endpoint reference.',
  },
]

function buildExtraDocs(environment: DocsEnvironment): IndexedDoc[] {
  return EXTRA_DOC_DEFINITIONS.map((definition) => {
    const sourcePath = definition.buildPath(environment)
    return {
      slug: definition.slug,
      title: definition.title,
      file: sourcePath,
      sourcePath,
      status: 'live' as const,
      summary: definition.summary,
    }
  })
}

function stripLeadingH1Stack(raw: string): string {
  const lines = raw.split('\n')
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || /^#\s+\S/.test(line)) {
      index += 1
      continue
    }
    break
  }
  return lines.slice(index).join('\n').trimStart()
}

function parseEndpoints(body: string): DocEndpoint[] {
  const endpoints: DocEndpoint[] = []
  for (const line of body.split('\n')) {
    const match = line.match(ENDPOINT_RE)
    if (!match) continue
    endpoints.push({
      method: match[1],
      path: match[2],
      id: slugifyHeading(`${match[1]} ${match[2]}`),
    })
  }
  return endpoints
}

function routeFromSourcePath(sourcePath: string): string {
  return sourcePath
    .replace(/^\/agents-docs\/(?:dev|demo|prod)/, '')
    .replace(/\/agents\.md$/, '')
    .split('/')
    .map((segment) => {
      const placeholder = segment.match(/^_(.+)_$/)
      return placeholder ? `{${placeholder[1]}}` : segment
    })
    .join('/')
}

function slugFromSourcePath(sourcePath: string): string {
  const route = routeFromSourcePath(sourcePath).replace(/^\/v3\/patient\/?/, '')
  if (!route) return 'patient'
  return `patient-${route
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[^A-Za-z0-9-]/g, '-').toLowerCase())
    .join('-')}`
}

function titleFromRoute(route: string): string {
  if (route === '/v3/patient') return 'Patients'
  const parts = route.split('/').filter(Boolean).slice(2)
  return parts
    .map((part) => {
      if (part.startsWith('{')) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' / ')
}

function sourcePathForEnvironment(
  pathname: string,
  environment: DocsEnvironment,
): string | null {
  const match = pathname.match(DOC_PATH_RE)
  if (!match || match[1] !== environment || pathname.includes('..')) return null
  return pathname
}

async function fetchIndex(environment: DocsEnvironment): Promise<IndexedDoc[]> {
  const response = await fetch(new URL(INDEX_PATH, DOCS_ORIGIN), {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Documentation index returned ${response.status}.`)

  const data = (await response.json()) as DocsIndexResponse
  if (!Array.isArray(data.files)) throw new Error('Documentation index is invalid.')

  const uniquePaths = new Set<string>()
  for (const value of data.files) {
    if (typeof value !== 'string') continue
    const normalized = value.replace(/^\/agents-docs\/agents\//, '/agents-docs/')
    const sourcePath = sourcePathForEnvironment(normalized, environment)
    if (sourcePath) uniquePaths.add(sourcePath)
  }

  return Array.from(uniquePaths)
    .map((sourcePath) => {
      const route = routeFromSourcePath(sourcePath)
      return {
        slug: slugFromSourcePath(sourcePath),
        title: titleFromRoute(route),
        file: sourcePath,
        sourcePath,
        status: 'live' as const,
        summary: `${route} endpoint reference.`,
      }
    })
    .sort((a, b) => {
      if (a.slug === 'patient') return -1
      if (b.slug === 'patient') return 1
      return a.sourcePath.localeCompare(b.sourcePath)
    })
}

function rewriteRelativeLinks(body: string, sourcePath: string, docs: IndexedDoc[]): string {
  const slugByPath = new Map(docs.map((doc) => [doc.sourcePath, doc.slug]))
  const sourceUrl = new URL(sourcePath, DOCS_ORIGIN)

  return body.replace(/\]\(([^)]+\.md)(#[^)]+)?\)/g, (match, href: string, hash = '') => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/')) return match
    const resolved = new URL(href, sourceUrl).pathname
    const slug = slugByPath.get(resolved)
    return slug ? `](/documentation/${slug}${hash})` : match
  })
}

async function fetchDocument(item: IndexedDoc, docs: IndexedDoc[]): Promise<LoadedDoc> {
  const url = new URL(item.sourcePath, DOCS_ORIGIN)
  if (url.origin !== DOCS_ORIGIN || !DOC_PATH_RE.test(url.pathname)) {
    throw new Error('Documentation path is invalid.')
  }

  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: 'text/markdown' },
  })
  if (!response.ok) throw new Error(`Documentation file returned ${response.status}.`)

  const raw = await response.text()
  const body = rewriteRelativeLinks(stripLeadingH1Stack(raw), item.sourcePath, docs)
  return { ...item, body, endpoints: parseEndpoints(body) }
}

export async function loadDocs(
  environment: DocsEnvironment,
  requestedSlug?: string,
): Promise<DocsPayload> {
  const indexedDocs = await fetchIndex(environment)
  const extraDocs = buildExtraDocs(environment)
  const allDocs = [...indexedDocs, ...extraDocs]

  // Indexed docs are required; a failure here surfaces as an error. Extra docs
  // are optional per environment, so a fetch failure just drops that entry.
  const loadedIndexed = await Promise.all(
    indexedDocs.map((item) => fetchDocument(item, allDocs)),
  )
  const settledExtras = await Promise.allSettled(
    extraDocs.map((item) => fetchDocument(item, allDocs)),
  )

  const availableExtras: IndexedDoc[] = []
  const loadedExtras: LoadedDoc[] = []
  settledExtras.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      availableExtras.push(extraDocs[index])
      loadedExtras.push(result.value)
    }
  })

  const availableDocs = [...indexedDocs, ...availableExtras]
  const loadedDocs = [...loadedIndexed, ...loadedExtras]

  const nav: DocNavItem[] = availableDocs.map(({ sourcePath: _sourcePath, ...item }) => item)
  const selected = requestedSlug
    ? availableDocs.find((item) => item.slug === requestedSlug)
    : availableDocs[0]

  const endpoints: GlobalEndpoint[] = loadedDocs.flatMap((doc) =>
    doc.endpoints.map((endpoint) => ({
      ...endpoint,
      slug: doc.slug,
      resourceTitle: doc.title,
      status: doc.status,
    })),
  )

  return {
    manifest: {
      section: 'Patient Vault v3 API',
      description: 'Live Patient API documentation for AI agents.',
      nav,
    },
    doc: selected ? loadedDocs.find((doc) => doc.slug === selected.slug) ?? null : null,
    endpoints,
  }
}
