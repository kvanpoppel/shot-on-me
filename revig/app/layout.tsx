import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import AppWrapper from './components/AppWrapper'
import Providers from './components/Providers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://revig.shotonme.com'

export const metadata: Metadata = {
  title: 'Revig — Send the moment. Find your spot.',
  description: 'Gift a coffee, juice, or treat to anyone. Discover the best non-alcohol venues near you. Celebrate every moment with Revig.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Revig',
  },
  icons: {
    icon: [
      { url: '/revig-logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Revig — Send the moment. Find your spot.',
    description: 'Gift a coffee, juice, or treat to anyone. Discover the best non-alcohol venues near you.',
    url: APP_URL,
    siteName: 'Revig',
    images: [{ url: `${APP_URL}/og-image.svg`, width: 1200, height: 630, alt: 'Revig' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revig — Send the moment. Find your spot.',
    description: 'Gift a coffee, juice, or treat. Discover non-alcohol venues near you.',
    images: [`${APP_URL}/og-image.svg`],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#C8F135" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Revig" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <AppWrapper>
          <Providers>
            {children}
          </Providers>
        </AppWrapper>
      </body>
    </html>
  )
}
