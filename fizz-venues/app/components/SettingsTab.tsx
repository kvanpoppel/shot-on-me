'use client'

import { useAuth } from '../contexts/AuthContext'
import { LogOut, MapPin, Mail, Building2, Phone, ExternalLink } from 'lucide-react'

export default function SettingsTab() {
  const { user, venue, logout } = useAuth()

  const rows = [
    { icon: <Building2 className="w-4 h-4" />, label: 'Venue Name', value: venue?.name },
    { icon: <MapPin className="w-4 h-4" />,    label: 'City',        value: venue?.city },
    { icon: <Mail className="w-4 h-4" />,      label: 'Email',       value: user?.email },
    { icon: <Phone className="w-4 h-4" />,     label: 'Account',     value: `${user?.firstName} ${user?.lastName}` },
  ].filter(r => r.value)

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-5" style={{ background: '#0F0F1E' }}>
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Settings</h1>
        <p className="text-xs text-white/40 mt-0.5">Venue account & support</p>
      </div>

      {/* Venue info */}
      <div className="fv-card overflow-hidden mb-5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center gap-3 px-4 py-3.5"
            style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white/30" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {row.icon}
            </div>
            <div>
              <p className="text-xs text-white/35">{row.label}</p>
              <p className="text-sm font-medium text-white">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="fv-card overflow-hidden mb-5">
        {[
          { label: 'Update Venue Profile', href: 'mailto:support@shotonme.com?subject=Update my Fizz venue profile' },
          { label: 'Stripe Payout Setup', href: 'https://dashboard.stripe.com' },
          { label: 'Help & Support', href: 'mailto:support@shotonme.com' },
        ].map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}
          >
            <span className="flex-1 text-sm font-medium text-white">{link.label}</span>
            <ExternalLink className="w-4 h-4 text-white/25" />
          </a>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
        style={{ background: 'rgba(255,95,87,0.12)', color: '#FF5F57', border: '1px solid rgba(255,95,87,0.25)' }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <p className="text-center text-xs text-white/20 mt-6">
        Fizz for Venues · Shot On Me, Inc.
      </p>
    </div>
  )
}
