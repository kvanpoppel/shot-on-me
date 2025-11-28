'use client'

import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-48 bg-black/95 backdrop-blur-md border-r border-primary-500/10 min-h-screen">
        <div className="p-4">
          <h1 className="text-lg logo-script text-primary-500 mb-6 tracking-tight">Shot On Me</h1>
          <nav className="space-y-0.5">
            <Link 
              href="/dashboard" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard/promotions" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/promotions') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Promotions
            </Link>
            <Link 
              href="/dashboard/analytics" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/analytics') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Analytics
            </Link>
            <Link 
              href="/dashboard/redemptions" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/redemptions') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Redemptions
            </Link>
            <Link 
              href="/dashboard/settings" 
              className={`block px-3 py-2 rounded text-sm transition-all font-light ${
                isActive('/dashboard/settings') 
                  ? 'text-primary-500 bg-primary-500/10 border-l-2 border-primary-500' 
                  : 'text-primary-400/80 hover:bg-primary-500/5 hover:text-primary-500'
              }`}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 text-primary-400/70 hover:bg-primary-500/5 rounded hover:text-primary-500 mt-6 text-sm font-light transition-all"
            >
              Logout
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-black flex flex-col min-h-screen">
        {/* Top Bar */}
        <div className="bg-black/95 backdrop-blur-sm border-b border-primary-500/10 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg logo-script text-primary-500 tracking-tight">Kates Pub</h2>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 bg-primary-500 text-black rounded font-medium hover:bg-primary-600 text-xs transition-all">
              Notify
            </button>
            <button className="px-3 py-1.5 bg-black/40 border border-primary-500/20 text-primary-500 rounded hover:bg-primary-500/10 hover:border-primary-500/30 text-xs transition-all backdrop-blur-sm">
              Pause
            </button>
            <div className="relative ml-2">
              <div className="w-7 h-7 border border-primary-500/30 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <span className="text-primary-500 text-xs font-medium">K</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"></span>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

