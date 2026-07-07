export function WhoThisIsFor() {
  return (
    <section
      aria-labelledby="who-heading"
      className="px-6 py-20 border-b border-[--color-slate]/20"
      style={{ backgroundColor: 'var(--color-charcoal)' }}
    >
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-[280px_1fr] gap-12 items-start">
        {/* Left */}
        <div>
          <p
            className="font-mono text-[11px] uppercase mb-4"
            style={{ letterSpacing: '0.22em', color: 'var(--color-network-teal)' }}
          >
            Who This Is For
          </p>
          <h2
            id="who-heading"
            className="font-sans text-[36px] md:text-[44px] font-bold leading-[1.08] tracking-[-0.02em] text-balance"
            style={{ color: 'var(--color-cloud)' }}
          >
            Built for healthcare developers, before and after their first line of code.
          </h2>
        </div>

        {/* Right */}
        <div>
          <p
            className="text-[17px] leading-relaxed mb-8"
            style={{ color: 'var(--color-mist)' }}
          >
            {"You're a developer or a small team building a healthcare app. The patient record is the part you shouldn't be building from scratch — whether you're about to write your first line of code or you're already in market and ready to consolidate the plumbing you wrote in a hurry. That work is done. Start with Patient Vault and spend your engineering time on the product your users actually came for."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'YOU ARE',
                desc: 'A developer building a healthcare app. Hackathon team, founder, or an existing company adding healthcare.',
              },
              {
                label: "YOU AREN'T YET",
                desc: 'Live in market with thousands of patients, integrated with payers, or in procurement cycles.',
              },
              {
                label: 'YOU WILL BE',
                desc: 'In production in days, on the substrate dozens of apps already trust.',
              },
            ].map((tile) => (
              <div
                key={tile.label}
                className="rounded-[10px] p-6"
                style={{
                  border: '1px solid color-mix(in srgb, var(--color-slate) 30%, transparent)',
                }}
              >
                <p
                  className="font-mono text-[10.5px] uppercase mb-2"
                  style={{ letterSpacing: '0.16em', color: 'var(--color-network-teal)' }}
                >
                  {tile.label}
                </p>
                <p className="text-[15.5px] leading-snug" style={{ color: 'var(--color-mist)' }}>
                  {tile.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
