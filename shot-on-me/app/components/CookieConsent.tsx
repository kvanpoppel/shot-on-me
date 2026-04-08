'use client'

import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'som_cookie_consent'

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
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 pb-safe">
      <div className="max-w-lg mx-auto bg-zinc-950 border border-primary-500/25 rounded-2xl shadow-2xl shadow-black/60 p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-white/85 font-semibold text-sm leading-snug">We use cookies</p>
            <p className="text-white/42 text-xs leading-relaxed mt-0.5">
              We use essential cookies to keep you signed in and improve your experience.{' '}
              <a href="/privacy" className="text-primary-400 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white/45 border border-white/10 hover:border-white/20 hover:text-white/65 transition-all"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-[2] py-2.5 rounded-xl text-xs font-bold bg-primary-500 text-black hover:bg-primary-400 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
