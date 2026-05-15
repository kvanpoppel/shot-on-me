'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { getApiUrl, buildApiUrl } from '../utils/api'
import { User } from '../types'

axios.defaults.withCredentials = true

const TOKEN_KEY = 'revig_auth_token'

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

function normalizeUser(userData: any): User {
  if (userData._id && !userData.id) userData.id = userData._id.toString()
  if (!userData.wallet) userData.wallet = { balance: 0, pendingBalance: 0 }
  if (!userData.revigWallet) userData.revigWallet = { balance: 0, pendingBalance: 0 }
  return userData
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

    const storedToken = localStorage.getItem(TOKEN_KEY)

    if (storedToken) {
      // Restore session from stored token
      const apiUrl = getApiUrl()
      axios.get(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        timeout: 8000,
      })
        .then(res => {
          if (!isMounted) return
          const userData = normalizeUser(res.data.user || res.data)
          setToken(storedToken)
          setUser(userData)
        })
        .catch(() => {
          // Token expired or invalid — clear it
          localStorage.removeItem(TOKEN_KEY)
        })
        .finally(() => { if (isMounted) setLoading(false) })
    } else {
      // Fall back to cookie-based session (legacy / server-side set cookie)
      const apiUrl = getApiUrl()
      axios.get(`${apiUrl}/auth/verify`, { withCredentials: true, timeout: 8000 })
        .then(res => {
          if (!isMounted) return
          const { token: authToken, user: userData } = res.data
          const normalized = normalizeUser(userData)
          if (authToken) localStorage.setItem(TOKEN_KEY, authToken)
          setToken(authToken)
          setUser(normalized)
        })
        .catch(() => { /* no session — show landing */ })
        .finally(() => { if (isMounted) setLoading(false) })
    }

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [])

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const loginUrl = buildApiUrl('auth/login')
      const response = await axios.post(loginUrl, { email, password }, { timeout: 8000 })
      const { token: authToken, user: userData } = response.data
      const normalized = normalizeUser(userData)

      localStorage.setItem(TOKEN_KEY, authToken)
      if (rememberMe) {
        localStorage.setItem('revig_savedEmail', email)
      } else {
        localStorage.removeItem('revig_savedEmail')
      }

      setToken(authToken)
      setUser(normalized)
    } catch (error: any) {
      let errorMessage = 'Login failed'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.'
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
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/auth/register`, data, { timeout: 30000 })
      const { token: authToken, user: userData } = response.data
      const normalized = normalizeUser(userData)

      localStorage.setItem(TOKEN_KEY, authToken)
      setToken(authToken)
      setUser(normalized)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed'
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    const apiUrl = getApiUrl()
    axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setToken(null)
  }

  const updateUser = async (data: Partial<User>) => {
    if (!token) throw new Error('Not authenticated')
    try {
      if (data.id || (data as any)._id) {
        const updatedUser = { ...user, ...data } as User
        if ((updatedUser as any)._id && !updatedUser.id) {
          updatedUser.id = (updatedUser as any)._id.toString()
        }
        setUser(updatedUser)
        return
      }

      const isEmpty = Object.keys(data).length === 0
      if (isEmpty) {
        const apiUrl = getApiUrl()
        const response = await axios.get(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.user) {
          setUser(normalizeUser(response.data.user))
        }
        return
      }

      const apiUrl = getApiUrl()
      const response = await axios.put(`${apiUrl}/users/me`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.user) {
        setUser(normalizeUser(response.data.user))
      } else {
        setUser(prev => prev ? { ...prev, ...data } : null)
      }
    } catch (error: any) {
      if (data.profilePicture) {
        setUser(prev => prev ? { ...prev, ...data } : null)
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
