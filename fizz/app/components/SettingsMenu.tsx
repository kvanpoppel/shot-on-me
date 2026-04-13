'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import {
  X, Bell, Shield, MessageCircle, Users, Gift, LogOut, ChevronRight,
  Heart, FileText, Trash2, Sparkles,
} from 'lucide-react'

interface SettingsMenuProps {
  onClose: () => void
  onOpenRewards?: () => void
  onOpenReferrals?: () => void
}

interface NotifPrefs {
  allEnabled: boolean
  messages: boolean
  fizzReceived: boolean
  friendRequests: boolean
  feedActivity: boolean
}

export default function SettingsMenu({ onClose, onOpenRewards, onOpenReferrals }: SettingsMenuProps) {
  const { user, token, logout } = useAuth()
  const API_URL = useApiUrl()
  const [toast, setToast] = useState<string | null>(null)

  const savedPrefs = (user as any)?.fizzProfile?.notifPrefs
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    allEnabled: savedPrefs?.allEnabled ?? true,
    messages: savedPrefs?.messages ?? true,
    fizzReceived: savedPrefs?.fizzReceived ?? true,
    friendRequests: savedPrefs?.friendRequests ?? true,
    feedActivity: savedPrefs?.feedActivity ?? true,
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const saveNotifPrefs = async (prefs: NotifPrefs) => {
    try {
      await axios.put(`${API_URL}/fizz/profile`,
        { notifPrefs: prefs },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch { /* ignore */ }
  }

  const togglePref = (key: keyof NotifPrefs) => {
    setNotifPrefs(prev => {
      let next: NotifPrefs
      if (key === 'allEnabled') {
        const allOn = !prev.allEnabled
        next = { allEnabled: allOn, messages: allOn, fizzReceived: allOn, friendRequests: allOn, feedActivity: allOn }
      } else {
        next = { ...prev, [key]: !prev[key] }
        // If any individual is enabled, keep master on; if all off, turn master off
        const anyOn = Object.entries(next).filter(([k]) => k !== 'allEnabled').some(([, v]) => v)
        next.allEnabled = anyOn
      }
      saveNotifPrefs(next)
      return next
    })
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

  const accountItems = [
    {
      icon: <Gift className="w-4 h-4" style={{ color: '#C8F135' }} />,
      label: 'Rewards',
      sublabel: 'Your points & catalog',
      onPress: () => { onOpenRewards?.(); onClose() },
    },
    {
      icon: <Users className="w-4 h-4" style={{ color: '#00D4FF' }} />,
      label: 'Invite Friends',
      sublabel: 'Earn rewards for referrals',
      onPress: () => { onOpenReferrals?.(); onClose() },
    },
  ]

  const legalItems = [
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
  ]

  const dangerItems = [
    {
      icon: <LogOut className="w-4 h-4" style={{ color: '#FF5F57' }} />,
      label: 'Sign Out',
      onPress: () => { logout(); onClose() },
    },
    {
      icon: <Trash2 className="w-4 h-4" style={{ color: '#FF5F57' }} />,
      label: 'Delete Account',
      onPress: handleDeleteAccount,
    },
  ]

  const Toggle = ({ value }: { value: boolean }) => (
    <div className="w-11 h-6 rounded-full relative transition-all flex-shrink-0" style={{ background: value ? '#C8F135' : '#252540' }}>
      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: value ? 'calc(100% - 20px)' : '4px' }} />
    </div>
  )

  const SettingRow = ({ icon, label, sublabel, onPress, toggle, value, danger, border }: {
    icon: React.ReactNode; label: string; sublabel?: string; onPress: () => void
    toggle?: boolean; value?: boolean; danger?: boolean; border?: boolean
  }) => (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
      style={border ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: danger ? '#FF5F57' : 'white' }}>{label}</p>
        {sublabel && <p className="text-xs text-white/35 mt-0.5">{sublabel}</p>}
      </div>
      {toggle ? <Toggle value={value!} /> : !danger ? <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" /> : null}
    </button>
  )

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

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-10 safe-bottom">

          {/* Account */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Account</p>
            <div className="fizz-card overflow-hidden">
              {accountItems.map((item, i) => (
                <SettingRow key={item.label} {...item} border={i > 0} />
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Notifications</p>
            <div className="fizz-card overflow-hidden">
              {/* Master toggle */}
              <SettingRow
                icon={<Bell className="w-4 h-4" style={{ color: '#FF9A57' }} />}
                label="All Notifications"
                sublabel={notifPrefs.allEnabled ? 'Receiving alerts' : 'All muted'}
                toggle value={notifPrefs.allEnabled}
                onPress={() => togglePref('allEnabled')}
              />
              {/* Per-type toggles — dimmed when master is off */}
              <div style={{ opacity: notifPrefs.allEnabled ? 1 : 0.4, transition: 'opacity 0.2s', pointerEvents: notifPrefs.allEnabled ? 'auto' : 'none' }}>
                <SettingRow
                  icon={<MessageCircle className="w-4 h-4" style={{ color: '#00D4FF' }} />}
                  label="Direct Messages"
                  sublabel="When someone sends you a message"
                  toggle value={notifPrefs.messages}
                  onPress={() => togglePref('messages')}
                  border
                />
                <SettingRow
                  icon={<Sparkles className="w-4 h-4" style={{ color: '#C8F135' }} />}
                  label="Fizz Received"
                  sublabel="When a friend sends you a Fizz"
                  toggle value={notifPrefs.fizzReceived}
                  onPress={() => togglePref('fizzReceived')}
                  border
                />
                <SettingRow
                  icon={<Users className="w-4 h-4" style={{ color: '#A78BFA' }} />}
                  label="Friend Requests"
                  sublabel="New requests & acceptances"
                  toggle value={notifPrefs.friendRequests}
                  onPress={() => togglePref('friendRequests')}
                  border
                />
                <SettingRow
                  icon={<Heart className="w-4 h-4" style={{ color: '#FF5F57' }} />}
                  label="Feed Activity"
                  sublabel="Likes and comments on your posts"
                  toggle value={notifPrefs.feedActivity}
                  onPress={() => togglePref('feedActivity')}
                  border
                />
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Legal</p>
            <div className="fizz-card overflow-hidden">
              {legalItems.map((item, i) => (
                <SettingRow key={item.label} {...item} border={i > 0} />
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Danger Zone</p>
            <div className="fizz-card overflow-hidden">
              {dangerItems.map((item, i) => (
                <SettingRow key={item.label} {...item} danger border={i > 0} />
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-white/20 mt-2">Fizz · v1.0.0</p>
        </div>
      </div>
    </>
  )
}
