const cards = [
  {
    label: 'FOR HACKATHON BUILDERS',
    body: 'Sign up, get a key, ship something this weekend. No card, no call.',
  },
  {
    label: 'FOR FUNDED STARTUPS',
    body: 'Sandbox access is instant with no BAA. The BAA executes at production activation. Scale when you scale.',
  },
  {
    label: 'FOR INTERNATIONAL TEAMS COMING TO THE US',
    body: 'Compliance on-ramp for US patient data. Skip 18 months of legal review.',
  },
]

export function Incubator() {
  return (
    <section
      id="incubator"
      aria-labelledby="incubator-heading"
      className="bg-[--color-graphite] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-4">
          Built for Healthcare Developers
        </p>
        <h2 id="incubator-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] mb-5">
          Patient Vault works for healthcare developers at any stage.
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[10px] p-7"
              style={{
                backgroundColor: 'var(--color-charcoal)',
                borderWidth: '1px',
                borderColor: 'var(--color-slate)',
              }}
            >
              <p
                className="font-mono text-[10.5px] uppercase mb-4"
                style={{ letterSpacing: '0.16em', color: 'var(--color-network-teal)' }}
              >
                {card.label}
              </p>
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-mist)' }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
