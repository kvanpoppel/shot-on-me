'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import FeedTab from './components/FeedTab'
import WalletTab from './components/WalletTab'
import MapTab from './components/MapTab'
import ProfileTab from './components/ProfileTab'
import HomeTab from './components/HomeTab'
import MessagesTab from './components/MessagesTab'
import GroupChatsTab from './components/GroupChatsTab'
import FriendProfile from './components/FriendProfile'
import ProximityNotifications from './components/ProximityNotifications'
import PermissionsManager from './components/PermissionsManager'
import TonightTab from './components/TonightTab'
import BadgesScreen from './components/BadgesScreen'
import LeaderboardsScreen from './components/LeaderboardsScreen'
import RewardsScreen from './components/RewardsScreen'
import ReferralScreen from './components/ReferralScreen'
import MyVenuesTab from './components/MyVenuesTab'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Tab } from '@/app/types'

function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewingProfile, setViewingProfile] = useState<string | null>(null)
  const [autoOpenSendForm, setAutoOpenSendForm] = useState(false)
  const [autoOpenAddFunds, setAutoOpenAddFunds] = useState(false)
  const [autoOpenPostForm, setAutoOpenPostForm] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Clear caches but DON'T reload (prevents infinite loop)
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)))
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
    }
    
    setIsMounted(true)
  }, [])

  // Scroll to top when returning to home tab
  useEffect(() => {
    if (activeTab === 'home' && typeof window !== 'undefined') {
      // Force scroll to absolute top - use requestAnimationFrame for reliable execution
      const scrollToTop = () => {
        // Use all available scroll methods
        if (typeof window !== 'undefined') {
          window.scrollTo(0, 0)
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
        if (typeof document !== 'undefined') {
          if (document.documentElement) {
            document.documentElement.scrollTop = 0
            document.documentElement.scrollLeft = 0
          }
          if (document.body) {
            document.body.scrollTop = 0
            document.body.scrollLeft = 0
          }
          // Also try scrolling the main element
          const mainElement = document.querySelector('main')
          if (mainElement) {
            mainElement.scrollTop = 0
          }
          // Force scroll on window - check current position and force scroll if needed
          if (typeof window !== 'undefined') {
            if (typeof window.pageYOffset !== 'undefined' && window.pageYOffset > 0) {
              window.scrollTo(0, 0)
            }
            if (typeof window.scrollY !== 'undefined' && window.scrollY > 0) {
              window.scrollTo(0, 0)
            }
          }
        }
      }
      
      // Scroll immediately using requestAnimationFrame for better reliability
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          scrollToTop()
          // Also scroll after brief delays
          setTimeout(scrollToTop, 0)
          setTimeout(scrollToTop, 10)
          setTimeout(scrollToTop, 50)
          setTimeout(scrollToTop, 100)
          setTimeout(scrollToTop, 200)
        })
      } else {
        // Fallback if requestAnimationFrame not available
        scrollToTop()
        setTimeout(scrollToTop, 0)
        setTimeout(scrollToTop, 50)
        setTimeout(scrollToTop, 100)
      }
    }
  }, [activeTab])

  // Removed console.log to reduce noise - tab changes are handled by state

  useEffect(() => {
    if (!user || loading) return
    
    const handleHashChange = () => {
      if (window.location.hash === '#profile') {
        setActiveTab('profile')
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setActiveTab, user, loading])

  // Listen for open-post-form event
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOpenPostForm = () => {
      setAutoOpenPostForm(true)
      setActiveTab('feed')
    }
    
    window.addEventListener('open-post-form', handleOpenPostForm)
    return () => window.removeEventListener('open-post-form', handleOpenPostForm)
  }, [])

  // CRITICAL: NEVER render anything during SSR - completely client-only
  // This is the nuclear option to prevent ALL hydration mismatches
  if (typeof window === 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Wait for mount AND loading to complete
  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login screen if no user
  if (!user) {
    return <LoginScreen />
  }

  return (
    <ErrorBoundary>
      {user && isMounted && <PermissionsManager />}
      <Dashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        viewingProfile={viewingProfile}
        setViewingProfile={setViewingProfile}
        onOpenAddFunds={() => setAutoOpenAddFunds(true)}
      />
      <ProximityNotifications />
      <main className="pt-20 min-h-screen bg-black pb-20 overflow-y-auto">
        {activeTab === 'home' && (
          <HomeTab 
            setActiveTab={setActiveTab} 
            onViewProfile={setViewingProfile} 
            onSendMoney={() => {
              setAutoOpenSendForm(true)
              setActiveTab('wallet')
            }} 
          />
        )}
        {activeTab === 'wallet' && <WalletTab 
          autoOpenSendForm={autoOpenSendForm} 
          onSendFormOpened={() => setAutoOpenSendForm(false)}
          autoOpenAddFunds={autoOpenAddFunds}
          onAddFundsOpened={() => setAutoOpenAddFunds(false)}
        />}
        {activeTab === 'feed' && (
          <ErrorBoundary>
            <FeedTab 
              onViewProfile={setViewingProfile} 
              autoOpenPostForm={autoOpenPostForm}
              onPostFormOpened={() => setAutoOpenPostForm(false)}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'map' && (
          <MapTab 
            setActiveTab={setActiveTab} 
            onViewProfile={setViewingProfile} 
            activeTab={activeTab}
            onOpenSettings={() => {
              // Trigger settings modal from Dashboard
              const event = new CustomEvent('open-settings')
              window.dispatchEvent(event)
            }}
          />
        )}
        {/* Messages are now in header modal, not a tab */}
        {activeTab === 'groups' && <GroupChatsTab onViewProfile={setViewingProfile} />}
        {activeTab === 'profile' && <ProfileTab onViewProfile={setViewingProfile} setActiveTab={setActiveTab} />}
        {/* Menu items from hamburger menu */}
        {activeTab === 'tonight' && <TonightTab />}
        {activeTab === 'badges' && <BadgesScreen />}
        {activeTab === 'leaderboards' && <LeaderboardsScreen />}
        {activeTab === 'rewards' && <RewardsScreen />}
        {activeTab === 'referrals' && <ReferralScreen />}
        {activeTab === 'venues' && <MyVenuesTab />}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {viewingProfile && (
        <FriendProfile
          userId={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onSendShot={(userId) => {
            setViewingProfile(null)
            setAutoOpenSendForm(true)
            setActiveTab('wallet')
          }}
        />
      )}
    </ErrorBoundary>
  )
}

// Export Home component directly - dynamic import can cause 404 issues
export default Home

