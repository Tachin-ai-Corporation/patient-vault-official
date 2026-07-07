import { ArrowLeft } from 'lucide-react'

export function PlatformBar() {
  return (
    <div
      className="px-6 flex items-center min-h-[32px]"
      style={{ backgroundColor: 'var(--color-graphite)' }}
    >
      <div className="max-w-[1200px] mx-auto w-full flex items-center">
        <a
          href="https://dev.1health.io/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-[--color-slate] hover:text-[--color-mist] transition-colors duration-150"
        >
          <ArrowLeft size={12} className="shrink-0" />
          <span className="hidden sm:inline">dev.1health.io platform</span>
          <span className="sm:hidden">1health platform</span>
        </a>
      </div>
    </div>
  )
}
