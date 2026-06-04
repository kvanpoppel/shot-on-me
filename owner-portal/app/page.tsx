'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

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
    <main className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl logo-script text-primary-500 mb-2">
              Shot On Me
            </h1>
            <p className="text-primary-400 text-lg font-semibold">
              Owner Dashboard
            </p>
            <p className="text-primary-400/70 text-sm mt-2">
              Platform monitoring and analytics
            </p>
          </div>
          <div className="bg-black border-2 border-primary-500 rounded-lg shadow-xl p-8">
            <LoginForm />
          </div>
          <footer className="mt-8 text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <a href="/terms" className="text-xs text-primary-400/40 hover:text-primary-400 transition-colors underline underline-offset-2">
                Terms of Service
              </a>
              <span className="text-primary-400/20">·</span>
              <a href="/privacy" className="text-xs text-primary-400/40 hover:text-primary-400 transition-colors underline underline-offset-2">
                Privacy Policy
              </a>
            </div>
            <p className="text-xs text-primary-400/30">&copy; 2026 Shot On Me LLC</p>
          </footer>
        </div>
      </div>
    </main>
  )
}

