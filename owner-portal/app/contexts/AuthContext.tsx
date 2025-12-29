'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }
    
    try {
      const storedToken = localStorage.getItem('owner_token')
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
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000
      })
      const userData = response.data.user || response.data
      setUser(userData)
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('owner_token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      }, {
        timeout: 15000
      })

      const { token: authToken, user: userData } = response.data
      
      if (authToken) {
        localStorage.setItem('owner_token', authToken)
        setToken(authToken)
        setUser(userData)
      } else {
        throw new Error('No token received')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('owner_token')
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

