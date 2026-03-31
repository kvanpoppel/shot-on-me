'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight, Building2, Eye, EyeOff, Smartphone } from 'lucide-react'
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
        errorMsg = 'Connection timeout. Please try again.'
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('refused')) {
        errorMsg = 'Cannot connect to server. Please try again shortly.'
      } else if (err.response?.status === 401) {
        errorMsg = 'Invalid email or password. Please check your credentials.'
      } else if (err.response?.status === 503) {
        errorMsg = 'Server unavailable. Please try again shortly.'
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
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary-500/7 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10 md:px-8 md:py-14">
        <section className="w-full rounded-3xl border border-primary-500/25 bg-black/70 p-7 md:p-11 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-primary-500/70">
              One platform for guests and venues
            </p>
            <h1 className="mt-3 text-6xl md:text-7xl logo-script text-primary-500 leading-none">Shot On Me</h1>
            <p className="mt-5 text-2xl md:text-3xl text-primary-300/95 font-medium">
              Premium nights for guests. Growth intelligence for venues.
            </p>
            <p className="mt-3 text-sm md:text-base text-primary-500/80">
              Choose your path and continue instantly.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 text-left">
              <div className="rounded-xl border border-primary-500/25 bg-black/45 p-4">
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/12 text-primary-500">
                  <Smartphone className="h-4 w-4" />
                </div>
                <p className="text-xs uppercase tracking-[0.12em] text-primary-400/90">App Experience</p>
                <p className="mt-1 text-sm text-primary-300/95">Social gifting, discovery, and instant rewards.</p>
              </div>
              <div className="rounded-xl border border-primary-500/25 bg-black/45 p-4">
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-500/12 text-primary-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <p className="text-xs uppercase tracking-[0.12em] text-primary-400/90">Venue Growth</p>
                <p className="mt-1 text-sm text-primary-300/95">AI promotions, analytics, and performance tools.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-primary-500/30 bg-black/55 p-4 md:p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-primary-400/85">Choose your portal</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 text-left">
                <div className="group rounded-xl border border-primary-500/35 bg-black/55 px-4 py-4 transition-colors hover:border-primary-500/55 hover:bg-black/65">
                  <p className="text-base font-semibold text-primary-200">App User</p>
                  <p className="mt-1 text-xs text-primary-500/82">Sign in or create an account to continue.</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true)
                        setShowAuthPanel(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors group-hover:bg-primary-400"
                    >
                      Sign In
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false)
                        setShowAuthPanel(true)
                      }}
                      className="text-xs font-semibold text-primary-300/95 hover:text-primary-200"
                    >
                      Create Account
                    </button>
                  </div>
                </div>

                <div className="group rounded-xl border border-primary-500/35 bg-black/55 px-4 py-4 transition-colors hover:border-primary-500/55 hover:bg-black/65">
                  <p className="text-base font-semibold text-primary-200">Venue User</p>
                  <p className="mt-1 text-xs text-primary-500/85">Open your venue workspace and dashboard.</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (venuePortalLoginUrl) {
                          window.location.href = venuePortalLoginUrl
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-primary-500/45 px-3.5 py-1.5 text-xs font-semibold text-primary-300 hover:bg-primary-500/10"
                    >
                      Open Venue Portal
                      <ArrowRight className="h-3.5 w-3.5 text-primary-500" />
                    </button>
                  </div>
                </div>
              </div>
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

