'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import axios from 'axios'
import { getApiUrl } from '../utils/api'

axios.defaults.withCredentials = true

interface Venue {
  id: string
  _id?: string
  name: string
  slug?: string
  venueType?: string
  city?: string
  address?: string
  wallet?: { balance: number; pendingBalance: number }
}

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  userType: string
  wallet?: { balance: number; pendingBalance: number }
  venue?: Venue
}

interface AuthContextType {
  user: AuthUser | null
  venue: Venue | null
  token: string | null
  loading: boolean
  error: string
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshVenue: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchVenue = useCallback(async (tok: string) => {
    try {
      const res = await axios.get(`${getApiUrl()}/venues`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const venues: Venue[] = res.data.venues || res.data || []
      if (venues.length > 0) {
        const v = venues[0]
        setVenue({ ...v, id: v.id || v._id || '' })
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const restore = async () => {
      try {
        const res = await axios.get(`${getApiUrl()}/auth/verify`)
        const u = res.data.user || res.data
        if (u && u.userType === 'venue') {
          const tok = res.data.token || ''
          setUser({ ...u, id: u.id || u._id })
          setToken(tok)
          await fetchVenue(tok)
        }
      } catch { /* not logged in */ } finally {
        setLoading(false)
      }
    }
    restore()
  }, [fetchVenue])

  const login = async (email: string, password: string) => {
    setError('')
    const res = await axios.post(`${getApiUrl()}/auth/login`, { email, password })
    const u = res.data.user || res.data
    if (u.userType !== 'venue') {
      throw new Error('This portal is for venue accounts only.')
    }
    const tok = res.data.token || ''
    setUser({ ...u, id: u.id || u._id })
    setToken(tok)
    await fetchVenue(tok)
  }

  const logout = async () => {
    try { await axios.post(`${getApiUrl()}/auth/logout`) } catch { /* ignore */ }
    setUser(null)
    setVenue(null)
    setToken(null)
  }

  const refreshVenue = useCallback(async () => {
    if (token) await fetchVenue(token)
  }, [token, fetchVenue])

  return (
    <AuthContext.Provider value={{ user, venue, token, loading, error, login, logout, refreshVenue }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
