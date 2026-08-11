import { cookies } from 'next/headers'
import {
  AuthenticatedDocumentationShell,
  PublicDocumentationShell,
} from '@/components/docs/documentation-shell'
import { loadPublicDocs } from '@/lib/public-docs'
import { connectedSessionEnvironment } from '@/lib/session-environments'

export default async function DocumentationResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()
  const initialEnvironment = connectedSessionEnvironment(
    (name) => cookieStore.get(name)?.value ?? null,
  )

  if (initialEnvironment) {
    return (
      <AuthenticatedDocumentationShell initialEnvironment={initialEnvironment} slug={slug} />
    )
  }

  const data = await loadPublicDocs(slug)
  return <PublicDocumentationShell data={data} slug={slug} />
}
