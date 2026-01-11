'use client'

import { Home, MapPin, Wallet, User, MessageSquare, Bell, Camera, Send, LayoutGrid, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useApiUrl } from '../utils/api'
import { Tab } from '@/app/types'

interface BottomNavProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  isSearchOpen?: boolean
}

export default function BottomNav({ activeTab, setActiveTab, isSearchOpen = false }: BottomNavProps) {

  const tabs: Array<{ id: Tab | 'search'; icon: any; label: string; badge?: number; action?: () => void }> = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'feed' as Tab, icon: LayoutGrid, label: 'Feed' },
    { id: 'map' as Tab, icon: MapPin, label: 'Venues' },
    { id: 'wallet' as Tab, icon: Wallet, label: 'Wallet' },
    { 
      id: 'search' as any, 
      icon: Search, 
      label: 'Search',
      action: () => {
        // Dispatch custom event to trigger search in HomeTab
        window.dispatchEvent(new CustomEvent('open-search'))
      }
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-primary-500/10 z-[60]">
      <div className="flex justify-center items-center h-14 px-2 pointer-events-auto">
        <div className="flex items-center space-x-0.5 bg-black/40 border border-primary-500/15 rounded-full px-0.5 py-0.5 pointer-events-auto max-w-full overflow-x-auto scrollbar-hide backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isSearch = tab.id === 'search'
            // When search is open, only search tab is active. Otherwise, match by activeTab
            const isActive = isSearch 
              ? isSearchOpen 
              : !isSearchOpen && activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  // Close search modal if open when clicking any tab
                  if (tab.id !== 'search') {
                    window.dispatchEvent(new CustomEvent('close-search'))
                  }
                  
                  if (tab.action) {
                    tab.action()
                  } else if (!isSearch) {
                    // Smooth tab transition
                    setActiveTab(tab.id as Tab)
                    
                    // Scroll to top when switching tabs for better UX
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                type="button"
                className={`relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all cursor-pointer flex-shrink-0 min-w-[50px] ${
                  isActive
                    ? 'bg-primary-500 text-black' 
                    : 'text-primary-400 hover:text-primary-500 hover:bg-primary-500/10'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
                <span className="text-[9px] font-medium leading-tight">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

