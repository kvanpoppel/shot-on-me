'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../app/contexts/AuthContext'
import LoginScreen from '../app/components/LoginScreen'
import Dashboard from '../app/components/Dashboard'
import BottomNav from '../app/components/BottomNav'
import FeedTab from '../app/components/FeedTab'
import WalletTab from '../app/components/WalletTab'
import SendShotTab from '../app/components/SendShotTab'
import MapTab from '../app/components/MapTab'
import ProfileTab from '../app/components/ProfileTab'
import HomeTab from '../app/components/HomeTab'
import MessagesTab from '../app/components/MessagesTab'
import StoriesTab from '../app/components/StoriesTab'
import GroupChatsTab from '../app/components/GroupChatsTab'
import FriendProfile from '../app/components/FriendProfile'
import ProximityNotifications from '../app/components/ProximityNotifications'
import PermissionsManager from '../app/components/PermissionsManager'

type Tab = 'home' | 'feed' | 'map' | 'wallet' | 'profile' | 'messages' | 'stories' | 'groups' | 'send-shot'

export default function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewingProfile, setViewingProfile] = useState<string | null>(null)

  useEffect(() => {
    console.log('Active tab changed to:', activeTab)
  }, [activeTab])

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
      <PermissionsManager />
      <Dashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        viewingProfile={viewingProfile}
        setViewingProfile={setViewingProfile}
      />
      <ProximityNotifications />
      <main className="pt-16 min-h-screen bg-black pb-16">
        {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} onViewProfile={setViewingProfile} />}
        {activeTab === 'send-shot' && <SendShotTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'feed' && <FeedTab onViewProfile={setViewingProfile} />}
        {activeTab === 'stories' && <StoriesTab onViewProfile={setViewingProfile} />}
        {activeTab === 'map' && <MapTab setActiveTab={setActiveTab} />}
        {activeTab === 'messages' && <MessagesTab onViewProfile={setViewingProfile} setActiveTab={setActiveTab} />}
        {activeTab === 'groups' && <GroupChatsTab onViewProfile={setViewingProfile} />}
        {activeTab === 'profile' && <ProfileTab onViewProfile={setViewingProfile} />}
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
    </>
  )
}

