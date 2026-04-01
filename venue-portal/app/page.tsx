'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'
import VenueSignupForm from './components/VenueSignupForm'
import axios from 'axios'
import { getApiUrl } from './utils/api'
import { ArrowRight, BarChart2, Zap, CreditCard, TrendingUp } from 'lucide-react'

const BENEFITS = [
  { icon: BarChart2, title: 'Guest Analytics', desc: 'See who\'s in your venue, when they arrive, and what drives them back.' },
  { icon: Zap, title: 'AI-Powered Promotions', desc: 'Launch targeted deals in seconds. AI optimizes timing and audience automatically.' },
  { icon: CreditCard, title: 'Instant Redemptions', desc: 'Drinks paid and redeemed in the app — no comps, no paper, no confusion.' },
  { icon: TrendingUp, title: 'Revenue Intelligence', desc: 'Track drink sales, promotion ROI, and peak hours from one simple dashboard.' },
]

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'request' | null>(null)
  const [venueContextName, setVenueContextName] = useState<string | null>(null)
  const venueSlug = searchParams.get('venue')
  const source = searchParams.get('source')
  const requestedReturnTo = searchParams.get('returnTo')

  const appReturnUrl = (() => {
    if (!requestedReturnTo) return 'https://www.shotonme.com'
    try {
      const parsed = new URL(requestedReturnTo)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
    } catch { /* ignore */ }
    return 'https://www.shotonme.com'
  })()

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'login') setMode('login')
    else setMode(null)
  }, [searchParams])

  useEffect(() => {
    const fetchVenueContext = async () => {
      if (!venueSlug) { setVenueContextName(null); return }
      try {
        const response = await axios.get(`${getApiUrl()}/venues/slug/${encodeURIComponent(venueSlug)}/public`)
        setVenueContextName(response.data?.venue?.name || null)
      } catch { setVenueContextName(null) }
    }
    fetchVenueContext()
  }, [venueSlug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const showForm = mode === 'login' || mode === 'request'

  return (
    <main className="min-h-screen bg-black flex flex-col" suppressHydrationWarning>
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-black to-black pointer-events-none" aria-hidden="true" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-500/3 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col items-center justify-center container mx-auto px-4 py-12 w-full max-w-5xl">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in w-full">
          <p className="text-primary-500/60 text-xs uppercase tracking-[0.25em] font-semibold mb-3">Venue Partner Portal</p>
          <h1 className="text-5xl lg:text-7xl logo-script text-primary-500 mb-3">Shot On Me</h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent mx-auto mb-5" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
            Grow Your Venue with Shot On Me
          </h2>
          <p className="text-primary-400/70 text-base max-w-xl mx-auto leading-relaxed">
            The platform that connects your venue to local guests, drives repeat visits, and puts drink revenue on autopilot.
          </p>

          {venueSlug && (
            <p className="text-sm text-primary-400/60 mt-3">
              Venue: <span className="text-primary-500 font-semibold">{venueContextName || venueSlug}</span>
            </p>
          )}

          {/* CTA Buttons */}
          {!showForm && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <button
                onClick={() => setMode('request')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-bold text-black transition-all hover:bg-primary-400 active:scale-95 shadow-lg shadow-primary-500/20"
              >
                Request Access
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-2 rounded-xl border border-primary-500/30 bg-black/40 px-6 py-3 text-sm font-semibold text-primary-400 hover:border-primary-500/60 hover:text-primary-300 transition-all"
              >
                Sign In
              </button>
            </div>
          )}

          {(source === 'app' || source === 'logout') && !showForm && (
            <div className="mt-4">
              <a
                href={appReturnUrl}
                className="inline-flex items-center rounded-lg border border-primary-500/20 bg-black/30 px-4 py-2 text-xs font-medium text-primary-400/70 hover:text-primary-400 transition-colors"
              >
                ← Back to App User Login
              </a>
            </div>
          )}
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="w-full max-w-md mx-auto animate-fade-in mb-10">
            <div className="bg-black/60 backdrop-blur-sm border border-primary-500/30 rounded-2xl shadow-2xl shadow-black/60 p-6 md:p-8">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => setMode(null)}
                    className="flex items-center gap-1.5 text-primary-400/60 hover:text-primary-400 text-sm mb-5 transition-colors"
                  >
                    ← Back
                  </button>
                  <LoginForm initialMode="login" />
                </>
              )}
              {mode === 'request' && (
                <VenueSignupForm onBack={() => setMode(null)} />
              )}
            </div>
          </div>
        )}

        {/* Benefits grid */}
        {!showForm && (
          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-primary-500/15 bg-black/40 p-5 hover:border-primary-500/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-primary-400/60 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        {!showForm && (
          <p className="text-primary-400/30 text-xs mt-8 text-center">
            Currently available in IN · IL · KY · TN · MI · OH
          </p>
        )}
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
