'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Wallet, MapPin, Users } from 'lucide-react'

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState(() => {
    // Auto-fill email if remembered
    if (typeof window !== 'undefined') {
      return localStorage.getItem('savedEmail') || ''
    }
    return ''
  })
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => {
    // Check if user previously chose to be remembered
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rememberMe')
      return saved === 'true' || saved === null // Default to true for better UX
    }
    return true // Default to true
  })
  const { login, register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Save remember me preference
      localStorage.setItem('rememberMe', rememberMe.toString())
      
      if (isLogin) {
        await login(email, password, rememberMe)
      } else {
        await register({ email, password, phoneNumber, firstName, lastName })
        // Also save remember me for registration
        localStorage.setItem('rememberMe', rememberMe.toString())
      }
      router.push('/home')
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-5xl logo-script text-primary-500 mb-2">Shot On Me</h1>
          <p className="text-primary-400 text-lg mt-4">Buy someone a drink at any bar or coffee shop—send instantly by email or text. Your friend will get a secure link to claim their treat!</p>
        </div>

        {/* Form */}
        <div className="w-full max-w-md">
          <div className="bg-black border-2 border-primary-500 rounded-lg shadow-2xl p-8">
            {/* Toggle between Sign In and Sign Up */}
            <div className="flex mb-6 border-b border-primary-500/20">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-center font-semibold transition-colors ${
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
                className={`flex-1 py-3 text-center font-semibold transition-colors ${
                  !isLogin
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-primary-400 hover:text-primary-500'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary-500">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                        className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                        className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                      className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-primary-500 text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
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
                <a href="#" className="text-primary-500 text-sm hover:underline">Forgot password?</a>
              </div>

              {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {!isLogin && (
              <p className="text-center text-primary-400 text-sm mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

