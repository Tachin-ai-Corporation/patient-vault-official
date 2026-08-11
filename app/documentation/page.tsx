import { cookies } from 'next/headers'
import {
  AuthenticatedDocumentationShell,
  PublicDocumentationShell,
} from '@/components/docs/documentation-shell'
import { loadPublicDocs } from '@/lib/public-docs'

export default async function DocumentationPage() {
  const cookieStore = await cookies()
  const authenticated = Boolean(
    cookieStore.get('demo_access_token')?.value ||
      cookieStore.get('prod_access_token')?.value ||
      cookieStore.get('access_token')?.value,
  )

  if (authenticated) return <AuthenticatedDocumentationShell />

  const data = await loadPublicDocs()
  return <PublicDocumentationShell data={data} />
}
