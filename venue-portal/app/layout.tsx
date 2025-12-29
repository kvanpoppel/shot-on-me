import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppWrapper from './components/AppWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Shot On Me - Venue Management Platform',
    template: '%s | Shot On Me'
  },
  description: 'The complete venue management platform with AI-powered analytics, revenue forecasting, and customer engagement tools. Manage promotions, schedules, and grow your business.',
  keywords: ['venue management', 'restaurant management', 'bar management', 'promotions', 'analytics', 'customer engagement', 'AI analytics'],
  authors: [{ name: 'Shot On Me' }],
  creator: 'Shot On Me',
  publisher: 'Shot On Me',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Shot On Me - Venue Management Platform',
    description: 'The complete venue management platform with AI-powered analytics and customer engagement tools.',
    siteName: 'Shot On Me',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shot On Me - Venue Management Platform',
    description: 'The complete venue management platform with AI-powered analytics.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#B8945A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  )
}

