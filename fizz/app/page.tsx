'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useApiUrl } from './utils/api'
import axios from 'axios'
import LandingPage from './components/LandingPage'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import HomeTab from './components/HomeTab'
import VenueDiscovery from './components/VenueDiscovery'
import SendFizz from './components/SendFizz'
import FeedTab from './components/FeedTab'
import ProfileTab from './components/ProfileTab'
import NotificationsPanel from './components/NotificationsPanel'
import WalletTab from './components/WalletTab'
import MessagesTab from './components/MessagesTab'
import RewardsScreen from './components/RewardsScreen'
import ReferralScreen from './components/ReferralScreen'
import CrewsTab from './components/CrewsTab'
import SettingsMenu from './components/SettingsMenu'
import FindFriends from './components/FindFriends'
import SearchModal from './components/SearchModal'
import FriendProfile from './components/FriendProfile'
import { Tab } from './types'

type LandingMode = 'landing' | 'signin' | 'register'

interface PrefillRecipient {
  id: string; firstName?: string; lastName?: string
  username?: string; profilePicture?: string
}

function FizzApp() {
  const { user, token, loading } = useAuth()
  const API_URL = useApiUrl()
  const [isMounted, setIsMounted] = useState(false)
  const [savedGoogleVenues, setSavedGoogleVenues] = useState<any[]>([])
  const [landingMode, setLandingMode] = useState<LandingMode>('landing')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [prefillVenueId, setPrefillVenueId] = useState<string | undefined>()
  const [prefillRecipient, setPrefillRecipient] = useState<PrefillRecipient | undefined>()
  const [initialCategory, setInitialCategory] = useState<string | undefined>()

  // Overlay modals
  const [showNotifications, setShowNotifications] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [showReferrals, setShowReferrals] = useState(false)
  const [showCrews, setShowCrews] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFindFriends, setShowFindFriends] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [viewProfileUserId, setViewProfileUserId] = useState<string | undefined>()

  useEffect(() => {
    if (!token) return
    axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setSavedGoogleVenues(res.data?.venues || []))
      .catch(() => {})
  }, [token])

  const refreshSavedVenues = async () => {
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/saved-venues`, { headers: { Authorization: `Bearer ${token}` } })
      setSavedGoogleVenues(res.data?.venues || [])
    } catch {}
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)))
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
    }
    setIsMounted(true)
  }, [])

  const Loader = () => (
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

  if (!isMounted || loading) return <Loader />

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

  const handleSendFizz = (venueId?: string) => {
    setPrefillVenueId(venueId)
    setPrefillRecipient(undefined)
    setActiveTab('send')
  }

  const handleSendFizzToFriend = (friend: PrefillRecipient) => {
    setPrefillRecipient(friend)
    setPrefillVenueId(undefined)
    setActiveTab('send')
  }

  const handleSendClose = () => {
    setPrefillVenueId(undefined)
    setPrefillRecipient(undefined)
    setActiveTab('home')
  }

  const handleViewProfile = (userId: string) => {
    setViewProfileUserId(userId)
  }

  const showNav = activeTab !== 'send'

  return (
    <div className="flex flex-col overflow-hidden" style={{ background: '#1A1A2E', height: '100dvh' }}>

      {/* ── Overlay modals ── */}
      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      {showRewards && <RewardsScreen onClose={() => setShowRewards(false)} />}
      {showReferrals && <ReferralScreen onClose={() => setShowReferrals(false)} />}
      {showCrews && <CrewsTab onClose={() => setShowCrews(false)} />}
      {showSettings && (
        <SettingsMenu
          onClose={() => setShowSettings(false)}
          onOpenRewards={() => { setShowSettings(false); setShowRewards(true) }}
          onOpenReferrals={() => { setShowSettings(false); setShowReferrals(true) }}
        />
      )}
      {showFindFriends && (
        <FindFriends
          onClose={() => setShowFindFriends(false)}
          onViewProfile={(uid) => { setShowFindFriends(false); handleViewProfile(uid) }}
        />
      )}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onViewProfile={(uid) => { setShowSearch(false); handleViewProfile(uid) }}
        onSendFizz={(venueId) => { setShowSearch(false); handleSendFizz(venueId) }}
      />
      {viewProfileUserId && (
        <FriendProfile
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(undefined)}
          onSendFizz={(venueId) => { setViewProfileUserId(undefined); handleSendFizz(venueId) }}
          onSendFizzToFriend={(friend) => { setViewProfileUserId(undefined); handleSendFizzToFriend(friend) }}
        />
      )}

      {/* ── Top bar ── */}
      {showNav && (
        <Dashboard
          onOpenProfile={() => setActiveTab('profile')}
          onOpenWallet={() => setActiveTab('wallet')}
          onOpenSettings={() => setShowSettings(true)}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenRewards={() => setShowRewards(true)}
        />
      )}

      {/* ── Main content — offset by fixed header (56px) + bottom nav (56px) ── */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingTop: showNav ? 56 : 0, paddingBottom: showNav ? 56 : 0 }}
      >
        {activeTab === 'home' && (
          <HomeTab
            onSendFizz={handleSendFizz}
            onDiscover={(category?: string) => { setInitialCategory(category); setActiveTab('sips') }}
            onFindFriends={() => setShowFindFriends(true)}
          />
        )}
        {activeTab === 'feed' && (
          <FeedTab onSendFizz={() => setActiveTab('send')} />
        )}
        {(activeTab === 'sips' || activeTab === 'discover') && (
          <VenueDiscovery
            onSendFizz={handleSendFizz}
            savedGoogleVenues={savedGoogleVenues}
            onSavedVenuesChange={refreshSavedVenues}
            initialCategory={initialCategory}
            onCategoryConsumed={() => setInitialCategory(undefined)}
          />
        )}
        {activeTab === 'send' && (
          <SendFizz
            prefillVenueId={prefillVenueId}
            prefillRecipient={prefillRecipient}
            onClose={handleSendClose}
          />
        )}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'messages' && (
          <MessagesTab onClose={() => setActiveTab('home')} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            onOpenRewards={() => setShowRewards(true)}
            onOpenReferrals={() => setShowReferrals(true)}
            onOpenCrews={() => setShowCrews(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenFindFriends={() => setShowFindFriends(true)}
            onOpenWallet={() => setActiveTab('wallet')}
            onOpenFeed={() => setActiveTab('feed')}
          />
        )}
      </main>

      {/* ── Bottom nav ── */}
      {showNav && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  )
}

export default function Page() {
  return <FizzApp />
}
