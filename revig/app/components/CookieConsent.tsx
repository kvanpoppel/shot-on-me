'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'revig_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {}
  }, [])

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch {}
    setVisible(false)
  }

  const decline = () => {
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-lg mx-auto rounded-3xl p-4 flex flex-col gap-3 shadow-2xl" style={{ background: '#252540', border: '1px solid rgba(200,241,53,0.15)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-base" style={{ background: 'rgba(200,241,53,0.12)' }}>
            🍪
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-snug">We use cookies</p>
            <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Essential cookies keep you signed in and improve your experience.{' '}
              <a href="/privacy" className="underline" style={{ color: '#C8F135' }}>Privacy Policy</a>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-[2] py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
            style={{ background: '#C8F135', color: '#1A1A2E' }}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
