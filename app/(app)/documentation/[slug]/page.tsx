import { DocsView } from '@/components/docs/docs-view'

export default async function DocumentationResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <DocsView slug={slug} />
}
