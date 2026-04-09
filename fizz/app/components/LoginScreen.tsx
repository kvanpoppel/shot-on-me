'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, ArrowLeft, X } from 'lucide-react'

type Mode = 'signin' | 'register'

interface LoginScreenProps {
  initialMode?: Mode
  onBack?: () => void
}

export default function LoginScreen({ initialMode = 'signin', onBack }: LoginScreenProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedEmail, setSavedEmail] = useState('')

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fizz_savedEmail')
      if (saved) {
        setSavedEmail(saved)
        setEmail(saved)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
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

  const BUBBLES = [
    { size: 10, left: '8%', delay: '0s', duration: '4s', color: 'rgba(200,241,53,0.4)' },
    { size: 6, left: '30%', delay: '1.5s', duration: '3.5s', color: 'rgba(0,212,255,0.4)' },
    { size: 12, left: '60%', delay: '0.8s', duration: '5s', color: 'rgba(255,95,87,0.3)' },
    { size: 8, left: '85%', delay: '2s', duration: '4.2s', color: 'rgba(200,241,53,0.3)' },
  ]

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
            {mode === 'signin' ? 'Welcome back!' : 'Join Fizz'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {mode === 'signin' ? 'Sign in to send the moment' : 'Send the moment. Find your spot.'}
          </p>
        </div>

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
                className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-fizz transition-colors"
                style={{ background: '#252540' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-medium border border-white/10 focus:border-lime-fizz transition-colors pr-12"
                  style={{ background: '#252540' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="fizz-btn-primary w-full py-4 text-base mt-2 disabled:opacity-50">
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
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
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
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
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
                className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
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
                className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-fizz"
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
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-white/10 focus:border-lime-fizz pr-12"
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
                <span className="text-xs text-white/50">I agree to the <a href="/terms" className="underline" style={{ color: '#C8F135' }}>Terms of Service</a></span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} className="mt-0.5 rounded accent-lime-400" />
                <span className="text-xs text-white/50">I agree to the <a href="/privacy" className="underline" style={{ color: '#C8F135' }}>Privacy Policy</a></span>
              </label>
            </div>
            <button type="submit" disabled={loading} className="fizz-btn-primary w-full py-4 text-base mt-2 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
