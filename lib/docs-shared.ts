// Client-safe docs types and pure helpers. This module must NOT import any
// Node built-ins (fs/path) so it can be used from client components. The
// fs-backed loaders live in lib/docs.ts (server-only).

export type DocStatus = 'live' | 'coming_soon'

export type DocNavItem = {
  slug: string
  title: string
  file: string
  status: DocStatus
  summary: string
}

export type DocManifest = {
  section: string
  description: string
  nav: DocNavItem[]
}

// A single "## METHOD /path" endpoint heading within a resource.
export type DocEndpoint = {
  method: string
  path: string
  id: string
}

// An endpoint flattened across all resources, for the global search index.
export type GlobalEndpoint = DocEndpoint & {
  slug: string
  resourceTitle: string
  status: DocStatus
}

export type LoadedDoc = {
  slug: string
  title: string
  status: DocStatus
  summary: string
  body: string
  endpoints: DocEndpoint[]
}

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const

// Deterministic anchor id shared by the rendered <h2> and the TOC / search
// links, so clicking a heading link reliably scrolls to it.
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
