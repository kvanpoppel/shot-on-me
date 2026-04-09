'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import LandingPage from './components/LandingPage'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import HomeTab from './components/HomeTab'
import VenueDiscovery from './components/VenueDiscovery'
import SendFizz from './components/SendFizz'
import FeedTab from './components/FeedTab'
import ProfileTab from './components/ProfileTab'
import { Tab } from './types'

type LandingMode = 'landing' | 'signin' | 'register'

function FizzApp() {
  const { user, loading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [landingMode, setLandingMode] = useState<LandingMode>('landing')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [prefillVenueId, setPrefillVenueId] = useState<string | undefined>()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Clear any stale service workers
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)))
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
    }
    setIsMounted(true)
  }, [])

  if (typeof window === 'undefined') return null
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A2E' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl animate-float" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🫧
          </div>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A2E' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl animate-float" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🫧
          </div>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Not logged in — show landing or auth screens
  if (!user) {
    if (landingMode === 'landing') {
      return (
        <LandingPage
          onSignIn={() => setLandingMode('signin')}
          onCreateAccount={() => setLandingMode('register')}
        />
      )
    }
    return (
      <LoginScreen
        initialMode={landingMode === 'register' ? 'register' : 'signin'}
        onBack={() => setLandingMode('landing')}
      />
    )
  }

  // Logged in — show main app
  const handleSendFizz = (venueId?: string) => {
    setPrefillVenueId(venueId)
    setActiveTab('send')
  }

  const handleSendClose = () => {
    setPrefillVenueId(undefined)
    setActiveTab('home')
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1A1A2E' }}>
      {/* Top bar — not shown on send tab (full screen) */}
      {activeTab !== 'send' && (
        <Dashboard onOpenSearch={undefined} />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'home' && (
          <HomeTab
            onSendFizz={handleSendFizz}
            onDiscover={() => setActiveTab('discover')}
          />
        )}
        {activeTab === 'discover' && (
          <VenueDiscovery onSendFizz={handleSendFizz} />
        )}
        {activeTab === 'send' && (
          <SendFizz
            prefillVenueId={prefillVenueId}
            onClose={handleSendClose}
          />
        )}
        {activeTab === 'feed' && (
          <FeedTab onSendFizz={() => setActiveTab('send')} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab />
        )}
      </main>

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default function Page() {
  return <FizzApp />
}
