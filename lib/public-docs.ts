import 'server-only'

import { loadDocs, type DocsPayload } from '@/lib/docs'

export type PublicDocsPayload = DocsPayload

export async function loadPublicDocs(requestedSlug?: string): Promise<PublicDocsPayload> {
  return loadDocs('demo', requestedSlug)
}
