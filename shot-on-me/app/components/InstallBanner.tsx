'use client'

import { useState, useEffect } from 'react'
import { Share, X } from 'lucide-react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if previously dismissed this session
    if (sessionStorage.getItem('som-install-dismissed')) return

    // iOS detection — Safari doesn't fire beforeinstallprompt
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (ios) {
      setIsIOS(true)
      setShowBanner(true)
      return
    }

    // Android/Chrome — catch the install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowBanner(false)
    sessionStorage.setItem('som-install-dismissed', '1')
  }

  if (!showBanner || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="flex-1 min-w-0">
        {isIOS ? (
          <p className="text-sm text-black font-medium">
            Tap <Share className="w-4 h-4 inline -mt-0.5" /> then <strong>Add to Home Screen</strong>
          </p>
        ) : (
          <p className="text-sm text-black font-medium">Install <span className="brand-wordmark">Shot On Me</span></p>
        )}
      </div>
      {!isIOS && (
        <button onClick={handleInstall} className="bg-black text-primary-500 font-bold text-sm px-4 py-1.5 rounded-full flex-shrink-0">
          Install
        </button>
      )}
      <button onClick={handleDismiss} className="text-black/60 flex-shrink-0 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
