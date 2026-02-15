'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'
import axios from 'axios'
import { getApiUrl } from './utils/api'
import { ArrowRight } from 'lucide-react'

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register' | null>(null)
  const [venueContextName, setVenueContextName] = useState<string | null>(null)
  const venueSlug = searchParams.get('venue')

  const setAuthMode = (nextMode: 'login' | 'register') => {
    if (mode === nextMode) {
      setMode(null)
      router.push(buildAuthPath(null), { scroll: false })
      return
    }

    setMode(nextMode)
    router.push(buildAuthPath(nextMode), { scroll: false })
  }

  const toggleAuthPanel = () => {
    setAuthMode('login')
  }

  const openRegisterPanel = () => {
    setAuthMode('register')
  }

  useEffect(() => {
    // Auto-redirect to dashboard if user is already logged in
    if (!loading && user) {
      console.log('User already logged in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'login' || tab === 'register') {
      setMode(tab)
    } else {
      setMode(null)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchVenueContext = async () => {
      if (!venueSlug) {
        setVenueContextName(null)
        return
      }

      try {
        const apiUrl = getApiUrl()
        const response = await axios.get(`${apiUrl}/venues/slug/${encodeURIComponent(venueSlug)}/public`)
        setVenueContextName(response.data?.venue?.name || null)
      } catch {
        setVenueContextName(null)
      }
    }

    fetchVenueContext()
  }, [venueSlug])

  const buildAuthPath = (tab: 'login' | 'register' | null) => {
    const params = new URLSearchParams()
    if (tab) params.set('tab', tab)
    if (venueSlug) params.set('venue', venueSlug)
    const query = params.toString()
    return query ? `/?${query}` : '/'
  }

  // Show loading spinner while checking for saved login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Checking login status...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col" suppressHydrationWarning>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-black to-black" aria-hidden="true"></div>
      
      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center container mx-auto px-4 py-8 w-full max-w-4xl">
        <div className="w-full space-y-6">
          {/* Centered Branding */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-5xl lg:text-7xl logo-script text-primary-500 animate-scale-in">
              Shot On Me
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-primary-500 to-transparent mx-auto mb-2 animate-slide-up"></div>
            <p className="text-xl lg:text-2xl text-primary-400 font-light animate-slide-up">
              The Complete Venue Management Platform
            </p>
            <p className="text-base lg:text-lg text-primary-500/70 max-w-2xl mx-auto animate-slide-up">
              Manage promotions and venue growth from one simple dashboard.
            </p>
            {venueSlug && (
              <p className="text-sm text-primary-400/80">
                Venue Portal URL: <span className="text-primary-500 font-semibold">/v/{venueSlug}</span>
                {venueContextName ? ` - ${venueContextName}` : ''}
              </p>
            )}
            {mode === null ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={openRegisterPanel}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleAuthPanel}
                  className="text-sm font-medium text-primary-400/85 underline-offset-2 hover:text-primary-500 hover:underline"
                >
                  Sign In
                </button>
              </div>
            ) : null}
          </div>

          {/* Login/Registration Form - Centered (only shown when tab is selected) */}
          {mode === 'login' || mode === 'register' ? (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="bg-black/60 backdrop-blur-sm border border-primary-500/30 rounded-xl shadow-lg p-6 md:p-8 hover:border-primary-500/50 transition-all duration-300 transform hover:scale-[1.01]">
                <LoginForm initialMode={mode} />
              </div>
            </div>
          ) : null}

          {mode === null ? (
            <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-primary-500/20 bg-black/40 px-3 py-2 text-xs text-primary-400/85">
                Launch deals in under 60 seconds
              </div>
              <div className="rounded-lg border border-primary-500/20 bg-black/40 px-3 py-2 text-xs text-primary-400/85">
                AI optimization drives repeat traffic
              </div>
              <div className="rounded-lg border border-primary-500/20 bg-black/40 px-3 py-2 text-xs text-primary-400/85">
                Teams onboard in minutes
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
