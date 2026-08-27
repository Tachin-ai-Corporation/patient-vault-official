import { NextResponse } from 'next/server'
import { loadDocs, type DocsEnvironment } from '@/lib/docs'

const ENVIRONMENTS = new Set<DocsEnvironment>(['demo', 'prod'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const environment = searchParams.get('environment')
  const slug = searchParams.get('slug') ?? undefined

  if (!environment || !ENVIRONMENTS.has(environment as DocsEnvironment)) {
    return NextResponse.json(
      { error: 'A valid documentation environment is required.' },
      { status: 400 },
    )
  }

  try {
    const payload = await loadDocs(environment as DocsEnvironment, slug)
    return NextResponse.json(payload, {
      status: payload.doc || !slug ? 200 : 404,
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Documentation is unavailable.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
