'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Import centralized API URL function
import { getApiUrl, buildApiUrl } from '../utils/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Safety check for browser environment
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }
    
    try {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        setToken(storedToken)
        fetchUser(storedToken)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error)
      setLoading(false)
    }
    
    // Safety timeout - always stop loading after 10 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false')
      setLoading(false)
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [])

  const fetchUser = async (authToken: string) => {
    if (!authToken) {
      setLoading(false)
      return
    }
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000 // 5 second timeout - reduced for faster loading
      })
      // Normalize user data - convert _id to id if needed
      const userData = response.data.user
      if (userData && userData._id && !userData.id) {
        userData.id = userData._id.toString()
      }
      setUser(userData)
    } catch (error: any) {
      console.error('Failed to fetch user:', error)
      // Clear token on any error to prevent infinite loading
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const apiUrl = getApiUrl()
      const loginUrl = buildApiUrl('auth/login')
      
      console.log('🔐 Base API URL:', apiUrl)
      console.log('🔐 Login URL:', loginUrl)
      console.log('🔐 Method: POST')
      
      // Validate URL doesn't have double /api
      if (loginUrl.includes('/api/api')) {
        console.error('❌ ERROR: Double /api detected in URL:', loginUrl)
        throw new Error('Invalid API URL configuration. Please check NEXT_PUBLIC_API_URL in .env.local')
      }
      
      const response = await axios.post(loginUrl, { email, password }, { 
        timeout: 8000, // 8 seconds - reduced for faster feedback
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
      
      // Set state immediately - don't wait for any additional calls
      setToken(authToken)
      setUser(userData)
      
      // Always save token to localStorage (it's needed for the app to work)
      // The rememberMe flag is just for UI preference
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', authToken)
          localStorage.setItem('rememberMe', rememberMe.toString())
          
          // Also save user email for auto-fill if remember me is checked
          if (rememberMe) {
            localStorage.setItem('savedEmail', email)
          } else {
            localStorage.removeItem('savedEmail')
          }
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
      
      // Don't call fetchUser - we already have the user data from login response
      console.log('✅ Login successful, user data set directly from response')
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
        errorMessage = 'Connection timeout. Please check if the backend server is running on port 5000.'
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
          const response = await axios.post(`${apiUrl}/auth/register`, data)
      const { token: authToken, user: userData } = response.data
      // Normalize user data - ensure id field exists
      if (userData && userData.id) {
        // Already has id, use as is
      } else if (userData && userData._id) {
        userData.id = userData._id.toString()
      }
      setToken(authToken)
      setUser(userData)
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', authToken)
        }
      } catch (storageError) {
        console.error('Error saving token to localStorage:', storageError)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      console.error('Registration error:', errorMessage, error)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Error removing token from localStorage:', error)
    }
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
        throw new Error(error.response?.data?.error || 'Failed to update user')
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

