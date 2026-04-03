'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, MapPin } from 'lucide-react'
import ForgotPasswordModal from './ForgotPasswordModal'
import WalletOnboarding from './WalletOnboarding'
import Link from 'next/link'
import { getVenuePortalLoginUrl, getApiUrl } from '../utils/api'

export default function LoginScreen() {
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
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rememberMe')
        return saved === 'true' || saved === null
      } catch { return true }
    }
    return true
  })
  const { login, register } = useAuth()
  const [referrerId, setReferrerId] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [venuePortalLoginUrl, setVenuePortalLoginUrl] = useState('')
  const [publicVenues, setPublicVenues] = useState<any[]>([])
  const [venueCity, setVenueCity] = useState('All')

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

  useEffect(() => {
    fetchPublicVenues('All')
  }, [])

  const fetchPublicVenues = async (city: string) => {
    try {
      const params = city && city !== 'All' ? `?city=${encodeURIComponent(city)}` : ''
      const res = await axios.get(`${getApiUrl()}/venues/public${params}`)
      setPublicVenues(res.data.venues || [])
    } catch {
      setPublicVenues([])
    }
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
          setError('You must accept Terms of Service and Privacy Policy to continue.')
          setLoading(false)
          return
        }
        await register({ email, password, phoneNumber, firstName, lastName, referrerId, acceptedTerms, acceptedPrivacy })
        try { localStorage.setItem('rememberMe', rememberMe.toString()) } catch {}
        setJustAuthenticated(true)
        setShowPermissions(true)
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Authentication failed'
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
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const categoryLabel: Record<string, string> = {
    bar: 'Bar', restaurant: 'Restaurant', club: 'Nightclub', cafe: 'Coffee Shop', other: 'Lounge'
  }

  return (
    <div className="min-h-screen bg-black text-primary-500">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg mx-auto px-5 py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-6xl logo-script text-primary-500 leading-none">Shot On Me</h1>
          <p className="mt-3 text-sm text-primary-400/70">Your night, on us.</p>
        </div>

        {/* Discover Venues */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              <p className="text-sm font-bold text-primary-500 tracking-tight">Discover Venues</p>
            </div>
          </div>

          {/* City filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {['All', 'Indianapolis', 'Chicago', 'Louisville', 'Nashville', 'Detroit', 'Columbus'].map(city => (
              <button
                key={city}
                onClick={() => { setVenueCity(city); fetchPublicVenues(city) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  venueCity === city
                    ? 'bg-primary-500 text-black border-primary-500'
                    : 'bg-black/40 text-primary-400/70 border-primary-500/20 hover:border-primary-500/40 hover:text-primary-400'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Venue grid */}
          {publicVenues.length === 0 ? (
            <div className="text-center py-6 text-primary-400/40">
              <MapPin className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Coming Soon to {venueCity === 'All' ? 'your area' : venueCity}</p>
              <p className="text-xs mt-1 opacity-70">We're expanding — check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {publicVenues.map((venue: any) => {
                const photo = venue.coverPhoto || venue.branding?.logoUrl
                return (
                  <div
                    key={venue._id}
                    className="rounded-xl overflow-hidden border border-primary-500/15 bg-black/40 group"
                  >
                    <div className="aspect-[4/3] bg-primary-500/5 relative overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500/5">
                          <MapPin className="w-6 h-6 text-primary-500/30" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-primary-400 border border-primary-500/20 backdrop-blur-sm">
                        {categoryLabel[venue.category] || 'Venue'}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-white font-semibold text-xs truncate">{venue.name}</p>
                      <p className="text-primary-400/50 text-[10px] mt-0.5 truncate">
                        {venue.address?.city}{venue.address?.state ? `, ${venue.address.state}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-primary-500/25 bg-black/70 backdrop-blur-sm p-7 shadow-2xl">
          {/* Sign In / Sign Up toggle */}
          <div className="flex mb-6 border-b border-primary-500/20">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                isLogin ? 'text-primary-500 border-b-2 border-primary-500' : 'text-primary-400/60 hover:text-primary-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                !isLogin ? 'text-primary-500 border-b-2 border-primary-500' : 'text-primary-400/60 hover:text-primary-400'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-primary-500 text-xs font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      required
                      className="w-full px-3 py-2.5 bg-black border border-primary-500/40 rounded-lg text-primary-300 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-primary-500 text-xs font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      required
                      className="w-full px-3 py-2.5 bg-black border border-primary-500/40 rounded-lg text-primary-300 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-primary-500 text-xs font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    required
                    className="w-full px-3 py-2.5 bg-black border border-primary-500/40 rounded-lg text-primary-300 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-primary-500 text-xs font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="login-form-input w-full px-3 py-2.5 bg-black border border-primary-500/40 rounded-lg text-primary-300 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-primary-500 text-xs font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="login-form-input w-full px-3 py-2.5 pr-11 bg-black border border-primary-500/40 rounded-lg text-primary-300 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary-500 hover:text-primary-400"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 bg-black accent-primary-500 cursor-pointer"
                  style={{ accentColor: '#B8945A' }}
                />
                <span className="text-primary-400/70 text-xs">Remember me</span>
              </label>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowForgotPassword(true) }}
                className="text-primary-500 text-xs hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {!isLogin && (
              <div className="space-y-2 rounded-lg border border-primary-500/20 bg-black/40 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 bg-black accent-primary-500"
                    style={{ accentColor: '#B8945A' }}
                  />
                  <span className="text-primary-400/70 text-xs leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-primary-500 hover:underline">Terms of Service</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 bg-black accent-primary-500"
                    style={{ accentColor: '#B8945A' }}
                  />
                  <span className="text-primary-400/70 text-xs leading-relaxed">
                    I agree to the{' '}
                    <Link href="/privacy" target="_blank" className="text-primary-500 hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-red-900/90 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && (!acceptedTerms || !acceptedPrivacy))}
              className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Venue portal link */}
        {venuePortalLoginUrl && (
          <p className="text-center mt-5 text-xs text-primary-400/40">
            Venue owner?{' '}
            <a href={venuePortalLoginUrl} className="text-primary-400/60 hover:text-primary-400 underline">
              Sign in to the Venue Portal
            </a>
          </p>
        )}
      </div>

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
