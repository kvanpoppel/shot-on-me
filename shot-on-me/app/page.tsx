'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import FeedTab from './components/FeedTab'
import WalletTab from './components/WalletTab'
import SendShotTab from './components/SendShotTab'
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

export default function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewingProfile, setViewingProfile] = useState<string | null>(null)
  const [autoOpenSendForm, setAutoOpenSendForm] = useState(false)

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

  // Show login screen immediately if no token, don't wait for loading
  if (!user && !loading) {
    return <LoginScreen />
  }

  // Show minimal loading state - don't block the entire app
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <ErrorBoundary>
      <PermissionsManager />
      <Dashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        viewingProfile={viewingProfile}
        setViewingProfile={setViewingProfile}
      />
      <ProximityNotifications />
      <main className="pt-16 min-h-screen bg-black pb-16">
        {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} onViewProfile={setViewingProfile} onSendMoney={() => {
          setAutoOpenSendForm(true)
          setActiveTab('wallet')
        }} />}
        {activeTab === 'send-shot' && <SendShotTab />}
        {activeTab === 'wallet' && <WalletTab autoOpenSendForm={autoOpenSendForm} onSendFormOpened={() => setAutoOpenSendForm(false)} />}
        {activeTab === 'feed' && (
          <ErrorBoundary>
            <FeedTab onViewProfile={setViewingProfile} />
          </ErrorBoundary>
        )}
        {activeTab === 'map' && <MapTab setActiveTab={setActiveTab} />}
        {/* Messages are now in header modal, not a tab */}
        {activeTab === 'groups' && <GroupChatsTab onViewProfile={setViewingProfile} />}
        {activeTab === 'profile' && <ProfileTab onViewProfile={setViewingProfile} />}
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
            setActiveTab('send-shot')
          }}
        />
      )}
    </ErrorBoundary>
  )
}

