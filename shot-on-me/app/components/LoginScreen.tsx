'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, MapPin, X, ArrowRight, Building2, AlertCircle, Send, Sparkles, Users, ShieldCheck } from 'lucide-react'
import ForgotPasswordModal from './ForgotPasswordModal'
import WalletOnboarding from './WalletOnboarding'
import { getVenuePortalLoginUrl, getApiUrl } from '../utils/api'
import { createPortal } from 'react-dom'

const FEATURES = [
  {
    title: 'Send a drink to anyone',
    desc: 'Buy a round for the table or surprise a stranger — all from your phone.',
  },
  {
    title: 'Discover where to be tonight',
    desc: 'See which venues your crew is at and what\'s happening right now.',
  },
  {
    title: 'Make every night a story',
    desc: 'Check in, connect with friends, and share the moments that matter.',
  },
]

const FEATURE_ICONS = [
  <Send className="w-5 h-5 text-primary-500" />,
  <MapPin className="w-5 h-5 text-primary-500" />,
  <Sparkles className="w-5 h-5 text-primary-500" />,
]


const CATEGORY_LABEL: Record<string, string> = {
  bar: 'Bar', restaurant: 'Restaurant', club: 'Nightclub', cafe: 'Coffee Shop', other: 'Lounge',
}

// Negative delays so every bubble is already mid-rise on page load — truly continuous
const BUBBLES = [
  { size: 5,  left: 4,  delay: -2,    duration: 8  },
  { size: 8,  left: 9,  delay: -5.5,  duration: 11 },
  { size: 4,  left: 15, delay: -1,    duration: 7  },
  { size: 11, left: 21, delay: -8,    duration: 13 },
  { size: 5,  left: 28, delay: -3.5,  duration: 9  },
  { size: 6,  left: 34, delay: -6,    duration: 10 },
  { size: 9,  left: 40, delay: -0.5,  duration: 12 },
  { size: 4,  left: 46, delay: -4,    duration: 7  },
  { size: 7,  left: 52, delay: -7,    duration: 10 },
  { size: 5,  left: 58, delay: -2.5,  duration: 8  },
  { size: 10, left: 63, delay: -9,    duration: 13 },
  { size: 4,  left: 69, delay: -1.5,  duration: 7  },
  { size: 8,  left: 74, delay: -5,    duration: 11 },
  { size: 6,  left: 79, delay: -3,    duration: 9  },
  { size: 12, left: 84, delay: -7.5,  duration: 14 },
  { size: 5,  left: 89, delay: -0.8,  duration: 8  },
  { size: 7,  left: 93, delay: -4.5,  duration: 10 },
  { size: 4,  left: 11, delay: -6.5,  duration: 8  },
  { size: 6,  left: 37, delay: -10,   duration: 12 },
  { size: 9,  left: 55, delay: -3.8,  duration: 11 },
  { size: 5,  left: 72, delay: -8.5,  duration: 9  },
  { size: 7,  left: 96, delay: -2.2,  duration: 10 },
]

export default function LoginScreen() {
  const { login, register } = useAuth()

  // Auth state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('savedEmail') || '' } catch { return '' }
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [justAuthenticated, setJustAuthenticated] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [showAgeGate, setShowAgeGate] = useState(false)
  const [ageBlocked, setAgeBlocked] = useState(false)
  const [referrerId, setReferrerId] = useState('')
  const [legalModal, setLegalModal] = useState<null | 'terms' | 'privacy'>(null)

  // Venue state
  const [publicVenues, setPublicVenues] = useState<any[]>([])
  const [venuePortalLoginUrl, setVenuePortalLoginUrl] = useState('')
  const [mounted, setMounted] = useState(false)
  const [shotsThisWeek, setShotsThisWeek] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    setVenuePortalLoginUrl(getVenuePortalLoginUrl())
    fetchPublicVenues()
    fetchShotsCount()
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) { setReferrerId(ref); window.history.replaceState({}, '', window.location.pathname) }
    }
  }, [])

  const fetchShotsCount = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/payments/stats/public`)
      setShotsThisWeek(res.data.shotsThisWeek || 0)
    } catch { /* silent */ }
  }

  const fetchPublicVenues = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/venues/public`)
      setPublicVenues(res.data.venues || [])
    } catch { setPublicVenues([]) }
  }

  const openSheet = (loginMode: boolean) => {
    setIsLogin(loginMode)
    setError('')
    if (!loginMode && !ageConfirmed) {
      setShowAgeGate(true)
      setAgeBlocked(false)
      return
    }
    setSheetOpen(true)
  }

  const handleAgeYes = () => {
    setAgeConfirmed(true)
    setShowAgeGate(false)
    setSheetOpen(true)
  }

  const handleAgeNo = () => {
    setAgeBlocked(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      try { localStorage.setItem('rememberMe', rememberMe.toString()) } catch {}
      if (isLogin) {
        await login(email, password, rememberMe)
      } else {
        if (!acceptedTerms || !acceptedPrivacy) {
          setError('Please accept Terms of Service and Privacy Policy.')
          setLoading(false)
          return
        }
        await register({ email, password, phoneNumber, firstName, lastName, referrerId, acceptedTerms, acceptedPrivacy, ageConfirmed })
        try { localStorage.setItem('rememberMe', rememberMe.toString()) } catch {}
        setJustAuthenticated(true)
        setShowPermissions(true)
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed'
      if (err.response?.status === 401) msg = 'Invalid email or password.'
      else if (err.response?.status === 503) msg = 'Server unavailable. Try again shortly.'
      else if (err.code === 'ECONNABORTED' || msg.includes('timeout')) msg = 'Connection timeout. Try again.'
      setError(msg)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Floating drink bubbles ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              bottom: '-20px',
              background: 'radial-gradient(circle at 35% 35%, rgba(184,148,90,0.45), rgba(184,148,90,0.06))',
              border: '1px solid rgba(184,148,90,0.25)',
              animationName: 'bubble-rise',
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationFillMode: 'both',
            }}
          />
        ))}
        {/* Ambient glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary-500/8 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-primary-500/5 blur-[80px]" />
        <div className="absolute bottom-1/3 -right-20 w-64 h-64 rounded-full bg-primary-500/5 blur-[80px]" />
      </div>

      {/* Auth buttons removed — hero CTAs handle sign-in/join */}

      <div className="relative z-10 max-w-lg mx-auto px-5">

        {/* ── Hero ── */}
        <div className="pt-20 pb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary-500/55 font-semibold mb-4">
            The Nightlife Social App
          </p>
          <h1 className="text-7xl leading-none mb-4">
            <span className="brand-wordmark-wrap" data-text="Shot On Me"><span className="brand-wordmark">Shot On Me</span></span>
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent mx-auto mb-4" />
          <p className="text-xl font-bold text-white/82 leading-snug mb-6">
            Buy someone a drink.<br />
            <span className="text-primary-400">Make a night to remember.</span>
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <button
              onClick={() => openSheet(false)}
              className="w-full bg-primary-500 text-black px-8 py-4 rounded-2xl font-bold text-base hover:bg-primary-400 active:scale-[0.97] transition-all shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              Join Free <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => openSheet(true)}
              className="w-full border border-primary-500/25 text-primary-400 px-8 py-3.5 rounded-2xl font-semibold text-sm hover:bg-primary-500/8 active:scale-[0.97] transition-all"
            >
              Already have an account? Sign In
            </button>
          </div>

          {/* Social proof */}
          {shotsThisWeek !== null && shotsThisWeek > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-primary-500/60" />
              <span className="text-white/35">
                <span className="text-primary-400 font-semibold">{shotsThisWeek.toLocaleString()}</span> shots sent this week
              </span>
            </div>
          )}
        </div>

        {/* ── Discover Venues — directly under slogan ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
            </div>
            <div>
              <p className="text-white/85 font-bold text-sm leading-none">Discover Venues</p>
              <p className="text-white/38 text-[11px] mt-0.5">Works at any tap & pay venue</p>
            </div>
          </div>

          {/* Auto-scrolling city carousel */}
          {/* Horizontal venue card strip */}
          {publicVenues.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-9 text-center">
              <Building2 className="w-8 h-8 text-white/12 mx-auto mb-3" />
              <p className="text-white/48 text-sm font-medium">
                Venues coming soon to your area
              </p>
              <p className="text-white/22 text-xs mt-1">We're expanding fast — check back soon.</p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {publicVenues.map((venue: any) => {
                const photo = venue.coverPhoto || venue.branding?.logoUrl
                return (
                  <div
                    key={venue._id}
                    className="flex-shrink-0 w-36 snap-start rounded-xl overflow-hidden border border-white/8 bg-black group cursor-pointer hover:border-primary-500/40 active:scale-[0.97] transition-all duration-200"
                  >
                    <div className="aspect-[3/4] bg-primary-500/5 relative overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-white/10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/70 text-primary-400 border border-primary-500/20 backdrop-blur-sm leading-tight">
                        {CATEGORY_LABEL[venue.category] || 'Venue'}
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
                        <p className="text-white/88 font-bold text-xs leading-tight truncate">{venue.name}</p>
                        <p className="text-white/48 text-[10px] mt-0.5 truncate">
                          {venue.address?.city}{venue.address?.state ? `, ${venue.address.state}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Features ── */}
        <div className="mb-10 space-y-3">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/6 hover:border-primary-500/20 hover:bg-white/[0.05] transition-all group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/25 transition-colors">
                {FEATURE_ICONS[i]}
              </div>
              <div className="pt-0.5">
                <p className="text-white/85 font-semibold text-sm leading-snug mb-1">{f.title}</p>
                <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-white/18 pb-10 leading-relaxed space-y-2">
          <p>
            Available in IN · IL · KY · TN · MI · OH
            {venuePortalLoginUrl && (
              <>
                {' · '}
                <a href={venuePortalLoginUrl} className="hover:text-white/38 underline transition-colors">
                  Venue Portal
                </a>
              </>
            )}
          </p>
          <p>
            <a href="/terms" className="hover:text-white/38 underline transition-colors">Terms</a>
            {' · '}
            <a href="/privacy" className="hover:text-white/38 underline transition-colors">Privacy</a>
            {' · '}
            <a href="mailto:support@shotonme.com" className="hover:text-white/38 underline transition-colors">Contact</a>
          </p>
          <p className="text-white/12">&copy; {new Date().getFullYear()} Shot On Me LLC</p>
        </div>
      </div>

      {/* ── 21+ Age Gate ── */}
      {mounted && showAgeGate && createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/72 backdrop-blur-sm"
            onClick={() => setShowAgeGate(false)}
          />
          <div className="relative bg-zinc-950 border-t border-primary-500/25 rounded-t-3xl shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>
            <div className="px-5 pb-8 pt-2">
              {!ageBlocked ? (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                      <h2 className="text-white/88 font-bold text-lg leading-none">Age Verification</h2>
                      <p className="text-white/38 text-xs mt-1">Required to create an account</p>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    Are you 21 years of age or older?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAgeNo}
                      className="flex-1 border border-white/15 text-white/60 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/5 active:scale-[0.97] transition-all"
                    >
                      No
                    </button>
                    <button
                      onClick={handleAgeYes}
                      className="flex-[2] bg-primary-500 text-black py-3.5 rounded-xl font-bold text-sm hover:bg-primary-400 active:scale-[0.97] transition-all shadow-lg shadow-primary-500/20"
                    >
                      Yes, I'm 21 or older
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-white/88 font-bold text-lg leading-none">Age Requirement</h2>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    You must be 21 years or older to use Shot On Me. If you believe this is an error, please contact{' '}
                    <a href="mailto:support@shotonme.com" className="text-primary-400 hover:underline">support@shotonme.com</a>.
                  </p>
                  <button
                    onClick={() => setShowAgeGate(false)}
                    className="w-full border border-white/15 text-white/60 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/5 active:scale-[0.97] transition-all"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Auth Bottom Sheet ── */}
      {mounted && sheetOpen && createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/72 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-zinc-950 border-t border-primary-500/25 rounded-t-3xl shadow-2xl">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-white/88 font-bold text-lg leading-none">
                  {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-white/38 text-xs mt-1">
                  {isLogin ? 'Sign in to continue to Shot On Me' : 'Join thousands on Shot On Me'}
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/48 hover:text-white hover:bg-white/15 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto overscroll-contain px-5 pb-6 max-h-[340px]">
              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/55 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="First"
                          required
                          className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/55 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Last"
                          required
                          className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/55 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        required
                        className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-white/55 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="login-form-input w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/55 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      className="login-form-input w-full px-3 py-3 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/58 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {isLogin ? (
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="bg-black accent-primary-500"
                        style={{ accentColor: '#B8945A' }}
                      />
                      <span className="text-white/38 text-xs">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setSheetOpen(false); setShowForgotPassword(true) }}
                      className="text-primary-400/65 text-xs hover:text-primary-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 mt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={e => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 accent-primary-500"
                        style={{ accentColor: '#B8945A' }}
                      />
                      <span className="text-white/38 text-xs leading-relaxed">
                        I agree to the{' '}
                        <button type="button" onClick={() => setLegalModal('terms')} className="text-primary-400 hover:underline">Terms of Service</button>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={e => setAcceptedPrivacy(e.target.checked)}
                        className="mt-0.5 accent-primary-500"
                        style={{ accentColor: '#B8945A' }}
                      />
                      <span className="text-white/38 text-xs leading-relaxed">
                        I agree to the{' '}
                        <button type="button" onClick={() => setLegalModal('privacy')} className="text-primary-400 hover:underline">Privacy Policy</button>
                      </span>
                    </label>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/8 border border-red-500/25 text-red-300 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!isLogin && (!acceptedTerms || !acceptedPrivacy))}
                  className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-primary-500/20 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Please wait...
                    </span>
                  ) : isLogin ? (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                {/* Switch mode */}
                <p className="text-center text-xs text-white/30 pt-4">
                  {isLogin ? (
                    <>New here?{' '}
                      <button type="button" onClick={() => { setIsLogin(false); setError('') }} className="text-primary-400/80 hover:text-primary-400 font-semibold transition-colors">
                        Join Free
                      </button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <button type="button" onClick={() => { setIsLogin(true); setError('') }} className="text-primary-400/80 hover:text-primary-400 font-semibold transition-colors">
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Legal read-only modal */}
      {legalModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary-500/20 flex-shrink-0">
            <h2 className="text-primary-500 font-bold text-base">
              {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </h2>
            <button
              onClick={() => setLegalModal(null)}
              className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/48 hover:text-white hover:bg-white/15 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Scrollable content via iframe */}
          <iframe
            src={legalModal === 'terms' ? '/terms' : '/privacy'}
            className="flex-1 w-full border-none bg-black"
            title={legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          />
          {/* Close CTA at bottom */}
          <div className="px-5 py-4 border-t border-primary-500/20 flex-shrink-0">
            <button
              onClick={() => setLegalModal(null)}
              className="w-full bg-primary-500 text-black py-3 rounded-xl font-bold text-sm hover:bg-primary-400 transition-all"
            >
              Done — Return to Sign Up
            </button>
          </div>
        </div>,
        document.body
      )}

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {showPermissions && justAuthenticated && (
        <WalletOnboarding
          showOnMount={true}
          onComplete={() => {
            setShowPermissions(false)
            setJustAuthenticated(false)
          }}
        />
      )}
    </div>
  )
}
