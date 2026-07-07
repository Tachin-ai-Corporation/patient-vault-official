export function WhatItReplaces() {
  return (
    <section
      aria-labelledby="replaces-heading"
      className="bg-[--color-charcoal] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-[280px_1fr] gap-12">
        {/* Left */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-3">
            What It Replaces
          </p>
          <h2 id="replaces-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] text-balance">
            Six months of infrastructure work.
          </h2>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-6">
          <p className="text-[16px] leading-relaxed text-[--color-mist]">
            Build it yourself, and you&apos;ll spend six months modeling demographics, chasing
            clinical history across providers, integrating labs, capturing consent, and standing up
            an audit trail your compliance reviewer can defend.
          </p>
          <div className="bg-[--color-graphite] border border-[--color-slate]/30 rounded-[10px] p-6">
            <p className="text-[16px] leading-relaxed text-[--color-mist] mb-4">
              Patient Vault is the alternative: the patient record, already built, available as one API resource.
              You write the code that makes your product different — not the code every healthcare app has to write.
            </p>
            <p className="text-[15px] leading-relaxed text-[--color-mist]">
              Skip the months of BAA negotiation. Patient Vault&apos;s BAA is one standard document, public at{' '}
              <a href="/baa" className="font-medium" style={{ color: 'var(--color-network-teal)' }}>/baa</a>,
              executed at signup by clickwrap. Your legal team can review it on their schedule — the terms don&apos;t change.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
