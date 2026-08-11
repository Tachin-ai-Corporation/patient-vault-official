import { cookies } from 'next/headers'
import {
  AuthenticatedDocumentationShell,
  PublicDocumentationShell,
} from '@/components/docs/documentation-shell'
import { loadPublicDocs } from '@/lib/public-docs'
import { connectedSessionEnvironment } from '@/lib/session-environments'

export default async function DocumentationPage() {
  const cookieStore = await cookies()
  const initialEnvironment = connectedSessionEnvironment(
    (name) => cookieStore.get(name)?.value ?? null,
  )

  if (initialEnvironment) {
    return <AuthenticatedDocumentationShell initialEnvironment={initialEnvironment} />
  }

  const data = await loadPublicDocs()
  return <PublicDocumentationShell data={data} />
}
