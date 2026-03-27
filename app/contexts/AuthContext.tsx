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
  username?: string
  profilePicture?: string
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

// Get API URL dynamically at runtime in browser context
const getApiUrlForRequest = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000/api`
    }
  }
  return 'http://localhost:5000/api'
}

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
    axios.get(`${getApiUrlForRequest()}/auth/verify`, { timeout: 8000 })
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
      const apiUrl = getApiUrlForRequest()
      const response = await axios.post(`${apiUrl}/auth/login`, { email, password }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      })
      const { token: authToken, user: userData } = response.data
      if (userData && userData._id && !userData.id) userData.id = userData._id.toString()
      if (!userData.wallet) userData.wallet = { balance: 0, pendingBalance: 0 }
      setToken(authToken)
      setUser(userData)

      // Save email for auto-fill only (non-sensitive)
      try {
        if (rememberMe) {
          localStorage.setItem('savedEmail', email)
        } else {
          localStorage.removeItem('savedEmail')
        }
      } catch { /* ignore */ }
    } catch (error: any) {
      let errorMessage = 'Login failed'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check if the backend server is running.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password.'
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
      const response = await axios.post(`${getApiUrlForRequest()}/auth/register`, data)
      const { token: authToken, user: userData } = response.data
      if (userData && userData._id && !userData.id) userData.id = userData._id.toString()
      if (!userData.wallet) userData.wallet = { balance: 0, pendingBalance: 0 }
      setToken(authToken)
      setUser(userData)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    // Clear the HttpOnly cookie server-side
    axios.post(`${getApiUrlForRequest()}/auth/logout`, {}).catch(() => {})
    setUser(null)
    setToken(null)
  }

  const updateUser = async (data: Partial<User>) => {
    if (!token) throw new Error('Not authenticated')
    try {
      const response = await axios.put(`${getApiUrlForRequest()}/users/me`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update user')
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
