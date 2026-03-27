'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

// Send cookies on every request — required for HttpOnly session cookie
axios.defaults.withCredentials = true

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string // Computed from firstName + lastName, but may be provided by backend
  username?: string
  profilePicture?: string
  location?: {
    latitude?: number
    longitude?: number
    isVisible?: boolean
  }
  wallet: {
    balance: number
    pendingBalance: number
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => Promise<void>
  token: string | null
}

interface RegisterData {
  email: string
  password: string
  phoneNumber: string
  firstName: string
  lastName: string
  referrerId?: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Import centralized API URL function
import { getApiUrl, buildApiUrl } from '../utils/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    let isMounted = true
    const timeout = setTimeout(() => { if (isMounted) setLoading(false) }, 10000)

    // Restore session from HttpOnly cookie — no localStorage needed
    const apiUrl = getApiUrl()
    axios.get(`${apiUrl}/auth/verify`, { withCredentials: true, timeout: 8000 })
      .then(res => {
        if (!isMounted) return
        const { token: authToken, user: userData } = res.data
        if (userData && userData._id && !userData.id) userData.id = userData._id.toString()
        if (!userData.wallet) userData.wallet = { balance: 0, pendingBalance: 0 }
        setToken(authToken)
        setUser(userData)
      })
      .catch(() => { /* No valid session — stay logged out */ })
      .finally(() => { if (isMounted) setLoading(false) })

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [])

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const apiUrl = getApiUrl()
      const loginUrl = buildApiUrl('auth/login')
      
      // Validate URL doesn't have double /api
      if (loginUrl.includes('/api/api')) {
        console.error('❌ ERROR: Double /api detected in URL:', loginUrl)
        throw new Error('Invalid API URL configuration. Please check NEXT_PUBLIC_API_URL in .env.local')
      }
      
      const response = await axios.post(loginUrl, { email, password }, { 
        timeout: 8000, // 8 seconds - fail faster if backend is down
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const { token: authToken, user: userData } = response.data
      
      // Normalize user data - ensure id field exists
      if (userData && userData.id) {
        // Already has id, use as is
      } else if (userData && userData._id) {
        userData.id = userData._id.toString()
      }
      
      // Ensure wallet exists in user data
      if (!userData.wallet) {
        userData.wallet = { balance: 0, pendingBalance: 0 }
      }
      
      // Token is set as HttpOnly cookie by the backend — store in memory only
      setToken(authToken)
      setUser(userData)

      // Save email for auto-fill (non-sensitive, safe in localStorage)
      try {
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem('savedEmail', email)
          } else {
            localStorage.removeItem('savedEmail')
          }
        }
      } catch { /* ignore */ }

      // Don't call fetchUser - we already have the user data from login response
    } catch (error: any) {
      let errorMessage = 'Login failed'
      
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // More helpful error message
        errorMessage = 'Connection timeout. The backend server may not be running or is not responding. Please check the backend PowerShell window and ensure MongoDB is connected.'
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('refused')) {
        errorMessage = 'Cannot connect to backend server. Please ensure the backend is running on port 5000.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.response?.status === 405) {
        const attemptedUrl = error.config?.url || 'unknown'
        errorMessage = `Method Not Allowed (405). The API endpoint may not exist.

Attempted URL: ${attemptedUrl}

For PRODUCTION (shotonme.com):
- Set NEXT_PUBLIC_API_URL in Vercel environment variables
- Go to: Vercel Dashboard → Settings → Environment Variables
- Add: NEXT_PUBLIC_API_URL = https://your-backend-url.com/api
- Then redeploy

For LOCAL development:
- Make sure backend is running on port 5000
- Check: http://localhost:5000/api/health`
      } else if (error.response?.status === 0 || error.message?.includes('Network Error') || error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
        errorMessage = 'Cannot connect to server. Make sure the backend is running on port 5000.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  }

  const register = async (data: RegisterData) => {
    try {
          const apiUrl = getApiUrl()
          const response = await axios.post(`${apiUrl}/auth/register`, data, {
            timeout: 30000 // 30 seconds - increased for slow connections
          })
      const { token: authToken, user: userData } = response.data
      // Normalize user data - ensure id field exists
      if (userData && userData.id) {
        // Already has id, use as is
      } else if (userData && userData._id) {
        userData.id = userData._id.toString()
      }
      
      // Ensure wallet exists
      if (!userData.wallet) {
        userData.wallet = { balance: 0, pendingBalance: 0 }
      }
      
      // Token is set as HttpOnly cookie by the backend — store in memory only
      setToken(authToken)
      setUser(userData)
      
      // Attribute referral by referrer ID (from invite link ?ref=userId) – backend only, no visible code
      if (data.referrerId && userData?.id) {
        try {
          await axios.post(`${apiUrl}/referrals/apply`, {
            referrerId: data.referrerId,
            userId: userData.id
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        } catch (refError: any) {
          console.warn('Failed to apply referral:', refError.message)
        }
      }
      
      // After successful registration, check if virtual card was automatically created
      // This happens in the background - no user action needed
      // The card will be visible in the Wallet tab automatically
      if (userData && userData.userType === 'user') {
        // Card creation happens automatically in backend during registration
        // No need to do anything here - just let the Wallet tab load it
        console.log('✅ User registered - virtual card will be created automatically if Issuing is enabled')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      console.error('Registration error:', errorMessage, error)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    // Clear the HttpOnly cookie server-side
    const apiUrl = getApiUrl()
    axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    setUser(null)
    setToken(null)
  }

  const updateUser = async (data: Partial<User>) => {
    if (!token) throw new Error('Not authenticated')
    try {
      // If data contains a full user object (from profile picture upload), use it directly
      if (data.id || (data as any)._id) {
        // This is a full user object, update state directly
        const updatedUser = { ...user, ...data } as User
        // Ensure id field exists
        if ((updatedUser as any)._id && !updatedUser.id) {
          updatedUser.id = (updatedUser as any)._id.toString()
        }
        setUser(updatedUser)
        return
      }
      
      // If called with empty data, fetch fresh user data from server
      const isEmpty = Object.keys(data).length === 0
      if (isEmpty) {
        // Refresh user data from server
        const apiUrl = getApiUrl()
        const response = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data.user) {
          const userData = response.data.user
          if (userData._id && !userData.id) {
            userData.id = userData._id.toString()
          }
          // Ensure wallet exists
          if (!userData.wallet) {
            userData.wallet = { balance: 0, pendingBalance: 0 }
          }
          setUser(userData)
          console.log('✅ User data refreshed from server. Balance:', userData.wallet?.balance)
        }
        return
      }
      
      // Otherwise, try to update via API
      const apiUrl = getApiUrl()
      const response = await axios.put(`${apiUrl}/users/me`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.user) {
        // Normalize user data
        const userData = response.data.user
        if (userData._id && !userData.id) {
          userData.id = userData._id.toString()
        }
        // Ensure wallet exists
        if (!userData.wallet) {
          userData.wallet = { balance: 0, pendingBalance: 0 }
        }
        setUser(userData)
      } else {
        // Merge with existing user data
        setUser(prev => prev ? { ...prev, ...data } : null)
      }
    } catch (error: any) {
      // If API call fails but we have data, still update local state
      if (data.profilePicture) {
        setUser(prev => prev ? { ...prev, ...data } : null)
      } else {
        console.error('Error updating user:', error)
        // Don't throw - just log the error to avoid breaking the UI
        // The balance will update via webhook/Socket.io eventually
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

