'use client'

import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import BottomNav, { Tab } from './components/BottomNav'
import DashboardHome from './components/DashboardHome'
import DealsTab from './components/DealsTab'
import RedemptionsTab from './components/RedemptionsTab'
import PayoutsTab from './components/PayoutsTab'
import SettingsTab from './components/SettingsTab'

function RevigVenuesApp() {
  const { user, loading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  useEffect(() => { setIsMounted(true) }, [])

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1E' }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl animate-float" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🧋
          </div>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C8F135', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0F0F1E' }}>
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 safe-top border-b" style={{ background: '#1A1A2E', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-lg font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span style={{ color: '#C8F135' }}>Re</span><span style={{ color: '#FF5F57' }}>vig</span>
          <span className="text-white text-sm font-semibold ml-1.5 opacity-50">Venues</span>
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: '#C8F135' }} title="Connected" />
      </div>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'dashboard'   && <DashboardHome />}
        {activeTab === 'deals'       && <DealsTab />}
        {activeTab === 'redemptions' && <RedemptionsTab />}
        {activeTab === 'payouts'     && <PayoutsTab />}
        {activeTab === 'settings'    && <SettingsTab />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <RevigVenuesApp />
    </AuthProvider>
  )
}
