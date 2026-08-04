import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DocMarkdown } from '@/components/docs/doc-markdown'
import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'

export const metadata: Metadata = {
  title: 'Using agents.md with AI Coding Tools — Patient Vault',
  description:
    'How to use Patient Vault agents.md route documentation with Claude, Cursor, v0, ChatGPT, and other AI coding tools.',
  alternates: { canonical: 'https://pv.1health.io/docs/agents-guide' },
}

function getGuideContent() {
  const markdown = readFileSync(
    join(process.cwd(), 'agents-guide.md'),
    'utf8',
  )

  return markdown.replace(/^# Using `agents\.md` with AI Coding Tools\s*/, '')
}

export default function AgentsGuidePage() {
  const guideContent = getGuideContent()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav />
      <main className="flex-1 px-6 py-16 md:py-24">
        <article className="mx-auto max-w-[860px]">
          <Link
            href="/#agents-heading"
            className="inline-flex items-center gap-2 text-sm font-medium text-teal hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Patient Vault
          </Link>

          <header className="mt-8 border-b border-border pb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              For agents
            </p>
            <h1 className="mt-3 text-balance font-sans text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Using agents.md with AI Coding Tools
            </h1>
            <p className="mt-4 max-w-3xl text-pretty text-base leading-relaxed text-muted-foreground">
              A practical guide to giving your AI coding tool the exact Patient
              Vault route context it needs.
            </p>
          </header>

          <div className="mt-10">
            <DocMarkdown body={guideContent} />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
