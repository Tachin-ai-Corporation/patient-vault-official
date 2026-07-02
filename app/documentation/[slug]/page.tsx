import { notFound } from 'next/navigation'
import { getAllEndpoints, getNav, loadDoc } from '@/lib/docs'
import { DocsView } from '@/components/docs/docs-view'

// Pre-render every resource page from the manifest.
export function generateStaticParams() {
  return getNav().map((item) => ({ slug: item.slug }))
}

export default async function DocumentationResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = loadDoc(slug)
  if (!doc) notFound()

  return (
    <DocsView nav={getNav()} doc={doc} endpoints={getAllEndpoints()} />
  )
}
