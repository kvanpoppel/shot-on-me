'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { Eye, EyeOff, ArrowLeft, X, Fingerprint, Mail, CheckCircle } from 'lucide-react'

type Mode = 'signin' | 'register'

interface LoginScreenProps {
  initialMode?: Mode
  onBack?: () => void
}

const BIOMETRIC_CRED_KEY = 'revig_biometric_cred_id'
const BIOMETRIC_TOKEN_KEY = 'revig_biometric_token'
const BIOMETRIC_EMAIL_KEY = 'revig_biometric_email'

export default function LoginScreen({ initialMode = 'signin', onBack }: LoginScreenProps) {
  const { login, register, token: currentToken } = useAuth()
  const API_URL = useApiUrl()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  // Sign in fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')

  // Biometrics
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [showEnableBiometric, setShowEnableBiometric] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [postLoginToken, setPostLoginToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('revig_savedEmail')
      if (saved) {
        setEmail(saved)
        setForgotEmail(saved)
      }
    } catch { /* ignore */ }

    // Check biometric availability
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setBiometricAvailable(available)
          const stored = localStorage.getItem(BIOMETRIC_CRED_KEY)
          setBiometricEnabled(!!stored)
        })
        .catch(() => {})
    }
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, rememberMe)
      // After successful login, check if we should offer biometric enrollment
      if (biometricAvailable && !biometricEnabled) {
        const storedToken = localStorage.getItem('revig_auth_token') || sessionStorage.getItem('revig_auth_token')
        if (storedToken) {
          setPostLoginToken(storedToken)
          setShowEnableBiometric(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Please accept the Terms and Privacy Policy to continue')
      return
    }
    setLoading(true)
    try {
      await register({
        email: regEmail,
        password: regPassword,
        phoneNumber: phone,
        firstName,
        lastName,
        acceptedTerms,
        acceptedPrivacy,
      })
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotEmail })
      setForgotSuccess(true)
    } catch (err: any) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset email')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true)
    setError('')
    try {
      const storedCredIdB64 = localStorage.getItem(BIOMETRIC_CRED_KEY)
      const storedToken = localStorage.getItem(BIOMETRIC_TOKEN_KEY)
      if (!storedCredIdB64 || !storedToken) {
        setError('Face ID not set up. Please sign in with your password.')
        setBiometricEnabled(false)
        return
      }

      // Decode stored credential ID
      const credIdBinary = atob(storedCredIdB64)
      const credIdArray = new Uint8Array(credIdBinary.length)
      for (let i = 0; i < credIdBinary.length; i++) {
        credIdArray[i] = credIdBinary.charCodeAt(i)
      }

      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: credIdArray }],
          userVerification: 'required',
          timeout: 60000,
        },
      })

      if (!assertion) throw new Error('Biometric verification failed')

      // Verify stored token is still valid
      const res = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        timeout: 8000,
      })

      if (res.data) {
        // Token still valid — restore session via stored token
        localStorage.setItem('revig_auth_token', storedToken)
        window.location.reload()
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled.')
      } else if (err.response?.status === 401) {
        setError('Your session expired. Please sign in with your password.')
        localStorage.removeItem(BIOMETRIC_CRED_KEY)
        localStorage.removeItem(BIOMETRIC_TOKEN_KEY)
        setBiometricEnabled(false)
      } else {
        setError('Face ID failed. Please sign in with your password.')
      }
    } finally {
      setBiometricLoading(false)
    }
  }, [API_URL])

  const handleEnableBiometric = useCallback(async () => {
    if (!postLoginToken) return
    setBiometricLoading(true)
    try {
      const savedEmail = localStorage.getItem('revig_savedEmail') || email
      const userId = new TextEncoder().encode(savedEmail || 'revig-user')
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Revig', id: window.location.hostname },
          user: {
            id: userId,
            name: savedEmail,
            displayName: savedEmail,
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'none',
        },
      }) as PublicKeyCredential | null

      if (credential) {
        // Store credential ID as base64
        const rawId = new Uint8Array(credential.rawId)
        const b64 = btoa(String.fromCharCode(...Array.from(rawId)))
        localStorage.setItem(BIOMETRIC_CRED_KEY, b64)
        localStorage.setItem(BIOMETRIC_TOKEN_KEY, postLoginToken)
        localStorage.setItem(BIOMETRIC_EMAIL_KEY, savedEmail)
        setBiometricEnabled(true)
      }

      setShowEnableBiometric(false)
    } catch (err: any) {
      // User cancelled or not supported — just dismiss
      setShowEnableBiometric(false)
    } finally {
      setBiometricLoading(false)
    }
  }, [postLoginToken, email])

  const BUBBLES = [
    { size: 10, left: '8%', delay: '0s', duration: '4s', color: 'rgba(200,241,53,0.4)' },
    { size: 6, left: '30%', delay: '1.5s', duration: '3.5s', color: 'rgba(0,212,255,0.4)' },
    { size: 12, left: '60%', delay: '0.8s', duration: '5s', color: 'rgba(255,95,87,0.3)' },
    { size: 8, left: '85%', delay: '2s', duration: '4.2s', color: 'rgba(200,241,53,0.3)' },
  ]

  // ── Enable Biometric sheet ──
  if (showEnableBiometric) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#1A1A2E' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            <Fingerprint className="w-10 h-10" style={{ color: '#1A1A2E' }} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Enable Face ID</h2>
          <p className="text-white/50 text-sm mb-8">Sign in faster next time with your face or fingerprint — no password needed.</p>
          <button
            onClick={handleEnableBiometric}
            disabled={biometricLoading}
            className="revig-btn-primary w-full py-4 text-base mb-3 disabled:opacity-50"
          >
            {biometricLoading ? 'Setting up...' : 'Enable Face ID / Touch ID'}
          </button>
          <button
            onClick={() => setShowEnableBiometric(false)}
            className="w-full py-3 text-sm font-semibold"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  // ── Forgot password panel ──
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#1A1A2E' }}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#C8F135' }} />
          <div className="absolute bottom-20 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#FF5F57' }} />
        </div>

        <div className="relative z-10 flex items-center px-6 py-5 safe-top">
          <button onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); setForgotError('') }} className="mr-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <span style={{ color: '#C8F135' }}>Fi</span><span style={{ color: '#FF5F57' }}>zz</span>
          </span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-10">
          {forgotSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.15)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#C8F135' }} />
              </div>
              <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Check your email</h2>
              <p className="text-white/50 text-sm mb-2">We sent a password reset link to</p>
              <p className="font-semibold mb-8" style={{ color: '#C8F135' }}>{forgotEmail}</p>
              <button
                onClick={() => { setShowForgotPassword(false); setForgotSuccess(false) }}
                className="revig-btn-primary px-8 py-3 text-sm"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ background: 'rgba(200,241,53,0.12)', border: '1px solid rgba(200,241,53,0.2)' }}>
                  <Mail className="w-7 h-7" style={{ color: '#C8F135' }} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Reset your password</h2>
                <p className="text-white/50 text-sm">Enter your email and we'll send you a link to reset your password.</p>
              </div>

              {forgotError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-revig transition-colors"
                    style={{ background: '#252540' }}
                  />
                </div>
                <button type="submit" disabled={forgotLoading} className="revig-btn-primary w-full py-4 text-base mt-2 disabled:opacity-50">
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main login / register ──
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1A1A2E' }}>
      {/* Bubble background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {BUBBLES.map((b, i) => (
          <div key={i} className="bubble" style={{ width: b.size, height: b.size, left: b.left, bottom: '-20px', background: b.color, animationDuration: b.duration, animationDelay: b.delay }} />
        ))}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#C8F135' }} />
        <div className="absolute bottom-20 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: '#FF5F57' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center px-6 py-5 safe-top">
        {onBack && (
          <button onClick={onBack} className="mr-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <span style={{ color: '#C8F135' }}>Fi</span><span style={{ color: '#FF5F57' }}>zz</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl animate-float" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🫧
          </div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {mode === 'signin' ? 'Welcome back!' : 'Join Revig'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {mode === 'signin' ? 'Sign in to send the moment' : 'Send the moment. Find your spot.'}
          </p>
        </div>

        {/* Face ID quick-login (sign-in mode only, if enrolled) */}
        {mode === 'signin' && biometricEnabled && (
          <button
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl mb-5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(200,241,53,0.10)', border: '1px solid rgba(200,241,53,0.25)', color: '#C8F135' }}
          >
            <Fingerprint className="w-5 h-5" />
            {biometricLoading ? 'Verifying...' : 'Sign in with Face ID / Touch ID'}
          </button>
        )}

        {/* Mode tabs */}
        <div className="flex rounded-2xl p-1 mb-6" style={{ background: '#252540' }}>
          <button
            onClick={() => { setMode('signin'); setError('') }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={mode === 'signin' ? { background: '#C8F135', color: '#1A1A2E' } : { color: 'rgba(255,255,255,0.5)' }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError('') }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={mode === 'register' ? { background: '#C8F135', color: '#1A1A2E' } : { color: 'rgba(255,255,255,0.5)' }}
          >
            Create Account
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-revig transition-colors"
                style={{ background: '#252540' }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setShowForgotPassword(true) }}
                  className="text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#C8F135' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-revig transition-colors pr-12"
                  style={{ background: '#252540' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setRememberMe(r => !r)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: rememberMe ? '#C8F135' : 'transparent',
                  border: rememberMe ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                }}
              >
                {rememberMe && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-white/50">Remember me</span>
            </label>

            <button type="submit" disabled={loading} className="revig-btn-primary w-full py-4 text-base mt-1 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Alex"
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig"
                  style={{ background: '#252540' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig"
                  style={{ background: '#252540' }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig"
                style={{ background: '#252540' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig"
                style={{ background: '#252540' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-revig pr-12"
                  style={{ background: '#252540' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-0.5 rounded accent-lime-400" />
                <span className="text-xs text-white/50">I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="underline" style={{ color: '#C8F135' }}>Terms of Service</a></span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} className="mt-0.5 rounded accent-lime-400" />
                <span className="text-xs text-white/50">I agree to the <a href="/privacy" target="_blank" rel="noreferrer" className="underline" style={{ color: '#C8F135' }}>Privacy Policy</a></span>
              </label>
            </div>
            <button type="submit" disabled={loading} className="revig-btn-primary w-full py-4 text-base mt-2 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
