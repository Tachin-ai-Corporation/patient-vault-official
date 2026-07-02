import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SessionProvider } from '@/lib/session-context'
import { AppShell } from '@/components/app-shell'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Patient Vault — 1health',
  description:
    'Manage a vault of patient records through the 1health healthcare data API.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#202833',
}

// Set the theme class before hydration to avoid a flash. Dark is the default.
const themeScript = `(function(){try{var t=localStorage.getItem('pv-theme');var c=t==='light'?'light':'dark';document.documentElement.classList.add(c);}catch(e){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Suspense fallback={null}>
            <SessionProvider>
              <AppShell>{children}</AppShell>
            </SessionProvider>
          </Suspense>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
