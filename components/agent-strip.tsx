import { Bot } from 'lucide-react'

export function AgentStrip() {
  return (
    <div 
      className="border-b px-6 py-2 flex items-center justify-center min-h-[32px]"
      style={{ backgroundColor: 'var(--color-graphite)', borderColor: 'var(--color-slate)' }}
    >
      <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bot size={12} className="shrink-0" style={{ color: 'var(--color-network-teal)' }} />
          <span className="font-mono text-[11px] tracking-[0.06em] uppercase" style={{ color: 'var(--color-slate)' }}>
            Agent-Native Page
            <span className="mx-1.5" style={{ color: 'var(--color-slate)', opacity: 0.5 }}>·</span>
            machine-readable spec inline
          </span>
        </div>
      </div>
    </div>
  )
}
