'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

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
  // If environment variable is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If accessing via IP address (mobile), use that IP for backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000/api`
    }
  }
  
  // Default to localhost
  return 'http://localhost:5000/api'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
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
    try {
      // Add timeout to prevent hanging
      const response = await axios.get(`${getApiUrlForRequest()}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000 // 5 second timeout
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
      const apiUrl = getApiUrlForRequest()
      console.log('Attempting login to:', `${apiUrl}/auth/login`)
      
      const response = await axios.post(`${apiUrl}/auth/login`, { email, password }, { 
        timeout: 30000, // Increased to 30 seconds
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
      setToken(authToken)
      setUser(userData)
      
      // Always save token to localStorage (it's needed for the app to work)
      // The rememberMe flag is just for UI preference
      localStorage.setItem('token', authToken)
      localStorage.setItem('rememberMe', rememberMe.toString())
      
      // Also save user email for auto-fill if remember me is checked
      if (rememberMe) {
        localStorage.setItem('savedEmail', email)
      } else {
        localStorage.removeItem('savedEmail')
      }
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
          const response = await axios.post(`${getApiUrlForRequest()}/auth/register`, data)
      const { token: authToken, user: userData } = response.data
      // Normalize user data - ensure id field exists
      if (userData && userData.id) {
        // Already has id, use as is
      } else if (userData && userData._id) {
        userData.id = userData._id.toString()
      }
      setToken(authToken)
      setUser(userData)
      localStorage.setItem('token', authToken)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      console.error('Registration error:', errorMessage, error)
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
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

