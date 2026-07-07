import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { baaContent, BAA_VERSION } from '@/components/agreement'

const REGISTER_URL = 'https://1health.demo.1health.io/register?openApp=Patient%20Vault'

export default function PublicBaaPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-graphite)' }}>
      <Nav />

      <main className="flex-1 px-6 py-24">
        <div className="max-w-[800px] mx-auto">
          <h1
            className="font-sans text-[36px] md:text-[44px] font-bold mb-4"
            style={{ color: 'var(--color-cloud)' }}
          >
            1health Platform Business Associate Agreement
          </h1>
          <p
            className="text-[17px] mb-4 leading-relaxed"
            style={{ color: 'var(--color-mist)' }}
          >
            Standard terms. Public document. No negotiation. The BAA below is the agreement that executes when you create an organization on Patient Vault.
          </p>
          <p
            className="text-[14px] mb-8 font-mono"
            style={{ color: 'var(--color-slate)' }}
          >
            Version {BAA_VERSION} · Effective: 2026
          </p>

          <div
            className="p-6 md:p-8 rounded-[16px] font-mono text-[13px] leading-[1.8] whitespace-pre-wrap mb-8"
            style={{
              backgroundColor: 'var(--color-charcoal)',
              border: '1px solid var(--color-slate)',
              color: 'var(--color-mist)',
            }}
          >
            {baaContent}
          </div>

          <div
            className="p-6 rounded-[16px] text-center"
            style={{
              backgroundColor: 'rgba(31, 154, 155, 0.1)',
              border: '1px solid var(--color-network-teal)',
            }}
          >
            <p className="text-[15px] mb-4" style={{ color: 'var(--color-cloud)' }}>
              Ready to execute this agreement?
            </p>
            <a
              href={REGISTER_URL}
              className="inline-flex items-center px-5 py-3 rounded-[10px] text-[15px] font-semibold transition-opacity duration-150 hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-network-teal)',
                color: 'var(--color-graphite)',
              }}
            >
              Get Started
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
