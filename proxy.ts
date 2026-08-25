import { NextResponse, type NextRequest } from 'next/server'

/**
 * Make the original route available to Server Component layouts. Next.js does
 * not otherwise expose the complete request pathname to a layout, which needs
 * it to preserve deep links when an unauthenticated request is redirected.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-search', request.nextUrl.search)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/patients/:path*', '/console/:path*', '/integrations/:path*', '/settings/:path*'],
}
