import { cookies } from 'next/headers'
import {
  AuthenticatedDocumentationShell,
  PublicDocumentationShell,
} from '@/components/docs/documentation-shell'
import { loadPublicDocs } from '@/lib/public-docs'

export default async function DocumentationResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authenticated = Boolean(
    cookieStore.get('demo_access_token')?.value ||
      cookieStore.get('prod_access_token')?.value ||
      cookieStore.get('access_token')?.value,
  )

  if (authenticated) return <AuthenticatedDocumentationShell slug={slug} />

  const data = await loadPublicDocs(slug)
  return <PublicDocumentationShell data={data} slug={slug} />
}
