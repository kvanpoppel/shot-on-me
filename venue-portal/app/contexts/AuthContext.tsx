'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  userType: string
  wallet?: {
    balance: number
    pendingBalance: number
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
      // Check for stored token
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

  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      let url = process.env.NEXT_PUBLIC_API_URL.trim()
      if (!url.endsWith('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`
      }
      return url
    }
    return 'http://localhost:5000/api'
  }

  const fetchUser = async (authToken: string) => {
    try {
      const apiUrl = getApiUrl()
      const response = await axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000 // 10 second timeout
      })
      const fetchedUser = response.data.user

      // Normalize user data - convert _id to id if needed
      if (fetchedUser && fetchedUser._id && !fetchedUser.id) {
        fetchedUser.id = fetchedUser._id.toString()
      }

      // Ensure only venue users can stay logged into the venue portal
      if (fetchedUser.userType !== 'venue') {
        console.warn('Non-venue user attempted to access venue portal')
        localStorage.removeItem('token')
        localStorage.removeItem('rememberedEmail')
        setToken(null)
        setUser(null)
      } else {
        // Successfully logged in - set user
        setUser(fetchedUser)
        console.log('✅ Auto-login successful for:', fetchedUser.email)
      }
    } catch (error: any) {
      console.error('Failed to fetch user:', error)
      
      // Only clear token if it's an auth error (401/403), not network errors
      // This allows retry if backend is temporarily unavailable
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Token expired or invalid - clearing stored credentials')
        localStorage.removeItem('token')
        localStorage.removeItem('rememberedEmail')
        setToken(null)
        setUser(null)
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Network timeout - keep token but don't set user
        console.warn('Backend timeout - keeping token for retry')
        setUser(null)
      } else {
        // Other errors - clear token to be safe
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = getApiUrl()
      const loginUrl = `${apiUrl}/auth/login`
      console.log('Attempting login to:', loginUrl)
      
      const response = await axios.post(loginUrl,
        { email, password },
        { 
          timeout: 15000, // 15 seconds
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      const { token: authToken, user: userData } = response.data

      // Normalize user data - ensure id field exists
      if (userData && userData._id && !userData.id) {
        userData.id = userData._id.toString()
      }

      // Enforce venue-only access at login time
      if (userData.userType !== 'venue') {
        throw new Error('This portal is for venue accounts only. Please use the Shot On Me app for regular user accounts.')
      }

      setToken(authToken)
      setUser(userData)
      localStorage.setItem('token', authToken)
    } catch (error: any) {
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      
      let errorMessage = 'Login failed'
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check if the backend server is running on port 5000.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
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

  const logout = () => {
    console.log('Logging out user')
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    // Optionally clear remembered email on logout
    // localStorage.removeItem('rememberedEmail')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, token }}>
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

