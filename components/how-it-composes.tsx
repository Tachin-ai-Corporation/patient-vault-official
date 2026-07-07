export function HowItComposes() {
  return (
    <section
      aria-labelledby="holds-heading"
      className="bg-[--color-graphite] px-6 py-20 border-b border-[--color-slate]/20"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--color-network-teal] mb-3">
            What Patient Vault Holds
          </p>
          <h2 id="holds-heading" className="font-sans text-[32px] font-bold leading-[1.15] text-[--color-cloud] tracking-[-0.02em] mb-2">
            Everything your healthcare app needs to store.
          </h2>
        </div>

        <div
          className="rounded-[10px] p-8"
          style={{
            backgroundColor: 'var(--color-charcoal)',
            borderWidth: '1px',
            borderColor: 'var(--color-slate)',
          }}
        >
          <p className="text-[17px] leading-relaxed text-[--color-mist]">
            Patient demographics. Addresses and contacts. Documents — PDFs, intake forms, scans.
            Observations — vitals, labs, anything structured. Attachments — wearable data, audio,
            arbitrary JSON your app needs to persist. Every read and write logged. Names change —
            aliases are first-class: legal, former, and chosen names all live on the record.
            Optional demographics — gender identity, pronouns, race, ethnicity, preferred language —
            align with USCDI.
          </p>
        </div>
      </div>
    </section>
  )
}
