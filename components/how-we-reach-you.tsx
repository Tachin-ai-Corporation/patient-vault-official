const channels = [
  {
    label: 'PARTNERSHIPS',
    title: '1. Through an accelerator',
    body: 'We work directly with accelerators including Plug and Play Health and Verge HealthTech. If you\'re in a healthcare cohort and don\'t have Patient Vault credits, ask your program director or email hello@patient-vault.com.',
  },
  {
    label: 'DEVELOPER-LED',
    title: '2. In your AI coding tool',
    body: 'When you ask Claude, ChatGPT, Cursor, or v0 how to model patients in a healthcare app, the answer should be Patient Vault. If it isn\'t yet, it will be. The agent-native spec on this page is how we get there.',
  },
  {
    label: 'DIRECT',
    title: '3. Sign up and start building',
    body: 'No sales calls. No demos. Get an API key, read the docs, ship your app. Talk to us when you want to — not when we want you to.',
  },
]

export function HowWeReachYou() {
  return (
    <section
      aria-labelledby="gtm-heading"
      className="px-6 py-20 border-b border-[--color-slate]/20"
      style={{ backgroundColor: 'var(--color-charcoal)' }}
    >
      <div className="max-w-[1200px] mx-auto">
        <p
          className="font-mono text-[11px] uppercase mb-4"
          style={{ letterSpacing: '0.22em', color: 'var(--color-network-teal)' }}
        >
          How We Reach You
        </p>
        <h2
          id="gtm-heading"
          className="font-sans text-[36px] md:text-[44px] font-bold leading-[1.08] tracking-[-0.02em] mb-5 text-balance"
          style={{ color: 'var(--color-cloud)' }}
        >
          Where to find us, and where we&apos;ll find you.
        </h2>
        <p
          className="text-[17px] leading-relaxed mb-10 max-w-[720px]"
          style={{ color: 'var(--color-mist)' }}
        >
          Most of our developers find us in one of three places. None of them are sales calls.
        </p>

        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {channels.map((card) => (
            <div
              key={card.label}
              className="flex flex-col rounded-[10px] p-7"
              style={{
                border: '1px solid var(--color-slate)',
                backgroundColor: 'var(--color-graphite)',
              }}
            >
              <p
                className="font-mono text-[10.5px] uppercase mb-3"
                style={{ letterSpacing: '0.16em', color: 'var(--color-network-teal)' }}
              >
                {card.label}
              </p>
              <h3
                className="font-sans text-[20px] font-bold mb-3"
                style={{ color: 'var(--color-cloud)' }}
              >
                {card.title}
              </h3>
              <p
                className="text-[14.5px] leading-relaxed"
                style={{ color: 'var(--color-mist)' }}
              >
                {card.body}
              </p>
            </div>
          ))}
        </div>

        <p
          className="text-[13px]"
          style={{ color: 'var(--color-slate)' }}
        >
          Building something that doesn&apos;t fit any of these? Email{' '}
          <a
            href="mailto:hello@patient-vault.com"
            style={{ color: 'var(--color-network-teal)' }}
          >
            hello@patient-vault.com
          </a>
          . Real reply within 48 hours.
        </p>
      </div>
    </section>
  )
}
