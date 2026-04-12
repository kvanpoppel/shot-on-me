'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  X, Bell, Shield, CreditCard, Users, Gift, LogOut, ChevronRight,
  Moon, HelpCircle, FileText, Lock, Trash2, Loader,
} from 'lucide-react'

interface SettingsMenuProps {
  onClose: () => void
  onOpenRewards?: () => void
  onOpenReferrals?: () => void
}

export default function SettingsMenu({ onClose, onOpenRewards, onOpenReferrals }: SettingsMenuProps) {
  const { user, token, logout } = useAuth()
  const API_URL = useApiUrl()
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleToggleNotif = async () => {
    const next = !notifEnabled
    setNotifEnabled(next)
    setSaving(true)
    try {
      await axios.put(`${API_URL}/users/me`,
        { notifications: { enabled: next } },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your Fizz account? This cannot be undone.')) return
    if (!confirm('Last chance — all your data, balance, and history will be permanently deleted.')) return
    try {
      await axios.delete(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      logout()
    } catch {
      showToast('Could not delete account. Contact support.')
    }
  }

  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: <Gift className="w-4 h-4" style={{ color: '#C8F135' }} />,
          label: 'Rewards',
          sublabel: 'Your points & catalog',
          accent: '#C8F135',
          onPress: () => { onOpenRewards?.(); onClose() },
        },
        {
          icon: <Users className="w-4 h-4" style={{ color: '#00D4FF' }} />,
          label: 'Invite Friends',
          sublabel: 'Earn rewards for referrals',
          accent: '#00D4FF',
          onPress: () => { onOpenReferrals?.(); onClose() },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell className="w-4 h-4" style={{ color: '#FF9A57' }} />,
          label: 'Push Notifications',
          sublabel: notifEnabled ? 'Enabled' : 'Disabled',
          accent: '#FF9A57',
          toggle: true,
          value: notifEnabled,
          onPress: handleToggleNotif,
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: <FileText className="w-4 h-4 text-white/40" />,
          label: 'Terms of Service',
          onPress: () => window.open('/terms', '_blank'),
        },
        {
          icon: <Shield className="w-4 h-4 text-white/40" />,
          label: 'Privacy Policy',
          onPress: () => window.open('/privacy', '_blank'),
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: <LogOut className="w-4 h-4" style={{ color: '#FF5F57' }} />,
          label: 'Sign Out',
          danger: true,
          onPress: () => { logout(); onClose() },
        },
        {
          icon: <Trash2 className="w-4 h-4" style={{ color: '#FF5F57' }} />,
          label: 'Delete Account',
          danger: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl text-sm font-semibold shadow-2xl" style={{ background: '#C8F135', color: '#1A1A2E' }}>
          {toast}
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col animate-slide-up"
        style={{ background: '#1A1A2E', maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Settings</h2>
            <p className="text-xs text-white/35 mt-0.5">{user?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-10 safe-bottom">
          {sections.map(section => (
            <div key={section.title} className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {section.title}
              </p>
              <div className="fizz-card overflow-hidden">
                {section.items.map((item, i) => (
                  <button
                    key={item.label}
                    onClick={item.onPress}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                    style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: (item as any).danger ? '#FF5F57' : 'white' }}>
                        {item.label}
                      </p>
                      {(item as any).sublabel && (
                        <p className="text-xs text-white/35 mt-0.5">{(item as any).sublabel}</p>
                      )}
                    </div>
                    {(item as any).toggle ? (
                      <div
                        className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
                        style={{ background: (item as any).value ? '#C8F135' : '#252540' }}
                      >
                        <div
                          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: (item as any).value ? 'calc(100% - 20px)' : '4px' }}
                        />
                      </div>
                    ) : !(item as any).danger ? (
                      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* App version */}
          <p className="text-center text-xs text-white/20 mt-2">Fizz · v1.0.0</p>
        </div>
      </div>
    </>
  )
}
