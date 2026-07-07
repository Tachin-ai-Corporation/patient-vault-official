const steps = [
  {
    label: 'STEP 1 · MINUTE 0–5 — STORE',
    title: 'Create your first patient.',
    body: 'POST /patient with demographics. Returns a server-assigned patientId.',
    code: [
      { type: 'cmd', text: 'curl -X POST https://api.1health.io/v2/patient \\' },
      { type: 'str', text: '  -H "Authorization: Bearer $KEY" \\' },
      { type: 'str', text: '  -d \'{"firstName":"Maria","lastName":"Santos","dob":"1988-04-12","sex_at_birth":"female"}\'' },
    ],
  },
  {
    label: 'STEP 2 · MINUTE 5–20 — ATTACH',
    title: 'Attach data to the patient.',
    body: 'Attach an address, document, observation, or anything else your app needs to persist. Same pattern for every attachment type.',
    code: [
      { type: 'cmd', text: 'curl -X POST https://api.1health.io/v2/patient/{id}/address \\' },
      { type: 'str', text: '  -H "Authorization: Bearer $KEY" \\' },
      { type: 'str', text: '  -d \'{"line1":"742 Evergreen Terrace","city":"Chicago","state":"IL","postalCode":"60614"}\'' },
    ],
  },
  {
    label: 'STEP 3 · MINUTE 20–40 — FIND',
    title: 'Find the patient.',
    body: 'Look up patients by identifier or demographics. One endpoint, one boolean — exact=true for a definitive lookup, exact=false for probabilistic matching. Every result carries a confidence score.',
    code: [
      { type: 'cmd', text: 'curl "https://api.1health.io/v2/patient/find?firstName=Maria&dob=1988-04-12&exact=false" \\' },
      { type: 'str', text: '  -H "Authorization: Bearer $KEY"' },
      { type: 'cmt', text: '# → {"results":[{"patientId":"pt_a8f3c2b9d4e7","score":0.97}]}' },
    ],
  },
  {
    label: 'STEP 4 · MINUTE 40–60 — GET',
    title: 'Get the full record.',
    body: 'Retrieve the canonical record with its observations and attachments — or the audit history of every read and write.',
    code: [
      { type: 'cmd', text: 'curl https://api.1health.io/v2/patient/{id} \\' },
      { type: 'str', text: '  -H "Authorization: Bearer $KEY"' },
    ],
  },
]

export function Quickstart() {
  return (
    <section
      aria-labelledby="quickstart-heading"
      className="px-6 py-20 border-b border-[--color-slate]/20"
      style={{ backgroundColor: 'var(--color-graphite)' }}
    >
      <div className="max-w-[1200px] mx-auto">
        <p
          className="font-mono text-[11px] uppercase mb-4"
          style={{ letterSpacing: '0.22em', color: 'var(--color-network-teal)' }}
        >
          Your First Hour
        </p>
        <h2
          id="quickstart-heading"
          className="font-sans text-[32px] md:text-[34px] font-bold leading-[1.15] tracking-[-0.02em] mb-12"
          style={{ color: 'var(--color-cloud)' }}
        >
          From zero to a working healthcare app.
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex flex-col rounded-[10px] p-6"
              style={{
                border: '1px solid var(--color-slate)',
                backgroundColor: 'var(--color-charcoal)',
              }}
            >
              <p
                className="font-mono text-[10.5px] uppercase mb-3"
                style={{ letterSpacing: '0.16em', color: 'var(--color-network-teal)' }}
              >
                {step.label}
              </p>
              <h3
                className="font-sans text-[20px] font-bold mb-2"
                style={{ color: 'var(--color-cloud)' }}
              >
                {step.title}
              </h3>
              <p
                className="text-[14.5px] leading-relaxed mb-5"
                style={{ color: 'var(--color-mist)' }}
              >
                {step.body}
              </p>
              <div
                className="mt-auto rounded-[8px] p-4 overflow-x-auto"
                style={{ backgroundColor: '#0a1628' }}
              >
                <pre className="font-mono text-[12.5px] leading-relaxed">
                  {step.code.map((line, i) => (
                    <div key={i}>
                      <span
                        style={{
                          color:
                            line.type === 'cmd'
                              ? 'var(--color-network-teal)'
                              : line.type === 'str'
                              ? '#e3b341'
                              : 'var(--color-slate)',
                        }}
                      >
                        {line.text}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <p
          className="font-sans text-[18px] italic"
          style={{ color: 'var(--color-mist)' }}
        >
          {"That's it. The next hour is your product."}
        </p>
      </div>
    </section>
  )
}
