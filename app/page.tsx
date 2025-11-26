'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import BottomNav from './components/BottomNav'
import FeedTab from './components/FeedTab'
import WalletTab from './components/WalletTab'
import MapTab from './components/MapTab'
import ProfileTab from './components/ProfileTab'
import HomeTab from './components/HomeTab'
import FriendProfile from './components/FriendProfile'
import ProximityNotifications from './components/ProximityNotifications'
import PermissionsManager from './components/PermissionsManager'

type Tab = 'home' | 'feed' | 'map' | 'wallet' | 'profile'

export default function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewingProfile, setViewingProfile] = useState<string | null>(null)

  // Debug: Log tab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab)
  }, [activeTab])

  // Listen for hash changes to navigate to profile tab
  useEffect(() => {
    if (!user || loading) return // Don't set up hash listener if not logged in
    
    const handleHashChange = () => {
      if (window.location.hash === '#profile') {
        setActiveTab('profile')
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Check on mount
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setActiveTab, user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <>
      {/* Permissions Manager - Shows on first launch */}
      <PermissionsManager />
      
      <Dashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        viewingProfile={viewingProfile}
        setViewingProfile={setViewingProfile}
      />
      
      {/* Proximity Notifications */}
      <ProximityNotifications />
      
      {/* Tab Content */}
      <main className="pt-16 min-h-screen bg-black pb-16">
        {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} onViewProfile={setViewingProfile} />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'feed' && <FeedTab onViewProfile={setViewingProfile} />}
        {activeTab === 'map' && <MapTab setActiveTab={setActiveTab} />}
        {activeTab === 'profile' && <ProfileTab onViewProfile={setViewingProfile} />}
      </main>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Friend Profile Modal */}
      {viewingProfile && (
        <FriendProfile
          userId={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onSendShot={(userId) => {
            setViewingProfile(null)
            setActiveTab('wallet')
            // Could pass userId to WalletTab to pre-fill recipient
          }}
        />
      )}
    </>
  )
}

