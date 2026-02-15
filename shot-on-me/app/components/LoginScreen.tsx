'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight, Building2, Eye, EyeOff, ShieldCheck, Smartphone, Sparkles, TrendingUp, Users2 } from 'lucide-react'
import ForgotPasswordModal from './ForgotPasswordModal'
import WalletOnboarding from './WalletOnboarding'
import Link from 'next/link'
import { getVenuePortalLoginUrl } from '../utils/api'

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState(() => {
    // Auto-fill email if remembered
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('savedEmail') || ''
      } catch (err) {
        return ''
      }
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
  const [rememberMe, setRememberMe] = useState(() => {
    // Check if user previously chose to be remembered
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rememberMe')
        return saved === 'true' || saved === null // Default to true for better UX
      } catch (err) {
        return true // Default to true on error
      }
    }
    return true // Default to true
  })
  const { login, register } = useAuth()
  const [referrerId, setReferrerId] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [venuePortalLoginUrl, setVenuePortalLoginUrl] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)

  // Capture ?ref= (user ID) from invite link – backend attributes referral by user ID, no visible code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get('ref')
      if (ref) {
        setReferrerId(ref)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    setVenuePortalLoginUrl(getVenuePortalLoginUrl())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Save remember me preference
      try {
        localStorage.setItem('rememberMe', rememberMe.toString())
      } catch (err) {
        // Tracking prevention or localStorage blocked - continue anyway
      }
      
      if (isLogin) {
        await login(email, password, rememberMe)
        // Show permissions after login (if not shown before)
        setJustAuthenticated(true)
        setShowPermissions(true)
      } else {
        if (!acceptedTerms || !acceptedPrivacy) {
          setError('You must accept Terms of Service and Privacy Policy to continue.')
          setLoading(false)
          return
        }
        await register({ email, password, phoneNumber, firstName, lastName, referrerId, acceptedTerms, acceptedPrivacy })
        // Also save remember me for registration
        try {
          localStorage.setItem('rememberMe', rememberMe.toString())
        } catch (err) {
          // Tracking prevention or localStorage blocked - continue anyway
        }
        // Show enhanced permissions after successful registration
        setJustAuthenticated(true)
        setShowPermissions(true)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      let errorMsg = err.message || 'Authentication failed'
      
      // Provide more helpful error messages
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = 'Connection timeout. The backend server may not be running. Please check the backend PowerShell window.'
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('refused')) {
        errorMsg = 'Cannot connect to backend server. Please ensure the backend is running on port 5000.'
      } else if (err.response?.status === 401) {
        errorMsg = 'Invalid email or password. Please check your credentials.'
      } else if (err.response?.status === 503) {
        errorMsg = 'Backend server is unavailable. Please check if the server is running and MongoDB is connected.'
      }
      
      setError(errorMsg)
      // Keep error visible for 5 seconds
      setTimeout(() => {
        setError('')
      }, 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-primary-500">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-primary-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-500/6 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-6 md:py-12">
        <section className="w-full rounded-2xl border border-primary-500/25 bg-black/65 p-5 md:p-7 backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/35 bg-black/60 px-3 py-1 text-[11px] uppercase tracking-wide text-primary-400">
              <Sparkles className="h-3.5 w-3.5" />
              Premium app + venue platform
            </div>

            <h1 className="mt-4 text-5xl md:text-6xl logo-script text-primary-500">Shot On Me</h1>
            <p className="mt-3 text-xl md:text-2xl text-primary-300/95 font-medium">
              One brand. Two powerful experiences.
            </p>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-primary-500/85">
              Social payments and nightlife discovery for users, plus AI-powered promotions and analytics for venue teams.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-primary-500/30 bg-black/55 p-3">
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/15 text-primary-500">
                  <Smartphone className="h-4 w-4" />
                </div>
                <p className="text-[11px] uppercase tracking-wide text-primary-400/80">App Experience</p>
                <p className="mt-1 text-xs text-primary-500">Send drinks, discover venues, and grow your social circle.</p>
              </div>
              <div className="rounded-xl border border-primary-500/30 bg-black/55 p-3">
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/15 text-primary-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <p className="text-[11px] uppercase tracking-wide text-primary-400/80">Venue Growth</p>
                <p className="mt-1 text-xs text-primary-500">Launch AI deals, track revenue, and activate repeat visits.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-primary-500/35 bg-black/75 p-3">
              <p className="text-[11px] uppercase tracking-wide text-primary-400/80 mb-2 text-center">Choose your portal</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true)
                    setShowAuthPanel(true)
                  }}
                  className="group rounded-lg border border-primary-500/45 bg-primary-500 px-4 py-3 text-left transition-all hover:bg-primary-400"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-black">App User</span>
                    <ArrowRight className="h-4 w-4 text-black transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-[11px] text-black/80">Instant social payments and rewards.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (venuePortalLoginUrl) {
                      window.location.href = venuePortalLoginUrl
                    }
                  }}
                  className="group rounded-lg border border-primary-500/60 bg-black/40 px-4 py-3 text-left transition-all hover:bg-primary-500/12"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary-400">Venue User</span>
                    <ArrowRight className="h-4 w-4 text-primary-500 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-[11px] text-primary-500/85">AI-led campaigns and owner control center.</p>
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setShowAuthPanel(true)
                }}
                className="rounded-lg border border-primary-500/45 bg-black/40 px-4 py-2 text-xs font-semibold text-primary-400 hover:bg-primary-500/10"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setShowAuthPanel(true)
                }}
                className="rounded-lg border border-primary-500/45 bg-black/40 px-4 py-2 text-xs font-semibold text-primary-400 hover:bg-primary-500/10"
              >
                Create Account
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-primary-500/20 bg-black/45 p-2.5">
                <div className="flex items-center gap-2 text-primary-400/85">
                  <Users2 className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-wide">Community</span>
                </div>
                <p className="mt-1 text-xs text-primary-500/85">Built for repeat engagement.</p>
              </div>
              <div className="rounded-lg border border-primary-500/20 bg-black/45 p-2.5">
                <div className="flex items-center gap-2 text-primary-400/85">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-wide">Performance</span>
                </div>
                <p className="mt-1 text-xs text-primary-500/85">Revenue-focused by design.</p>
              </div>
              <div className="rounded-lg border border-primary-500/20 bg-black/45 p-2.5">
                <div className="flex items-center gap-2 text-primary-400/85">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="text-[11px] uppercase tracking-wide">Trust</span>
                </div>
                <p className="mt-1 text-xs text-primary-500/85">Secure authentication flows.</p>
              </div>
            </div>
        </section>
      </div>

      {showAuthPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-primary-500/60 bg-black/95 p-5 md:p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-primary-400">{isLogin ? 'App User Sign In' : 'Create App Account'}</p>
              <button
                type="button"
                onClick={() => setShowAuthPanel(false)}
                className="rounded-md border border-primary-500/35 px-2 py-1 text-xs text-primary-400 hover:bg-primary-500/10"
              >
                Close
              </button>
            </div>

            {/* Toggle between Sign In and Sign Up */}
            <div className="flex mb-6 border-b border-primary-500/20">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-center text-sm font-semibold transition-colors ${
                  isLogin
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-primary-400 hover:text-primary-500'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-center text-sm font-semibold transition-colors ${
                  !isLogin
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-primary-400 hover:text-primary-500'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-primary-500 text-sm font-medium mb-1">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        required
                        className="w-full px-3 py-2.5 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-primary-500 text-sm font-medium mb-1">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        required
                        className="w-full px-3 py-2.5 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-primary-500 text-sm font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      required
                      className="w-full px-3 py-2.5 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="login-form-input w-full px-3 py-2.5 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    className="login-form-input w-full px-3 py-2.5 pr-11 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary-500 hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2 border-primary-500 text-primary-500 focus:ring-primary-500 bg-black accent-primary-500 cursor-pointer"
                    style={{ accentColor: '#D4AF37' }}
                  />
                  <span className="text-primary-400 text-sm">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowForgotPassword(true)
                  }}
                  className="text-primary-500 text-sm hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {!isLogin && (
                <div className="space-y-3 rounded-lg border border-primary-500/20 bg-black/40 p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 border-primary-500 text-primary-500 focus:ring-primary-500 bg-black accent-primary-500"
                      style={{ accentColor: '#D4AF37' }}
                    />
                    <span className="text-primary-400 text-xs leading-relaxed">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-primary-500 hover:underline">
                        Terms of Service
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 border-primary-500 text-primary-500 focus:ring-primary-500 bg-black accent-primary-500"
                      style={{ accentColor: '#D4AF37' }}
                    />
                    <span className="text-primary-400 text-xs leading-relaxed">
                      I agree to the{' '}
                      <Link href="/privacy" target="_blank" className="text-primary-500 hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>
              )}

              {error && (
                <div className="bg-red-900/90 border-2 border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!isLogin && (!acceptedTerms || !acceptedPrivacy))}
                className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* Wallet Onboarding - Show after login or registration (PRIMARY ONBOARDING) */}
      {showPermissions && justAuthenticated && (
        <WalletOnboarding
          showOnMount={true}
          onComplete={() => {
            setShowPermissions(false)
            setJustAuthenticated(false)
            // Don't use router.push - the app uses state-based navigation
            // The page.tsx will automatically show the dashboard when user is set
          }}
        />
      )}
    </div>
  )
}

