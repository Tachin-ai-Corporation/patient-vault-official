import { NextResponse } from 'next/server'
import { spec } from '@/lib/openapi-spec'

// The published spec is the same canonical object the dashboard derives its
// request shapes from, so the docs and the in-app forms never drift.
export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
