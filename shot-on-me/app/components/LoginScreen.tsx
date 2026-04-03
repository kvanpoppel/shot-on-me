'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, MapPin, X, ArrowRight, Zap, Users, Star } from 'lucide-react'
import ForgotPasswordModal from './ForgotPasswordModal'
import WalletOnboarding from './WalletOnboarding'
import Link from 'next/link'
import { getVenuePortalLoginUrl, getApiUrl } from '../utils/api'
import { createPortal } from 'react-dom'

const FEATURES = [
  {
    icon: '🍺',
    title: 'Send a drink to anyone',
    desc: 'Buy a round for the table or surprise a stranger — all from your phone.',
  },
  {
    icon: '📍',
    title: 'Discover where to be tonight',
    desc: 'See which venues your crew is at and what\'s happening right now.',
  },
  {
    icon: '🎉',
    title: 'Make every night a story',
    desc: 'Check in, connect with friends, and share the moments that matter.',
  },
]

const CITIES = ['All', 'Indianapolis', 'Chicago', 'Louisville', 'Nashville', 'Detroit', 'Columbus']

const CATEGORY_LABEL: Record<string, string> = {
  bar: 'Bar', restaurant: 'Restaurant', club: 'Nightclub', cafe: 'Coffee Shop', other: 'Lounge',
}

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
  const [referrerId, setReferrerId] = useState('')

  // Venue state
  const [publicVenues, setPublicVenues] = useState<any[]>([])
  const [venueCity, setVenueCity] = useState('All')
  const [venuePortalLoginUrl, setVenuePortalLoginUrl] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setVenuePortalLoginUrl(getVenuePortalLoginUrl())
    fetchPublicVenues('All')
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) { setReferrerId(ref); window.history.replaceState({}, '', window.location.pathname) }
    }
  }, [])

  const fetchPublicVenues = async (city: string) => {
    try {
      const q = city && city !== 'All' ? `?city=${encodeURIComponent(city)}` : ''
      const res = await axios.get(`${getApiUrl()}/venues/public${q}`)
      setPublicVenues(res.data.venues || [])
    } catch { setPublicVenues([]) }
  }

  const openSheet = (loginMode: boolean) => {
    setIsLogin(loginMode)
    setError('')
    setSheetOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      try { localStorage.setItem('rememberMe', rememberMe.toString()) } catch {}
      if (isLogin) {
        await login(email, password, rememberMe)
        setJustAuthenticated(true)
        setShowPermissions(true)
      } else {
        if (!acceptedTerms || !acceptedPrivacy) {
          setError('Please accept Terms of Service and Privacy Policy.')
          setLoading(false)
          return
        }
        await register({ email, password, phoneNumber, firstName, lastName, referrerId, acceptedTerms, acceptedPrivacy })
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
    <div className="min-h-screen bg-black text-white pb-24">

      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary-500/8 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-primary-500/5 blur-[80px]" />
        <div className="absolute bottom-1/3 -right-20 w-64 h-64 rounded-full bg-primary-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5">

        {/* ── Hero ── */}
        <div className="pt-14 pb-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary-500/60 font-semibold mb-4">
            The Nightlife Social App
          </p>
          <h1 className="text-7xl logo-script text-primary-500 leading-none mb-5">
            Shot On Me
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent mx-auto mb-5" />
          <p className="text-xl md:text-2xl font-bold text-white leading-snug mb-3">
            Buy someone a drink.<br />
            <span className="text-primary-400">Make a night to remember.</span>
          </p>
          <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
            Send drinks, discover venues, and connect with the people around you — all in one tap.
          </p>

          {/* Social proof pills */}
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-primary-400/70 bg-primary-500/8 border border-primary-500/15 rounded-full px-3 py-1.5">
              <Star className="w-3 h-3 fill-primary-500 text-primary-500" />
              Free to join
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-primary-400/70 bg-primary-500/8 border border-primary-500/15 rounded-full px-3 py-1.5">
              <MapPin className="w-3 h-3 text-primary-500" />
              6 cities &amp; growing
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-primary-400/70 bg-primary-500/8 border border-primary-500/15 rounded-full px-3 py-1.5">
              <Zap className="w-3 h-3 text-primary-500" />
              Instant transfers
            </span>
          </div>
        </div>

        {/* ── Feature cards ── */}
        <div className="grid grid-cols-1 gap-3 mb-10">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-primary-500/12 bg-white/[0.02] backdrop-blur-sm px-4 py-4 hover:border-primary-500/25 hover:bg-white/[0.04] transition-all"
            >
              <span className="text-3xl leading-none flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5">{f.title}</p>
                <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Discover Venues ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Discover Venues</p>
              <p className="text-white/40 text-[11px] mt-0.5">Partner venues near you</p>
            </div>
          </div>

          {/* City tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => { setVenueCity(city); fetchPublicVenues(city) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  venueCity === city
                    ? 'bg-primary-500 text-black border-primary-500 shadow-lg shadow-primary-500/20'
                    : 'bg-black/50 text-white/50 border-white/10 hover:border-primary-500/30 hover:text-white/70'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Venue grid */}
          {publicVenues.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-10 text-center">
              <div className="text-3xl mb-3">🌆</div>
              <p className="text-white/50 text-sm font-medium">Coming Soon to {venueCity === 'All' ? 'your area' : venueCity}</p>
              <p className="text-white/25 text-xs mt-1">We're expanding fast — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {publicVenues.map((venue: any) => {
                const photo = venue.coverPhoto || venue.branding?.logoUrl
                return (
                  <div
                    key={venue._id}
                    className="rounded-xl overflow-hidden border border-white/8 bg-black group cursor-pointer hover:border-primary-500/30 transition-all"
                  >
                    <div className="aspect-[4/3] bg-primary-500/5 relative overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-7 h-7 text-white/10" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-primary-400 border border-primary-500/20 backdrop-blur-sm">
                        {CATEGORY_LABEL[venue.category] || 'Venue'}
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-white font-semibold text-xs truncate">{venue.name}</p>
                      <p className="text-white/35 text-[10px] mt-0.5 truncate">
                        {venue.address?.city}{venue.address?.state ? `, ${venue.address.state}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-white/20 pb-6">
          Currently available in IN · IL · KY · TN · MI · OH
          {venuePortalLoginUrl && (
            <>
              {' · '}
              <a href={venuePortalLoginUrl} className="hover:text-white/40 underline transition-colors">
                Venue Portal
              </a>
            </>
          )}
        </p>
      </div>

      {/* ── Fixed bottom CTA bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/8 px-5 py-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => openSheet(true)}
            className="flex-1 py-3 rounded-xl border border-primary-500/40 text-primary-400 font-semibold text-sm hover:bg-primary-500/10 hover:border-primary-500/60 active:scale-[0.98] transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => openSheet(false)}
            className="flex-[2] py-3 rounded-xl bg-primary-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/25"
          >
            Join Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Auth Bottom Sheet ── */}
      {mounted && sheetOpen && createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-zinc-950 border-t border-primary-500/25 rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-lg leading-none">
                  {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-white/40 text-xs mt-1">
                  {isLogin ? 'Sign in to continue to Shot On Me' : 'Join thousands on Shot On Me'}
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sign In / Join tabs */}
            <div className="flex mx-5 mb-4 bg-white/5 rounded-xl p-1 flex-shrink-0">
              <button
                onClick={() => { setIsLogin(true); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isLogin ? 'bg-primary-500 text-black shadow-sm' : 'text-white/50 hover:text-white/70'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  !isLogin ? 'bg-primary-500 text-black shadow-sm' : 'text-white/50 hover:text-white/70'
                }`}
              >
                Join Free
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-1.5">First Name</label>
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
                        <label className="block text-xs font-medium text-white/60 mb-1.5">Last Name</label>
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
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Phone Number</label>
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
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
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
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      className="login-form-input w-full px-3 py-3 pr-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary-500/60 focus:bg-white/8 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
                      <span className="text-white/40 text-xs">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setSheetOpen(false); setShowForgotPassword(true) }}
                      className="text-primary-400/70 text-xs hover:text-primary-400 transition-colors"
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
                      <span className="text-white/40 text-xs leading-relaxed">
                        I agree to the{' '}
                        <Link href="/terms" target="_blank" className="text-primary-400 hover:underline">Terms of Service</Link>
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
                      <span className="text-white/40 text-xs leading-relaxed">
                        I agree to the{' '}
                        <Link href="/privacy" target="_blank" className="text-primary-400 hover:underline">Privacy Policy</Link>
                      </span>
                    </label>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!isLogin && (!acceptedTerms || !acceptedPrivacy))}
                  className="w-full bg-primary-500 text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-400 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-primary-500/20 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Please wait...</span>
                  ) : isLogin ? (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </div>
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
