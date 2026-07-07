'use client'

const primitives = [
  { title: 'Store', desc: 'Create and update patient records: demographics, identity, the canonical patient. PATCH what changes.' },
  { title: 'Attach', desc: 'Add anything to a patient: addresses, contacts, documents, observations, wearable data, arbitrary attachments. Any file type, 50MB, virus-scanned.' },
  { title: 'Find', desc: 'Locate patients in your vault. One endpoint, one boolean: exact true for a definitive lookup, false for probabilistic matching. Every result returns a confidence score.' },
]

export function WhatsInIt() {
  return (
    <section
      aria-labelledby="primitives-heading"
      className="bg-[--color-charcoal] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-3">
            {"What's In It"}
          </p>
          <h2 id="primitives-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] mb-2">
            Three verbs. One mental model.
          </h2>
          <p className="text-[16px] text-[--color-mist] max-w-[640px]">
            Every endpoint and every shape fits into one of three verbs.
            Learn the three and you&apos;ve learned the API.
          </p>
        </div>

        {/* 3-column card */}
        <div className="rounded-[10px] overflow-hidden" style={{ borderWidth: '1px', borderColor: 'var(--color-slate)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'var(--color-slate)' }}>
            {primitives.map((p, idx) => {
              const borderColors = [
                'var(--color-trust-blue)',
                'var(--color-network-teal)',
                'var(--color-care-mint)',
                'var(--color-signal-aqua)',
              ];
              return (
                <div
                  key={p.title}
                  className="p-6 transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--color-charcoal)',
                    borderLeftWidth: '4px',
                    borderLeftColor: borderColors[idx],
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(49, 59, 71, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-charcoal)';
                  }}
                >
                  <p className="font-sans text-[18px] font-semibold text-[--color-cloud] mb-2">
                    {p.title}
                  </p>
                  <p className="text-[13px] text-[--color-mist] leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[16px] text-[--color-mist] leading-relaxed max-w-[760px] mt-6">
          Reading is just GET — the full record, paginated, or a metadata-only manifest of
          everything attached. Every read and write lands in an audit trail your compliance
          reviewer can defend.
        </p>
      </div>
    </section>
  )
}
