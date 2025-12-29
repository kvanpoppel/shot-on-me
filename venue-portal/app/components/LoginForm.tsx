'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import ForgotPasswordModal from './ForgotPasswordModal'
import { useToast } from './ToastContainer'

type Mode = 'login' | 'register'

interface LoginFormProps {
  initialMode: Mode
}

export default function LoginForm({ initialMode }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode)

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
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { login } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  
  // Load saved email if "remember me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
      console.log('Loaded remembered email:', savedEmail)
    }
  }, [])

  // Update mode when initialMode changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 6
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})
    setLoading(true)

    // Real-time validation
    const errors: Record<string, string> = {}
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!password) {
      errors.password = 'Password is required'
    } else if (!validatePassword(password)) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      
      // Save email if "remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      showSuccess('Login successful! Redirecting...')
      
      // Navigate immediately - login already set user state
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed'
      setError(errorMessage)
      showError(errorMessage)
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
      showSuccess('Account created successfully! Logging you in...')
      
      // After successful registration, immediately log them in
      try {
        await login(email, password)
        showSuccess('Welcome! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      } catch (loginErr: any) {
        // If auto-login fails, show error but registration was successful
        const errorMsg = 'Account created but login failed. Please try logging in manually.'
        setError(errorMsg)
        showError(errorMsg)
        console.error('Auto-login after registration failed:', loginErr)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.errors?.[0]?.msg ||
                          err.message || 
                          'Registration failed'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="space-y-5" role="main" aria-label={isLogin ? 'Sign in form' : 'Registration form'}>

      {/* Error Message - Enhanced with ARIA */}
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          className="bg-red-900/30 border border-red-500/50 text-red-300 px-3 py-2 rounded-lg flex items-start gap-2 animate-fade-in text-xs"
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Success Message - Enhanced with ARIA */}
      {success && (
        <div 
          role="alert"
          aria-live="polite"
          className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-300 px-3 py-2 rounded-lg flex items-start gap-2 animate-fade-in text-xs"
        >
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{success}</span>
        </div>
      )}

      <form 
        onSubmit={isLogin ? handleLogin : handleRegister} 
        className="space-y-4"
        id={isLogin ? "login-panel" : "register-panel"}
        role="tabpanel"
        noValidate
      >
        {!isLogin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium text-primary-500 mb-1.5">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                placeholder="First name"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-primary-500 mb-1.5">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                placeholder="Last name"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-primary-500 mb-2">
            {isLogin ? 'Email or Username' : 'Email'}
          </label>
          <input
            id="email"
            type={isLogin ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
            placeholder={isLogin ? "Enter your email or username" : "venue@example.com"}
          />
        </div>

        {!isLogin && (
          <>
            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-medium text-primary-500 mb-1.5">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                placeholder="(555) 123-4567"
              />
            </div>
            
            {/* Venue Information */}
            <div className="border-t border-primary-500/20 pt-3 mt-3">
              <h3 className="text-sm font-semibold text-primary-500 mb-3">Venue Information</h3>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="venueName" className="block text-xs font-medium text-primary-500 mb-1.5">
                    Venue Name *
                  </label>
                  <input
                    id="venueName"
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                    placeholder="Kates Pub"
                  />
                </div>
                
                <div>
                  <label htmlFor="venueAddress" className="block text-xs font-medium text-primary-500 mb-1.5">
                    Venue Address
                  </label>
                  <input
                    id="venueAddress"
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                    placeholder="123 Main St, Austin, TX, 78701"
                  />
                </div>
                
                <div>
                  <label htmlFor="venuePhone" className="block text-xs font-medium text-primary-500 mb-1.5">
                    Venue Phone
                  </label>
                  <input
                    id="venuePhone"
                    type="tel"
                    value={venuePhone}
                    onChange={(e) => setVenuePhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-primary-500 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors({ ...fieldErrors, password: '' })
              }
            }}
            onBlur={() => {
              if (password && !validatePassword(password)) {
                setFieldErrors({ ...fieldErrors, password: 'Password must be at least 6 characters' })
              }
            }}
            required
            className={`w-full px-4 py-3 text-sm bg-black/60 border rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200 ${
              fieldErrors.password ? 'border-red-500/50' : 'border-primary-500/50'
            }`}
            placeholder="••••••••"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.password}
            </p>
          )}
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
              className="w-full px-4 py-3 text-sm bg-black/60 border border-primary-500/50 rounded-lg text-primary-500 placeholder-primary-600/70 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-black/80 transition-all duration-200"
              placeholder="Re-enter password"
            />
          </div>
        )}

        {isLogin && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Forgot password clicked')
                setShowForgotPassword(true)
              }}
              className="text-sm text-primary-500 hover:underline cursor-pointer"
            >
              Forgot Your Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 text-black py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black shadow-md hover:shadow-lg"
          aria-busy={loading}
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

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  )
}

