'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, AlertTriangle } from 'lucide-react'
import {
  type DocNavItem,
  type GlobalEndpoint,
  type LoadedDoc,
} from '@/lib/docs-shared'
import { DocMarkdown } from '@/components/docs/doc-markdown'
import { MethodBadge } from '@/components/docs/method-badge'
import { cn } from '@/lib/utils'

function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-tag border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning',
        className,
      )}
    >
      Coming soon
    </span>
  )
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
    return endpoints.filter((e) =>
      `${e.method} ${e.path}`.toLowerCase().includes(trimmed),
    )
  }, [endpoints, trimmed])

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-28 flex max-h-[calc(100vh-8rem)] flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Filter endpoints…"
            aria-label="Filter endpoints by method or path"
            className="w-full rounded-input border border-input bg-background py-1.5 pl-8 pr-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring"
          />
        </div>

        <nav
          aria-label="API resources"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {trimmed ? (
            <ul className="flex flex-col gap-0.5">
              {results.length === 0 && (
                <li className="px-2 py-3 text-sm text-muted-foreground">
                  No endpoints match “{query}”.
                </li>
              )}
              {results.map((e) => (
                <li key={`${e.slug}-${e.id}`}>
                  <Link
                    href={`/documentation/${e.slug}#${e.id}`}
                    className="flex flex-col gap-1 rounded-button px-2 py-1.5 hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <MethodBadge method={e.method} />
                      <span className="truncate font-mono text-xs text-foreground">
                        {e.path}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 pl-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {e.resourceTitle}
                      </span>
                      {e.status === 'coming_soon' && <ComingSoonBadge />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {nav.map((item) => {
                const active = item.slug === currentSlug
                const muted = item.status === 'coming_soon'
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/documentation/${item.slug}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-button border px-2.5 py-2 text-sm transition-colors',
                        active
                          ? 'border-teal/40 bg-teal/10 font-medium text-foreground'
                          : 'border-transparent hover:bg-muted',
                        !active && muted
                          ? 'text-muted-foreground'
                          : !active && 'text-foreground/90',
                      )}
                    >
                      <span className="truncate">{item.title}</span>
                      {muted && <ComingSoonBadge />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </div>
    </aside>
  )
}

function OnThisPage({ doc }: { doc: LoadedDoc }) {
  if (doc.endpoints.length === 0) return null
  return (
    <nav
      aria-label="On this page"
      className="hidden w-56 shrink-0 xl:block"
    >
      <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          On this page
        </p>
        <ul className="flex flex-col gap-1 border-l border-border">
          {doc.endpoints.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="-ml-px flex items-center gap-2 border-l border-transparent py-1 pl-3 text-xs text-muted-foreground transition-colors hover:border-teal hover:text-foreground"
              >
                <MethodBadge method={e.method} className="text-[10px]" />
                <span className="truncate font-mono">{e.path}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export function DocsView({
  nav,
  doc,
  endpoints,
}: {
  nav: DocNavItem[]
  doc: LoadedDoc
  endpoints: GlobalEndpoint[]
}) {
  const [query, setQuery] = useState('')
  const comingSoon = doc.status === 'coming_soon'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          documentation
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Patient Vault v3 API
        </h1>
      </div>

      <div className="flex gap-8">
        <Sidebar
          nav={nav}
          currentSlug={doc.slug}
          query={query}
          onQueryChange={setQuery}
          endpoints={endpoints}
        />

        <main className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {doc.title}
            </h2>
            {comingSoon && <ComingSoonBadge className="mt-1.5" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{doc.summary}</p>

          {comingSoon && (
            <div className="mt-5 flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Coming soon</span>
                {' — this API isn\u2019t available in the demo yet. The reference below is provided for planning.'}
              </p>
            </div>
          )}

          <div className="mt-6">
            <DocMarkdown body={doc.body} />
          </div>
        </main>

        <OnThisPage doc={doc} />
      </div>
    </div>
  )
}
