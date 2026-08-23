import type { Metadata } from 'next'
import type { ReactNode } from 'react'
// Removed Inter font import to prevent hydration mismatches - using CSS font instead
import './globals.css'
import { headers } from 'next/headers'
import AppWrapper from './components/AppWrapper'
import Providers from './components/Providers'
import CookieConsent from './components/CookieConsent'

export const metadata: Metadata = {
  title: 'Shot On Me - Send Money, Share Moments',
  description: 'Send money to friends for use at venues. Discover friends nearby and share your moments.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Shot On Me',
  },
  icons: {
    icon: [
      { url: '/app-icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/app-icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/app-icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  // Reading x-nonce makes Next.js apply it to its own injected inline scripts,
  // which is required for the nonce-based CSP set in middleware.ts to work.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0C0B10" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Shot On Me" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700;800&display=swap" />
        <link rel="preload" href="/app-icons/icon-192.png" as="image" type="image/png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/app-icons/apple-touch-icon-180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/app-icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/app-icons/favicon-16.png" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <AppWrapper>
          <Providers>
            {children}
          </Providers>
          <CookieConsent />
        </AppWrapper>
      </body>
    </html>
  )
}
