import Link from 'next/link'

const rules = [
  'Append-only events',
  'Probabilistic identity',
  'Merges as redirects',
  'Scoped consent',
  'Minimal exposure',
  'Agent-legible by default',
  'Outlives your stack',
]

export function Editorial() {
  return (
    <section
      aria-labelledby="editorial-heading"
      className="bg-[--color-charcoal] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-3">
            From Our Engineering
          </p>
          <h2 id="editorial-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em]">
            How we think about patient record design.
          </h2>
        </div>

        {/* Main tile */}
        <article className="border border-[--color-slate]/30 rounded-[--radius-lg] overflow-hidden card-hover cursor-pointer">
          <div className="grid md:grid-cols-[1fr_200px] divide-y md:divide-y-0 md:divide-x divide-[--color-slate]/30">
            {/* Left */}
            <div className="p-8 bg-[--color-graphite]">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-slate] mb-4">
                Essay · 12 min read
              </p>
              <h3 className="font-sans text-[24px] font-bold text-[--color-cloud] tracking-[-0.02em] mb-4">
                Seven rules for a modern patient record API
              </h3>
              <p className="text-[15px] leading-relaxed text-[--color-mist] max-w-[600px] mb-6">
                Every healthcare application eventually builds a patient record. Most of them build
                it twice. This is what to build the first time — seven design decisions, learned in
                production, that determine whether your patient record scales, complies, and
                survives.
              </p>
              <p className="text-[13px] text-[--color-slate]">
                By Neil Sethi, platform development at 1health ·{' '}
                <Link
                  href="/guides/seven-rules-patient-record-api"
                  className="text-[--color-network-teal] hover:underline"
                >
                  Read the essay →
                </Link>
              </p>
            </div>

            {/* Right rail */}
            <div className="p-6 bg-[--color-charcoal]">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-slate] mb-4">
                The Seven Rules
              </p>
              <ol className="flex flex-col gap-2.5">
                {rules.map((rule, i) => (
                  <li key={rule} className="flex items-start gap-2.5 text-[13px] text-[--color-mist]">
                    <span className="font-mono text-[11px] text-[--color-slate] mt-0.5 w-3 shrink-0">
                      {i + 1}.
                    </span>
                    {rule}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
