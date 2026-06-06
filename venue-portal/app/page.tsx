'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'
import VenueSignupForm from './components/VenueSignupForm'
import axios from 'axios'
import { getApiUrl } from './utils/api'
import { ArrowRight, Sparkles, Users, TrendingUp, Zap, Crown, Check } from 'lucide-react'

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'AI-Powered Promotions',
    desc: 'Launch a happy hour, flash deal, or VIP special in one tap — AI writes and times it for you.',
  },
  {
    icon: Users,
    title: 'Build Your Community',
    desc: 'Guests check in, earn points, and share nights out. Your venue goes viral every weekend.',
  },
  {
    icon: TrendingUp,
    title: 'Drive Repeat Visits',
    desc: 'Loyalty streaks, shot gifting, and social sharing keep guests coming back — and bringing friends.',
  },
  {
    icon: Zap,
    title: 'Zero Friction Setup',
    desc: 'Go live in minutes. No hardware, no training, no contracts. Just more bodies at the bar.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'Get your venue on the map.',
    features: ['Venue profile & QR code', '1 active promotion', 'Basic check-in tracking'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29/mo',
    desc: 'For venues ready to grow.',
    features: ['Unlimited deals', 'AI-powered deal suggestions', 'Full analytics', 'Recurring deals'],
    cta: 'Start Growing',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$99/mo',
    desc: 'Full AI automation engine.',
    features: ['Everything in Pro', 'Featured placement', 'Advanced automation', 'Priority support'],
    cta: 'Go Full Auto',
    highlight: false,
  },
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  const showForm = mode === 'login' || mode === 'request'

  return (
    <main className="min-h-screen bg-black flex flex-col" suppressHydrationWarning>
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-black to-black pointer-events-none" aria-hidden="true" />

      <div className="relative flex-1 flex flex-col items-center container mx-auto px-4 py-12 w-full max-w-5xl">

        {/* Hero */}
        <div className="text-center mb-10 w-full">
          <p className="text-primary-500/60 text-xs uppercase tracking-[0.25em] font-semibold mb-3">Venue Partner Portal</p>
          <h1 className="text-5xl lg:text-7xl logo-script text-primary-500 mb-4">Shot On Me</h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent mx-auto mb-5" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
            Your venue, packed every night.
          </h2>
          <p className="text-primary-400/60 text-base max-w-lg mx-auto leading-relaxed">
            Shot On Me connects your bar to the local community — AI promotions, social sharing, and loyalty that keeps guests coming back.
          </p>

          {venueSlug && (
            <p className="text-sm text-primary-400/60 mt-3">
              Venue: <span className="text-primary-500 font-semibold">{venueContextName || venueSlug}</span>
            </p>
          )}

          {!showForm && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <button
                onClick={() => setMode('request')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-7 py-3.5 text-sm font-bold text-black hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/25 active:scale-95"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-2 rounded-xl border border-primary-500/30 bg-black/40 px-6 py-3.5 text-sm font-semibold text-primary-400 hover:border-primary-500/60 hover:text-primary-300 transition-all"
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
                ← Back to App
              </a>
            </div>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="w-full max-w-md mx-auto mb-10">
            <div className="bg-black/60 backdrop-blur-sm border border-primary-500/30 rounded-2xl shadow-2xl p-6 md:p-8">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => setMode(null)}
                    className="flex items-center gap-1.5 text-primary-400/60 hover:text-primary-400 text-sm mb-5 transition-colors"
                  >
                    ← Back
                  </button>
                  <LoginForm initialMode="login" hideRegister={true} />
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
          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-primary-500/15 bg-black/40 p-5 hover:border-primary-500/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{title}</p>
                <p className="text-primary-400/55 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pricing */}
        {!showForm && (
          <div className="w-full max-w-4xl mx-auto mb-8">
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest text-primary-500/50 font-semibold mb-2">Simple Pricing</p>
              <h3 className="text-xl font-bold text-white">Start free. Upgrade when you're ready.</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(({ name, price, desc, features, cta, highlight }) => (
                <div
                  key={name}
                  className={`rounded-2xl border p-5 flex flex-col ${
                    highlight
                      ? 'border-primary-500/50 bg-primary-500/8 shadow-lg shadow-primary-500/10'
                      : 'border-primary-500/15 bg-black/40'
                  }`}
                >
                  {highlight && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500 mb-2 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Most Popular
                    </p>
                  )}
                  <p className="text-white font-bold text-base">{name}</p>
                  <p className="text-2xl font-bold text-primary-500 mt-1 mb-0.5">{price}</p>
                  <p className="text-xs text-primary-400/50 mb-4">{desc}</p>
                  <ul className="space-y-2 flex-1 mb-4">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-primary-400/70">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setMode('request')}
                    className={`w-full rounded-xl py-2.5 text-sm font-bold transition-all ${
                      highlight
                        ? 'bg-primary-500 text-black hover:bg-primary-400 shadow-md shadow-primary-500/20'
                        : 'border border-primary-500/30 text-primary-400 hover:border-primary-500/50 hover:text-primary-300'
                    }`}
                  >
                    {cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showForm && (
          <div className="text-center space-y-2">
            <p className="text-primary-400/25 text-xs">
              Currently live in IN · IL · KY · TN · MI · OH
            </p>
            <div className="flex items-center justify-center gap-3 text-primary-400/25 text-xs">
              <a href="/terms" className="hover:text-primary-400/50 transition-colors underline underline-offset-2">Terms</a>
              <span>·</span>
              <a href="/privacy" className="hover:text-primary-400/50 transition-colors underline underline-offset-2">Privacy</a>
              <span>·</span>
              <a href="mailto:venues@shotonme.com" className="hover:text-primary-400/50 transition-colors underline underline-offset-2">Contact</a>
            </div>
            <p className="text-primary-400/20 text-[10px]">
              &copy; 2026 Shot On Me LLC
            </p>
          </div>
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
