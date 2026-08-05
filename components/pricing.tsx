'use client'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever for your first 1,000 patients',
    features: [
      'No credit card required',
      'BAA executed at production activation',
      'Full API access',
      'Community support',
    ],
    accent: false,
  },
  {
    name: 'Pay As You Go',
    pill: 'Most teams',
    price: '$1',
    period: 'per patient per year, starting at patient 1,001',
    features: [
      'No monthly minimums',
      'BAA executed at production activation',
      'Production access',
      'Reads always work, even if you stop paying',
      'Email support, 1 business day response',
    ],
    accent: true,
  },
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
            className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em]"
          >
            Free to start. Pay only when you scale.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-[10px] p-7 transition-all duration-150"
              style={{
                backgroundColor: 'var(--color-charcoal)',
                borderWidth: '1px',
                borderColor: tier.accent ? 'var(--color-network-teal)' : 'var(--color-slate)',
                boxShadow: tier.accent ? '0 12px 32px rgba(0, 0, 0, 0.24)' : 'none',
              }}
            >
              {tier.pill && (
                <span
                  className="absolute -top-3 left-7 font-mono text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: 'var(--color-network-teal)',
                    color: 'var(--color-graphite)',
                  }}
                >
                  {tier.pill}
                </span>
              )}

              <p
                className="font-mono text-[11px] uppercase tracking-[0.18em] mb-3"
                style={{ color: 'var(--color-network-teal)' }}
              >
                {tier.name}
              </p>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-sans text-[56px] font-bold leading-none text-[--color-cloud]">
                  {tier.price}
                </span>
              </div>
              <p className="text-[14px] text-[--color-slate] mb-6">
                {tier.period}
              </p>

              <ul className="flex flex-col gap-2.5 mb-4">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15.5px] text-[--color-mist]">
                    <span className="mt-0.5 leading-none shrink-0" style={{ color: 'var(--color-network-teal)' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-[13px] italic text-[--color-slate] leading-relaxed max-w-[720px]">
          At a hackathon, accelerator, or incubator? Ask your program about Patient Vault credits — typical grant is $25,000, applied at signup.
        </p>
      </div>
    </section>
  )
}
