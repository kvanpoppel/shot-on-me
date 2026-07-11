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
  dateOfBirth?: string | null
  gender?: string
  relationshipStatus?: string
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
  ageConfirmed: boolean
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
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.'
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('refused')) {
        errorMessage = 'Cannot connect to server. Please try again shortly.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.response?.status === 405) {
        errorMessage = 'Server error. Please try again.'
      } else if (error.response?.status === 0 || error.message?.includes('Network Error') || error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
        errorMessage = 'Cannot connect to server. Please try again shortly.'
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
          // Referral application failed silently
        }
      }
      
      // After successful registration, check if virtual card was automatically created
      // This happens in the background - no user action needed
      // The card will be visible in the Wallet tab automatically
      if (userData && userData.userType === 'user') {
        // Card creation happens automatically in backend during registration
        // No need to do anything here - just let the Wallet tab load it
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
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
        // Don't throw - just swallow the error to avoid breaking the UI
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

