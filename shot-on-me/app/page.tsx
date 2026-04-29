'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { useAuth } from './contexts/AuthContext'
import { useApiUrl } from './utils/api'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import FeedTab from './components/FeedTab'
import WalletTab from './components/WalletTab'
import MapTab from './components/MapTab'
import ProfileTab from './components/ProfileTab'
import HomeTab from './components/HomeTab'
import MessagesTab from './components/MessagesTab'
import { usePushNotifications } from './hooks/usePushNotifications'
import GroupChatsTab from './components/GroupChatsTab'
import FriendProfile from './components/FriendProfile'
import ProximityNotifications from './components/ProximityNotifications'
import PermissionsManager from './components/PermissionsManager'
import TonightTab from './components/TonightTab'
import RewardsScreen from './components/RewardsScreen'
import ReferralScreen from './components/ReferralScreen'
import MyVenuesTab from './components/MyVenuesTab'
import WhatsHappeningTab from './components/WhatsHappeningTab'
import { ErrorBoundary } from './components/ErrorBoundary'
import VenueProfilePage from './components/VenueProfilePage'
import { Tab } from '@/app/types'

function Home() {
  const { user, token, loading } = useAuth()
  const API_URL = useApiUrl()
  usePushNotifications()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewingProfile, setViewingProfile] = useState<string | null>(null)
  const [autoOpenSendForm, setAutoOpenSendForm] = useState(false)
  const [autoOpenAddFunds, setAutoOpenAddFunds] = useState(false)
  const [prefilledRecipient, setPrefilledRecipient] = useState<{ id: string; name: string } | null>(null)
  const [autoOpenPostForm, setAutoOpenPostForm] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [pendingVenueId, setPendingVenueId] = useState<string | null>(null)
  const [savedGoogleVenues, setSavedGoogleVenues] = useState<any[]>([])
  const [viewingVenueId, setViewingVenueId] = useState<string | null>(null)

  const refreshSavedVenues = async () => {
    if (!token) { console.log('[page] refreshSavedVenues: no token'); return }
    try {
      console.log('[page] fetching saved venues...')
      const res = await axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` } })
      console.log('[page] saved venues:', res.data?.venues?.length)
      setSavedGoogleVenues(res.data?.venues || [])
    } catch (e) {
      console.error('[page] refreshSavedVenues failed:', e)
    }
  }

  useEffect(() => {
    if (!token) return
    console.log('[page] token ready, fetching saved venues')
    axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { console.log('[page] got', res.data?.venues?.length, 'saved venues'); setSavedGoogleVenues(res.data?.venues || []) })
      .catch(e => console.error('[page] saved venues fetch error:', e))
  }, [token])

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

  // Listen for send-drink event (from feed or find-friends modal)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSendDrink = () => {
      setAutoOpenSendForm(true)
      setActiveTab('wallet')
    }
    window.addEventListener('send-drink', handleSendDrink as EventListener)
    return () => window.removeEventListener('send-drink', handleSendDrink as EventListener)
  }, [])

  // Listen for push notification deep links
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) setActiveTab(e.detail.tab)
    }
    window.addEventListener('navigate-tab', handleNavigate as EventListener)
    return () => window.removeEventListener('navigate-tab', handleNavigate as EventListener)
  }, [])

  // Listen for search modal open/close events
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOpenSearch = () => {
      setIsSearchOpen(true)
    }
    const handleCloseSearch = () => {
      setIsSearchOpen(false)
    }
    
    window.addEventListener('open-search', handleOpenSearch)
    window.addEventListener('close-search', handleCloseSearch)
    return () => {
      window.removeEventListener('open-search', handleOpenSearch)
      window.removeEventListener('close-search', handleCloseSearch)
    }
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
        onViewVenueProfile={(venueId) => setPendingVenueId(venueId)}
      />
      <ProximityNotifications />
      <main className={`bg-black ${activeTab === 'messages' || activeTab === 'groups' ? 'h-screen overflow-hidden' : 'min-h-screen overflow-y-auto'}`}>
        {activeTab === 'home' && (
          <HomeTab
            setActiveTab={setActiveTab}
            onViewProfile={setViewingProfile}
            onViewVenue={setViewingVenueId}
            onSendMoney={() => {
              setAutoOpenSendForm(true)
              setActiveTab('wallet')
            }}
          />
        )}
        {activeTab === 'wallet' && <WalletTab
          autoOpenSendForm={autoOpenSendForm}
          onSendFormOpened={() => { setAutoOpenSendForm(false); setPrefilledRecipient(null) }}
          autoOpenAddFunds={autoOpenAddFunds}
          onAddFundsOpened={() => setAutoOpenAddFunds(false)}
          prefilledRecipientId={prefilledRecipient?.id}
          prefilledRecipientName={prefilledRecipient?.name}
        />}
        {/* FeedTab stays mounted once visited so posts are never lost on tab switch */}
        <div className={activeTab === 'feed' ? '' : 'hidden'}>
          <ErrorBoundary>
            <FeedTab
              onViewProfile={setViewingProfile}
              autoOpenPostForm={autoOpenPostForm}
              onPostFormOpened={() => setAutoOpenPostForm(false)}
              onSendDrink={(userId, name) => {
                setPrefilledRecipient(userId ? { id: userId, name: name || '' } : null)
                setAutoOpenSendForm(true)
                setActiveTab('wallet')
              }}
            />
          </ErrorBoundary>
        </div>
        {activeTab === 'map' && (
          <MapTab
            setActiveTab={setActiveTab}
            onViewProfile={setViewingProfile}
            activeTab={activeTab}
            onVenueSaved={refreshSavedVenues}
            savedGoogleVenues={savedGoogleVenues}
            onSavedVenuesChange={refreshSavedVenues}
            onOpenSettings={() => {
              // Trigger settings modal from Dashboard
              const event = new CustomEvent('open-settings')
              window.dispatchEvent(event)
            }}
          />
        )}
        {activeTab === 'messages' && <MessagesTab setActiveTab={setActiveTab} activeTab={activeTab} onViewProfile={setViewingProfile} />}
        {activeTab === 'groups' && <GroupChatsTab onViewProfile={setViewingProfile} />}
        {activeTab === 'profile' && <ProfileTab onViewProfile={setViewingProfile} setActiveTab={setActiveTab} onOpenSettings={() => window.dispatchEvent(new CustomEvent('open-settings'))} />}
        {activeTab === 'tonight' && <TonightTab onViewProfile={setViewingProfile} onSendDrink={(userId, name) => { setPrefilledRecipient({ id: userId, name }); setAutoOpenSendForm(true); setActiveTab('wallet') }} />}
        {activeTab === 'rewards' && <RewardsScreen />}
        {activeTab === 'referrals' && <ReferralScreen />}
        {activeTab === 'venues' && (
          <MyVenuesTab
            initialOpenVenueId={pendingVenueId}
            onVenueOpened={() => setPendingVenueId(null)}
            savedGoogleVenues={savedGoogleVenues}
            onSavedVenuesChange={refreshSavedVenues}
          />
        )}
        {activeTab === 'happening' && <WhatsHappeningTab setActiveTab={setActiveTab} onViewProfile={setViewingProfile} />}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} isSearchOpen={isSearchOpen} />
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

      {/* Venue detail modal — opens from Home tab venue cards */}
      {viewingVenueId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 z-10 flex justify-end p-3">
              <button
                onClick={() => setViewingVenueId(null)}
                className="w-10 h-10 rounded-full bg-black/80 border border-primary-500/30 flex items-center justify-center text-primary-400"
              >
                ✕
              </button>
            </div>
            <VenueProfilePage
              venueId={viewingVenueId}
              onClose={() => setViewingVenueId(null)}
              onSendDrink={() => {
                setViewingVenueId(null)
                setAutoOpenSendForm(true)
                setActiveTab('wallet')
              }}
            />
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}

// Export Home component directly - dynamic import can cause 404 issues
export default Home

