'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Registration state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venuePhone, setVenuePhone] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  
  // Load saved email if "remember me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
      console.log('Loaded remembered email:', savedEmail)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await login(email, password)
      
      // Save email if "remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      console.error('Login error details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await axios.post(`${apiBase}/auth/register-venue`, {
        email,
        password,
        phoneNumber,
        firstName,
        lastName,
        venueName,
        venueAddress,
        venuePhone
      })

      // Registration successful - show success message
      setSuccess('Account created successfully! Logging you in...')
      
      // After successful registration, immediately log them in
      try {
        await login(email, password)
        router.push('/dashboard')
      } catch (loginErr: any) {
        // If auto-login fails, show error but registration was successful
        setError('Account created but login failed. Please try logging in manually.')
        console.error('Auto-login after registration failed:', loginErr)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.errors?.[0]?.msg ||
                          err.message || 
                          'Registration failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-4 mb-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-semibold border ${
            isLogin
              ? 'bg-primary-500 text-black border-primary-500'
              : 'bg-black text-primary-400 border-primary-500'
          }`}
          onClick={() => {
            setMode('login')
            setError('')
            setSuccess('')
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-semibold border ${
            !isLogin
              ? 'bg-primary-500 text-black border-primary-500'
              : 'bg-black text-primary-400 border-primary-500'
          }`}
          onClick={() => {
            setMode('register')
            setError('')
            setSuccess('')
          }}
        >
          Create Venue Account
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-900 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
        {!isLogin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-primary-500 mb-2">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Venue owner first name"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-primary-500 mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Venue owner last name"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-primary-500 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="venue@example.com"
          />
        </div>

        {!isLogin && (
          <>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-primary-500 mb-2">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(555) 123-4567"
              />
            </div>
            
            {/* Venue Information */}
            <div className="border-t border-primary-500/20 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-primary-500 mb-4">Venue Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="venueName" className="block text-sm font-medium text-primary-500 mb-2">
                    Venue Name *
                  </label>
                  <input
                    id="venueName"
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Kates Pub"
                  />
                </div>
                
                <div>
                  <label htmlFor="venueAddress" className="block text-sm font-medium text-primary-500 mb-2">
                    Venue Address
                  </label>
                  <input
                    id="venueAddress"
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="123 Main St, Austin, TX, 78701"
                  />
                </div>
                
                <div>
                  <label htmlFor="venuePhone" className="block text-sm font-medium text-primary-500 mb-2">
                    Venue Phone
                  </label>
                  <input
                    id="venuePhone"
                    type="tel"
                    value={venuePhone}
                    onChange={(e) => setVenuePhone(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary-500 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary-500 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black border border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Re-enter password"
              />
            </div>
          )}
        </div>

        {isLogin && (
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 border-primary-500 text-primary-500 focus:ring-primary-500 bg-black accent-primary-500"
                style={{ accentColor: '#D4AF37' }}
              />
              <span className="text-primary-400 text-sm">Remember me</span>
            </label>
            <a href="#" className="text-primary-500 text-sm hover:underline">
              Forgot password?
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? isLogin
              ? 'Logging in...'
              : 'Creating account...'
            : isLogin
              ? 'Sign In'
              : 'Create Venue Account'}
        </button>
      </form>
    </div>
  )
}

