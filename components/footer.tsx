import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[--color-graphite] border-t border-[--color-slate]/20 px-6 py-6">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-[14px] font-semibold text-[--color-cloud]">
            Patient Vault <span className="text-[--color-slate] font-normal">· a service of 1health</span>
          </p>
          <p className="text-[12px] text-[--color-slate]">
            Tachin.ai Corporation · 2026 · All rights reserved
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[--color-slate]">
          <Link href="/terms" className="hover:text-[--color-mist] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[--color-mist] transition-colors">Privacy</Link>
          <Link href="/baa" className="hover:text-[--color-mist] transition-colors">BAA</Link>
          <Link href="/security" className="hover:text-[--color-mist] transition-colors">Security</Link>
          <a
            href="https://dev.1health.io/"
            className="text-[--color-network-teal] hover:opacity-80 transition-opacity"
          >
            1health platform →
          </a>
        </nav>
      </div>
    </footer>
  )
}
