const faqs = [
  {
    q: "Can't I just use FHIR?",
    a: `FHIR is the wire format. Patient Vault is the record. Building on raw FHIR means brokering BAAs, building identity infrastructure, instrumenting audit, and chasing endpoints — five months of work before your first feature. Patient Vault speaks FHIR on the wire, but adds the parts FHIR doesn't.\n\nIf you want to spend your seed round building patient-record infrastructure, FHIR is a fine choice. If you'd rather spend it on the product your users came for, Patient Vault is the substrate.`,
  },
  {
    q: 'How does Patient Vault relate to 1health?',
    a: 'Patient Vault is the developer-facing patient database service of 1health. The broader 1health platform includes the MCP Explorer, the API Reference, case studies, and other services built on the same canonical data model. Patient Vault is the first service designed for self-serve developer access. Visit dev.1health.io to see the rest of the platform.',
  },
  {
    q: 'How is this different from an EHR?',
    a: "An EHR is a clinical workflow product with a database underneath. Patient Vault is just the database — the canonical record — exposed as an API. You build the workflow your users came for; we hold the patient data underneath it. No clinician UI, no scheduling, no billing — those are your product, not ours.",
  },
  {
    q: 'Is this HIPAA-compliant out of the box?',
    a: "Yes. Sandbox access is instant and requires no BAA. When you activate production, you click to accept the standard Business Associate Agreement. Patient Vault's signature is already on it, so there is no negotiation or countersignature step. Every read and write is logged to an audit trail your compliance reviewer can defend.",
  },
  {
    q: 'How does the BAA work?',
    a: `Sandbox access is instant and requires no BAA. You can start building and make authenticated Sandbox calls right away.\n\nWhen you activate production, you click to accept Patient Vault's standard Business Associate Agreement. Patient Vault's signature is already on it, so your acceptance executes the agreement — no negotiation and no countersignature.\n\nThe full document is public at /baa, so you and your legal team can review it anytime before production activation. The terms are standard and do not change based on review.\n\nAfter activation, the executed BAA is downloadable as a PDF from your dashboard settings.`,
  },
  {
    q: 'What does it cost?',
    a: "Free to start — your first 1,000 patients are free forever, no card required. At patient 1,001 you pay $1 per patient per year. No monthly minimums, no hidden fees. Talk to us when you get past 100K patients for enterprise pricing.",
  },
  {
    q: 'Can I export my data?',
    a: 'Yes — portability is a design commitment, not an afterthought. Patient records outlive companies. Export is specified as GET /patient/{id}/export?format=fhir-r4: the full event stream as a FHIR R4 Bundle with provenance intact, not a snapshot. Specified in v1.1 ahead of implementation so you can build against a stable target.',
  },
  {
    q: "Who's already building on this?",
    a: "Some of the largest payers in the US run critical care transition apps on Patient Vault — that's how the platform reaches 80M Americans today. You're building on the same substrate they trust, and your patient data lives in your own isolated vault alongside that scale.",
  },
  {
    q: "Does Patient Vault give me access to other developers' patient data?",
    a: "No. Your patients live in your own isolated vault. You see only the patients you create. Cross-vault queries are not included.",
  },
  {
    q: 'Is the free tier a limited version of the product?',
    a: "No — it's the full product, not a stripped-down tier. From your first patient you get every endpoint and full Sandbox API access with no BAA required. The BAA executes when you activate production. Nothing in the API is gated. Your first 1,000 patients are free; at patient 1,001 you start paying $1 per patient per year. It's metered, not freemium — you're never on a lesser Patient Vault. Support moves from community to 1-business-day email once you're on the paid plan. Reads on existing patients keep working even if you stop paying.",
  },
  {
    q: 'What kind of files can I attach?',
    a: 'Any file type — PDFs, images, audio, documents, structured data. Files are virus-scanned on upload and limited to 50 MB each. Attach as many as you need to each patient.',
  },
]

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="bg-[--color-charcoal] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-3">
            Common Questions
          </p>
          <h2 id="faq-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em]">
            What developers ask first.
          </h2>
        </div>

        <dl className="flex flex-col gap-0 border border-[--color-slate]/30 rounded-[10px] overflow-hidden">
          {faqs.map((item, i) => (
            <details
              key={item.q}
              className={`group bg-[--color-graphite] ${i < faqs.length - 1 ? 'border-b border-[--color-slate]/30' : ''}`}
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-[--color-charcoal] transition-colors duration-150">
                <dt>
                  <h3 className="font-sans text-[17px] font-semibold text-[--color-cloud]">
                    {item.q}
                  </h3>
                </dt>
                <span className="text-[--color-slate] shrink-0 text-lg leading-none group-open:rotate-45 transition-transform duration-200">
                  +
                </span>
              </summary>
              <dd className="px-6 pb-6 text-[15px] leading-relaxed text-[--color-mist] whitespace-pre-line">
                {item.q === 'How does the BAA work?' ? (
                  <>
                    {item.a.split('/baa')[0]}
                    <a
                      href="/baa"
                      className="font-medium text-[--color-network-teal] underline underline-offset-4 hover:text-[--color-cloud] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-network-teal]"
                    >
                      /baa
                    </a>
                    {item.a.split('/baa')[1]}
                  </>
                ) : (
                  item.a
                )}
              </dd>
            </details>
          ))}
        </dl>
      </div>
    </section>
  )
}

export { faqs }
