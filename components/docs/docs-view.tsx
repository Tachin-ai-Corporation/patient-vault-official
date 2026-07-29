'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AlertTriangle, Search } from 'lucide-react'
import { DocMarkdown } from '@/components/docs/doc-markdown'
import { MethodBadge } from '@/components/docs/method-badge'
import { useSession } from '@/lib/session-context'
import type {
  DocManifest,
  DocNavItem,
  GlobalEndpoint,
  LoadedDoc,
} from '@/lib/docs-shared'
import { cn } from '@/lib/utils'

type DocsResponse = {
  manifest: DocManifest
  doc: LoadedDoc | null
  endpoints: GlobalEndpoint[]
}

async function docsFetcher(url: string): Promise<DocsResponse> {
  const response = await fetch(url)
  const data = (await response.json()) as DocsResponse | { error?: string }
  if (!response.ok) {
    throw new Error('error' in data && data.error ? data.error : 'Documentation is unavailable.')
  }
  return data as DocsResponse
}

function Sidebar({
  nav,
  currentSlug,
  query,
  onQueryChange,
  endpoints,
}: {
  nav: DocNavItem[]
  currentSlug: string
  query: string
  onQueryChange: (value: string) => void
  endpoints: GlobalEndpoint[]
}) {
  const trimmed = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!trimmed) return []
    return endpoints.filter((endpoint) =>
      `${endpoint.method} ${endpoint.path}`.toLowerCase().includes(trimmed),
    )
  }, [endpoints, trimmed])

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-28 flex max-h-[calc(100vh-8rem)] flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter endpoints…"
            aria-label="Filter endpoints by method or path"
            className="w-full rounded-input border border-input bg-background py-1.5 pl-8 pr-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring"
          />
        </div>

        <nav aria-label="API resources" className="min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {trimmed && results.length === 0 && (
              <li className="px-2 py-3 text-sm text-muted-foreground">
                No endpoints match “{query}”.
              </li>
            )}
            {(trimmed ? results : nav).map((entry) => {
              if ('method' in entry) {
                return (
                  <li key={`${entry.slug}-${entry.id}`}>
                    <Link
                      href={`/documentation/${entry.slug}#${entry.id}`}
                      className="flex flex-col gap-1 rounded-button px-2 py-1.5 hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <MethodBadge method={entry.method} />
                        <span className="truncate font-mono text-xs text-foreground">
                          {entry.path}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {entry.resourceTitle}
                      </span>
                    </Link>
                  </li>
                )
              }

              const active = entry.slug === currentSlug
              return (
                <li key={entry.slug}>
                  <Link
                    href={`/documentation/${entry.slug}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center rounded-button border px-2.5 py-2 text-sm transition-colors',
                      active
                        ? 'border-teal/40 bg-teal/10 font-medium text-foreground'
                        : 'border-transparent text-foreground/90 hover:bg-muted',
                    )}
                  >
                    <span className="truncate">{entry.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}

function OnThisPage({ doc }: { doc: LoadedDoc }) {
  if (doc.endpoints.length === 0) return null
  return (
    <nav aria-label="On this page" className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          On this page
        </p>
        <ul className="flex flex-col gap-1 border-l border-border">
          {doc.endpoints.map((endpoint) => (
            <li key={endpoint.id}>
              <a
                href={`#${endpoint.id}`}
                className="-ml-px flex items-center gap-2 border-l border-transparent py-1 pl-3 text-xs text-muted-foreground transition-colors hover:border-teal hover:text-foreground"
              >
                <MethodBadge method={endpoint.method} className="text-[10px]" />
                <span className="truncate font-mono">{endpoint.path}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function DocsMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

export function DocsView({ slug }: { slug?: string }) {
  const { currentEnv } = useSession()
  const [query, setQuery] = useState('')
  const docsEnvironment = currentEnv === 'production' ? 'prod' : 'demo'
  const requestUrl = `/api/agent-docs?environment=${docsEnvironment}${
    slug ? `&slug=${encodeURIComponent(slug)}` : ''
  }`
  const { data, error, isLoading } = useSWR(requestUrl, docsFetcher, {
    revalidateOnFocus: false,
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          documentation
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Patient Vault v3 API
        </h1>
      </header>

      {isLoading && (
        <div className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading documentation…
        </div>
      )}

      {error && (
        <DocsMessage
          title={slug ? 'Documentation not found' : 'Documentation unavailable'}
          message={error instanceof Error ? error.message : 'Please try again shortly.'}
        />
      )}

      {!isLoading && !error && data && !data.doc && (
        <DocsMessage
          title="No documentation available"
          message="No Patient agent documentation is available for this environment."
        />
      )}

      {data?.doc && (
        <div className="flex gap-8">
          <Sidebar
            nav={data.manifest.nav}
            currentSlug={data.doc.slug}
            query={query}
            onQueryChange={setQuery}
            endpoints={data.endpoints}
          />

          <main className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {data.doc.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.doc.summary}</p>
            <div className="mt-6">
              <DocMarkdown body={data.doc.body} />
            </div>
          </main>

          <OnThisPage doc={data.doc} />
        </div>
      )}
    </div>
  )
}
