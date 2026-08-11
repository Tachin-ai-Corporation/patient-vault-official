'use client'

import { Suspense } from 'react'
import { SharedHeader } from '@/components/shared-header'
import {
  AuthenticatedDocsView,
  PublicDocsView,
} from '@/components/docs/docs-view'
import { SessionProvider } from '@/lib/session-context'
import type { PublicDocsPayload } from '@/lib/public-docs'
import type { SessionEnvironment } from '@/lib/session-environments'

function DocumentationFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

export function PublicDocumentationShell({
  data,
  slug,
}: {
  data: PublicDocsPayload
  slug?: string
}) {
  return (
    <DocumentationFrame>
      <SharedHeader />
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <PublicDocsView data={data} slug={slug} />
      </div>
    </DocumentationFrame>
  )
}

export function AuthenticatedDocumentationShell({
  initialEnvironment,
  slug,
}: {
  initialEnvironment: SessionEnvironment
  slug?: string
}) {
  return (
    <Suspense fallback={null}>
      <SessionProvider initialEnvironment={initialEnvironment}>
        <DocumentationFrame>
          <SharedHeader authenticated />
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
            <AuthenticatedDocsView slug={slug} />
          </div>
        </DocumentationFrame>
      </SessionProvider>
    </Suspense>
  )
}
