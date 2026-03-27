'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

// Send cookies on every request — required for HttpOnly session cookie
axios.defaults.withCredentials = true
import { useApiUrl } from '../utils/api'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  userType: string
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
  const API_URL = useApiUrl()

  // Restore session from HttpOnly cookie on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    axios.get(`${API_URL}/auth/verify`, { withCredentials: true, timeout: 10000 })
      .then(res => {
        const { token: freshToken, user: userData } = res.data
        setToken(freshToken)
        setUser(userData)
      })
      .catch(() => {
        // No valid session — user needs to log in
      })
      .finally(() => setLoading(false))
  }, [API_URL])

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        { email, password },
        { withCredentials: true, timeout: 15000 }
      )

      const { token: authToken, user: userData } = response.data

      if (!authToken) throw new Error('No token received')

      setToken(authToken)
      setUser(userData)
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
    } catch {
      // Ignore — clear local state regardless
    }
    setToken(null)
    setUser(null)
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
