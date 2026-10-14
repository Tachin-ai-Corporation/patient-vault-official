const tiers = [
  {
    name: 'Sandbox',
    price: 'Free',
    period: null,
    description: 'Build against the full API in the sandbox with synthetic data for free.',
    features: ['MCP + docs + test data', 'Full API access'],
    accent: false,
  },
  {
    name: 'Production',
    price: '$2.40',
    period: 'per patient per year',
    description: 'Starting at $2.40 per patient per year. $1 at scale. Your first 1,000 production patients are free.',
    features: ['No seat fee, no platform minimum'],
    accent: true,
  },
]

const programs = [
  { label: 'Startup access', value: 'First 1,000 patients free' },
  { label: 'Accelerator / Incubator access', value: 'First 25,000 patients free' },
]

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="bg-[--color-graphite] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: 'var(--color-network-teal)' }}
          >
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] mb-3"
          >
            Simple platform pricing
          </h2>
          <p className="text-[16px] text-[--color-mist] leading-relaxed">
            Free for sandbox access. One price per patient per year in production.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col rounded-[10px] p-7"
              style={{
                backgroundColor: 'var(--color-charcoal)',
                borderWidth: '1px',
                borderColor: tier.accent ? 'var(--color-network-teal)' : 'var(--color-slate)',
              }}
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.18em] mb-3"
                style={{ color: 'var(--color-network-teal)' }}
              >
                {tier.name}
              </p>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-sans text-[48px] font-bold leading-none text-[--color-cloud]">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-[14px] text-[--color-slate]">{tier.period}</span>
                )}
              </div>

              <p className="text-[15px] text-[--color-mist] leading-relaxed mb-5">
                {tier.description}
              </p>

              <ul className="flex flex-col gap-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px] text-[--color-mist]">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 leading-none shrink-0"
                      style={{ color: 'var(--color-network-teal)' }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {programs.map((program) => (
            <div
              key={program.label}
              className="flex flex-col gap-1 rounded-[10px] px-7 py-5"
              style={{
                backgroundColor: 'var(--color-charcoal)',
                borderWidth: '1px',
                borderColor: 'var(--color-slate)',
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[--color-slate]">
                {program.label}
              </p>
              <p className="text-[17px] font-semibold text-[--color-cloud]">{program.value}</p>
            </div>
          ))}
        </div>

        <p className="text-[14px] text-[--color-slate]">
          Example: 1,000 patients within the 1,000-patient free allotment —{' '}
          <span className="font-mono text-[--color-cloud]">$0</span>
        </p>
      </div>
    </section>
  )
}
