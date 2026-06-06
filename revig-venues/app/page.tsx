'use client'

import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import BottomNav, { Tab } from './components/BottomNav'
import DashboardHome from './components/DashboardHome'
import DealsTab from './components/DealsTab'
import RedemptionsTab from './components/RedemptionsTab'
import PayoutsTab from './components/PayoutsTab'
import SettingsTab from './components/SettingsTab'
import { ArrowRight, Sparkles, Users, TrendingUp, Zap, Crown, Check } from 'lucide-react'

/* ── Revig design tokens ── */
const LIME   = '#C8F135'
const CYAN   = '#00D4FF'
const CORAL  = '#FF5F57'
const BG     = '#0F0F1E'
const CARD   = '#1A1A2E'

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'AI-Powered Deals',
    desc: 'Our AI analyses your sales data and creates perfectly-timed deals — no guesswork, just results.',
    accent: LIME,
  },
  {
    icon: Users,
    title: 'Build Your Community',
    desc: 'Customers discover your venue through the Revig app, check in, and share with friends.',
    accent: CYAN,
  },
  {
    icon: TrendingUp,
    title: 'Drive Repeat Visits',
    desc: 'Recurring deals, smart reminders, and social sharing keep guests coming back every week.',
    accent: LIME,
  },
  {
    icon: Zap,
    title: 'Zero Friction Setup',
    desc: 'Go live in minutes. No hardware, no training, no contracts. Just more customers through the door.',
    accent: CYAN,
  },
]

const PLANS = [
  {
    name: 'Starter',
    tier: 'free',
    price: '$0',
    priceSub: '12-week trial',
    desc: 'Get your venue on the map.',
    features: [
      '2 active deals',
      'Bank payouts',
      'Staff access',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    tier: 'basic',
    price: '$29',
    priceSub: '/mo',
    desc: 'For venues ready to grow.',
    features: [
      'Unlimited deals',
      'AI-powered deal suggestions',
      'Full analytics',
      'Recurring deals',
    ],
    cta: 'Start Growing',
    highlight: true,
  },
  {
    name: 'Business',
    tier: 'premium',
    price: '$99',
    priceSub: '/mo',
    desc: 'Full AI automation engine.',
    features: [
      'Everything in Pro',
      'Featured placement',
      'Priority support',
    ],
    cta: 'Go Full Auto',
    highlight: false,
  },
]

/* ── Landing page for non-logged-in users ── */
function LandingPage() {
  const [showLogin, setShowLogin] = useState(false)

  if (showLogin) return <LoginScreen />

  return (
    <main className="min-h-screen flex flex-col" style={{ background: BG, fontFamily: 'Poppins, sans-serif' }}>
      {/* Ambient gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,241,53,0.06), transparent)` }}
      />

      <div className="relative flex-1 flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-12 w-full">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${LIME}, ${CYAN})` }}
          >
            🧋
          </div>

          <p
            className="text-xs uppercase tracking-[0.25em] font-semibold mb-3"
            style={{ color: `${LIME}90` }}
          >
            Venue Partner Portal
          </p>

          <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tight">
            <span style={{ color: LIME }}>Re</span>
            <span style={{ color: CORAL }}>vig</span>
            <span className="text-white"> for Venues</span>
          </h1>

          <div
            className="h-px w-24 mx-auto mb-5"
            style={{ background: `linear-gradient(to right, transparent, ${LIME}60, transparent)` }}
          />

          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 tracking-tight">
            Grow your venue with Revig
          </h2>

          <p className="text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            AI-powered deals for cafes, juice bars, boba shops, and every non-alcohol venue.
            More customers, smarter promotions, zero hassle.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a
              href="https://revig.shotonme.com/venue-signup"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold transition-all active:scale-95"
              style={{
                background: LIME,
                color: BG,
                boxShadow: `0 8px 32px ${LIME}30`,
              }}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => setShowLogin(true)}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all"
              style={{
                background: 'transparent',
                color: LIME,
                border: `1px solid ${LIME}40`,
              }}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* ── Benefits grid ── */}
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {BENEFITS.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="rounded-xl p-5 transition-colors"
              style={{
                background: `${CARD}`,
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${accent}30`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
              >
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
              <p className="text-white font-semibold text-sm mb-1">{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Pricing ── */}
        <div className="w-full max-w-4xl mx-auto mb-12">
          <div className="text-center mb-6">
            <p
              className="text-xs uppercase tracking-widest font-semibold mb-2"
              style={{ color: `${LIME}60` }}
            >
              Simple Pricing
            </p>
            <h3 className="text-xl font-bold text-white">Start free. Upgrade when you&apos;re ready.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(({ name, price, priceSub, desc, features, cta, highlight }) => (
              <div
                key={name}
                className="rounded-2xl p-5 flex flex-col"
                style={{
                  background: highlight ? `${LIME}08` : CARD,
                  border: highlight ? `1px solid ${LIME}40` : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: highlight ? `0 4px 24px ${LIME}10` : 'none',
                }}
              >
                {highlight && (
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1"
                    style={{ color: LIME }}
                  >
                    <Crown className="w-3 h-3" /> Most Popular
                  </p>
                )}
                <p className="text-white font-bold text-base">{name}</p>
                <div className="mt-1 mb-0.5">
                  <span className="text-2xl font-bold" style={{ color: LIME }}>{price}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{priceSub}</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
                <ul className="space-y-2 flex-1 mb-4">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://revig.shotonme.com/venue-signup"
                  className="w-full rounded-xl py-2.5 text-sm font-bold transition-all text-center block"
                  style={highlight ? {
                    background: LIME,
                    color: BG,
                    boxShadow: `0 4px 16px ${LIME}20`,
                  } : {
                    background: 'transparent',
                    color: LIME,
                    border: `1px solid ${LIME}25`,
                  }}
                >
                  {cta}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center space-y-2 mt-auto">
          <div className="flex items-center justify-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <a href="/terms" className="underline underline-offset-2 transition-colors hover:text-white/40">Terms</a>
            <span>&middot;</span>
            <a href="/privacy" className="underline underline-offset-2 transition-colors hover:text-white/40">Privacy</a>
            <span>&middot;</span>
            <a href="mailto:venues@shotonme.com" className="underline underline-offset-2 transition-colors hover:text-white/40">Contact</a>
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
            &copy; 2026 Shot On Me LLC
          </p>
        </div>
      </div>
    </main>
  )
}

/* ── Authenticated dashboard shell ── */
function RevigVenuesApp() {
  const { user, loading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  useEffect(() => { setIsMounted(true) }, [])

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl animate-float" style={{ background: `linear-gradient(135deg, ${LIME}, ${CYAN})` }}>
            🧋
          </div>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: LIME, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <LandingPage />

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG }}>
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 safe-top border-b" style={{ background: CARD, borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-lg font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span style={{ color: LIME }}>Re</span><span style={{ color: CORAL }}>vig</span>
          <span className="text-white text-sm font-semibold ml-1.5 opacity-50">Venues</span>
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: LIME }} title="Connected" />
      </div>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'dashboard'   && <DashboardHome />}
        {activeTab === 'deals'       && <DealsTab />}
        {activeTab === 'redemptions' && <RedemptionsTab />}
        {activeTab === 'payouts'     && <PayoutsTab />}
        {activeTab === 'settings'    && <SettingsTab />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <RevigVenuesApp />
    </AuthProvider>
  )
}
