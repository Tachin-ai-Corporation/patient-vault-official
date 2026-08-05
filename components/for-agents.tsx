import Link from 'next/link'

const cardClass =
  'rounded-[10px] border border-[--color-slate] bg-[--color-charcoal] p-6'

export function ForAgents() {
  return (
    <section
      aria-labelledby="agents-heading"
      className="border-t border-[--color-slate]/20 bg-[--color-graphite] px-6 py-20"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal]">
          For Agents
        </p>
        <h2
          id="agents-heading"
          className="mb-3 font-sans text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-[--color-cloud]"
        >
          This page is built for you too.
        </h2>
        <p className="mb-10 max-w-[700px] text-[16px] leading-relaxed text-[--color-mist]">
          Every route we publish ships with an agents.md file — a structured
          spec your coding agent reads in one fetch. Start at the index and
          drill down; each file links one level deeper.
        </p>

        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className={cardClass}>
            <h3 className="mb-3 font-mono text-[15px] text-[--color-network-teal]">
              agents.md
            </h3>
            <p className="text-[14px] leading-relaxed text-[--color-mist]">
              Every route ships with an agents.md file — request/response
              schemas, real JSON examples, every error code, and links to child
              routes. Generated from source on every change, so it never
              drifts. No key, no login: plain markdown at a predictable URL.
            </p>
          </article>

          <Link
            href="/docs/agents-guide"
            className={`${cardClass} group block transition-colors hover:border-[--color-network-teal] focus-visible:border-[--color-network-teal]`}
          >
            <h3 className="mb-3 font-mono text-[15px] text-[--color-network-teal]">
              Using agents.md with your AI tools
            </h3>
            <p className="text-[14px] leading-relaxed text-[--color-mist]">
              Point Claude, Cursor, v0, or ChatGPT at the file for the route
              you&apos;re integrating and it writes correct calls on the first
              try.{' '}
              <span className="font-medium text-[--color-network-teal] group-hover:underline">
                Step-by-step guide for each tool →
              </span>
            </p>
          </Link>
        </div>

        <p className="font-mono text-[13px] text-[--color-slate]">
          first call:{' '}
          <span className="text-[--color-amber]">
            curl https://mcp.dev.1hdev.io/agents-docs-index/patient
          </span>
        </p>
      </div>
    </section>
  )
}
