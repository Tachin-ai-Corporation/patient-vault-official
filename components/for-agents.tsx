export function ForAgents() {
  return (
    <section
      aria-labelledby="agents-heading"
      className="bg-[--color-graphite] px-6 py-20 border-t border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3"
          style={{ color: 'var(--color-network-teal)' }}
        >
          For Agents
        </p>
        <h2 id="agents-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] mb-3">
          This page is built for you too.
        </h2>
        <p className="text-[16px] text-[--color-mist] max-w-[700px] mb-10">
          Every endpoint we publish ships with an agent-brief — a structured, machine-readable spec
          that lets your coding agent ramp on Patient Vault in one fetch. An agent-first structured
          spec, delivered through the Patient Vault MCP — your coding agent reads it and writes the
          calls. Start here.
        </p>

        {/* Row 1: agent-brief (full width) */}
        <div
          className="block rounded-[10px] p-6 mb-3"
          style={{
            backgroundColor: 'var(--color-charcoal)',
            borderWidth: '1px',
            borderColor: 'var(--color-slate)',
          }}
        >
          <p
            className="font-mono text-[15px] mb-2"
            style={{ color: 'var(--color-network-teal)' }}
          >
            /agent-brief
          </p>
          <p className="text-[14px] text-[--color-mist] leading-relaxed max-w-[680px]">
            The verb model (Store, Attach, Find), idempotency rules, error shapes, working examples, and per-endpoint
            agent-briefs. Everything a coding agent needs to write working code against Patient Vault.
            Fetch once, code for an hour.
          </p>
        </div>

        {/* Row 2: three smaller cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div
            className="rounded-[10px] p-5"
            style={{
              backgroundColor: 'var(--color-charcoal)',
              borderWidth: '1px',
              borderColor: 'var(--color-slate)',
            }}
          >
            <p
              className="font-mono text-[13px] mb-2"
              style={{ color: 'var(--color-network-teal)' }}
            >
              /llms.txt
            </p>
            <p className="text-[13px] text-[--color-slate] leading-relaxed">
              Plain-text capability summary. Base URL, auth, rate limits.
            </p>
          </div>

          <div
            className="rounded-[10px] p-5"
            style={{
              backgroundColor: 'var(--color-charcoal)',
              borderWidth: '1px',
              borderColor: 'var(--color-slate)',
            }}
          >
            <p
              className="font-mono text-[13px] mb-2"
              style={{ color: 'var(--color-network-teal)' }}
            >
              /openapi.json
            </p>
            <p className="text-[13px] text-[--color-slate] leading-relaxed">
              Full OpenAPI 3.1 spec — six endpoints at launch, more published in batches.
            </p>
          </div>

          <div
            className="rounded-[10px] p-5"
            style={{
              backgroundColor: 'var(--color-charcoal)',
              borderWidth: '1px',
              borderColor: 'var(--color-slate)',
            }}
          >
            <p
              className="font-mono text-[13px] mb-2"
              style={{ color: 'var(--color-network-teal)' }}
            >
              Authenticated agent access
            </p>
            <p className="text-[13px] text-[--color-slate] leading-relaxed">
              Coming in v1.1. One command adds the Patient Vault MCP server to Claude Code or Cursor; a browser opens for human sign-in, and your agent makes authenticated, audit-logged calls scoped to your vault. Account creation stays human — by policy.
            </p>
          </div>
        </div>

        <p className="font-mono text-[13px] text-[--color-slate]">
          first call:{' '}
          <span style={{ color: 'var(--color-amber)' }}>
            curl https://api.1health.io/v2/agent-brief
          </span>
        </p>
      </div>
    </section>
  )
}
