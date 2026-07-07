'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

const REGISTER_URL = 'https://1health.demo.1health.io/register?openApp=Patient%20Vault'
const LOGIN_URL = 'https://1health.demo.1health.io/login?openApp=Patient%20Vault'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrolledBg = theme === 'dark' ? 'rgba(32, 40, 51, 0.95)' : 'rgba(244, 246, 249, 0.95)'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 transition-all duration-200 border-b backdrop-blur-sm"
      style={{
        backgroundColor: scrolled ? scrolledBg : 'transparent',
        borderColor: scrolled ? 'var(--color-slate)' : 'transparent',
      }}
    >
      <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between gap-8">
        {/* Logo - text only */}
        <Link href="/" className="shrink-0">
          <span className="font-sans text-[15px] font-bold tracking-tight" style={{ color: 'var(--color-cloud)' }}>
            <span style={{ color: 'var(--color-network-teal)' }}>1h</span> Patient Vault
          </span>
        </Link>

        {/* Right side nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {[
            { label: 'Pricing', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium transition-colors duration-150"
              style={{
                color: 'var(--color-mist)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-cloud)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-mist)';
              }}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-9 h-9 rounded-[10px] transition-colors duration-150"
            style={{
              color: 'var(--color-mist)',
              border: '1px solid var(--color-slate)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-cloud)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-mist)';
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href={LOGIN_URL}
            className="text-sm font-medium transition-colors duration-150"
            style={{
              color: 'var(--color-mist)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-cloud)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-mist)';
            }}
          >
            Sign in
          </a>
          <a
            href={REGISTER_URL}
            className="flex items-center px-4 py-2 rounded-[10px] text-sm font-semibold transition-opacity duration-150 hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-network-teal)',
              color: 'var(--color-graphite)',
            }}
          >
            Get Started
          </a>
        </nav>
      </div>
    </header>
  )
}
