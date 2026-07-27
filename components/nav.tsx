'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { withBrandingId } from '@/lib/auth-branding'

const REGISTER_URL = withBrandingId('https://1health.demo.1health.io/register?openApp=Patient%20Vault')
const LOGIN_URL = withBrandingId('https://1health.demo.1health.io/login?openApp=Patient%20Vault')

const NAV_LINKS = [
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close the mobile menu on Escape for accessibility.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const scrolledBg = theme === 'dark' ? 'rgba(32, 40, 51, 0.95)' : 'rgba(244, 246, 249, 0.95)'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 transition-all duration-200 border-b backdrop-blur-sm"
      style={{
        backgroundColor: scrolled || mobileOpen ? scrolledBg : 'transparent',
        borderColor: scrolled || mobileOpen ? 'var(--color-slate)' : 'transparent',
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
          {NAV_LINKS.map((item) => (
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

        {/* Mobile: hamburger toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-[10px]"
          style={{
            color: 'var(--color-cloud)',
            border: '1px solid var(--color-slate)',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile: dropdown panel */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="md:hidden absolute top-14 left-0 right-0 border-b flex flex-col gap-1 px-6 py-4 backdrop-blur-sm"
          style={{
            backgroundColor: scrolledBg,
            borderColor: 'var(--color-slate)',
          }}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="py-2 text-base font-medium"
              style={{ color: 'var(--color-cloud)' }}
            >
              {item.label}
            </Link>
          ))}

          <a
            href={LOGIN_URL}
            className="py-2 text-base font-medium"
            style={{ color: 'var(--color-cloud)' }}
          >
            Sign in
          </a>

          <a
            href={REGISTER_URL}
            className="mt-2 flex items-center justify-center px-4 py-3 rounded-[10px] text-base font-semibold"
            style={{
              backgroundColor: 'var(--color-network-teal)',
              color: 'var(--color-graphite)',
            }}
          >
            Get Started
          </a>

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="mt-2 flex items-center justify-center gap-2 w-full h-11 rounded-[10px] text-sm font-medium"
            style={{
              color: 'var(--color-mist)',
              border: '1px solid var(--color-slate)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </nav>
      )}
    </header>
  )
}
