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
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    let isMounted = true
    const timeout = setTimeout(() => { if (isMounted) setLoading(false) }, 5000)
    const apiUrl = getApiUrl()

    // Restore session from HttpOnly cookie — no localStorage needed
    axios.get(`${apiUrl}/auth/verify`, { withCredentials: true, timeout: 8000 })
      .then(res => {
        if (!isMounted) return
        const { token: authToken, user: userData } = res.data
        if (userData && userData._id && !userData.id) userData.id = userData._id.toString()
        setToken(authToken)
        setUser(userData)
      })
      .catch(() => { /* No valid session */ })
      .finally(() => { if (isMounted) setLoading(false) })

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [])

  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      let url = process.env.NEXT_PUBLIC_API_URL.trim()
      if (!url.endsWith('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`
      }
      return url
    }
    return 'https://shot-on-me.onrender.com/api'
  }

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = getApiUrl()
      const loginUrl = `${apiUrl}/auth/login`
      if (process.env.NODE_ENV === 'development' && (window as any).__SHOW_DEBUG_INFO__) {
        console.debug('Attempting login to:', loginUrl)
      }
      
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

      // Token is set as HttpOnly cookie by the backend — store in memory only
      setToken(authToken)
      setUser(userData)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Login error details:', {
          code: error.code,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        })
      }
      
      let errorMessage = 'Login failed'
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
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

  const logout = () => {
    // Clear the HttpOnly cookie server-side
    const apiUrl = getApiUrl()
    axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    setUser(null)
    setToken(null)
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

