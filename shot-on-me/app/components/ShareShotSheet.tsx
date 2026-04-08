'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Share2, Download } from 'lucide-react'

interface ShareShotSheetProps {
  sender: string
  recipient: string
  amount: number
  venue?: string
  emoji?: string
  onClose: () => void
}

export default function ShareShotSheet({
  sender,
  recipient,
  amount,
  venue,
  emoji = '🥃',
  onClose,
}: ShareShotSheetProps) {
  const [loadingIG, setLoadingIG] = useState(false)
  const [loadingFB, setLoadingFB] = useState(false)

  const params = new URLSearchParams({
    sender,
    recipient,
    amount: amount.toString(),
    emoji,
    ...(venue ? { venue } : {}),
  })
  const imageUrl = `/api/og/shot?${params.toString()}`
  const shareText = `${sender} just bought ${recipient} a shot 🥃 Download Shot On Me — shotonme.com`

  const fetchImageFile = async (): Promise<File | null> => {
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      return new File([blob], 'shot-on-me.png', { type: 'image/png' })
    } catch {
      return null
    }
  }

  const downloadImage = async () => {
    const file = await fetchImageFile()
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shot-on-me.png'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Instagram: on mobile uses Web Share API with image file so user can post to Stories.
  // On desktop, falls back to downloading the image.
  const shareInstagram = async () => {
    setLoadingIG(true)
    try {
      const file = await fetchImageFile()
      if (file && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shot On Me' })
      } else {
        // Desktop: download image + open Instagram
        await downloadImage()
        window.open('https://www.instagram.com', '_blank')
      }
    } catch {
      // user cancelled — no action
    } finally {
      setLoadingIG(false)
    }
  }

  // Facebook: open native share dialog (no API key required)
  const shareFacebook = () => {
    setLoadingFB(true)
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.shotonme.com')}&quote=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer')
    setLoadingFB(false)
  }

  // Native share sheet (WhatsApp, iMessage, etc.)
  const shareNative = async () => {
    try {
      const file = await fetchImageFile()
      const shareData: ShareData = {
        title: 'Shot On Me',
        text: shareText,
        url: 'https://www.shotonme.com',
      }
      if (file && navigator.canShare?.({ files: [file] })) {
        shareData.files = [file]
      }
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await downloadImage()
      }
    } catch {
      // cancelled
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-zinc-950 border-t border-primary-500/25 rounded-t-3xl px-5 pt-3 pb-8 shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white/88 font-bold text-lg leading-none">Share the moment</h3>
            <p className="text-white/38 text-xs mt-1">Let your followers know 🥃</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/48 hover:text-white hover:bg-white/15 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card preview */}
        <div className="rounded-2xl overflow-hidden border border-primary-500/20 mb-5 mx-auto w-full max-w-[260px] aspect-square shadow-xl shadow-primary-500/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Share card preview" className="w-full h-full object-cover" />
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Instagram */}
          <button
            onClick={shareInstagram}
            disabled={loadingIG}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(131,58,180,0.15) 0%, rgba(253,29,29,0.12) 50%, rgba(252,176,69,0.12) 100%)',
              borderColor: 'rgba(200,80,150,0.25)',
            }}
          >
            {/* Instagram gradient icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="25%" stopColor="#e6683c" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="75%" stopColor="#cc2366" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig)" strokeWidth="1.8" fill="none"/>
              <circle cx="12" cy="12" r="4.5" stroke="url(#ig)" strokeWidth="1.8" fill="none"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)"/>
            </svg>
            <span className="text-xs font-semibold text-white/75">
              {loadingIG ? '...' : 'Instagram'}
            </span>
          </button>

          {/* Facebook */}
          <button
            onClick={shareFacebook}
            disabled={loadingFB}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-600/15 border border-blue-500/25 hover:border-blue-400/40 transition-all active:scale-95 disabled:opacity-60"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#4F87FF">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-xs font-semibold text-white/75">
              {loadingFB ? '...' : 'Facebook'}
            </span>
          </button>

          {/* More / native share */}
          <button
            onClick={shareNative}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            <Share2 className="w-6 h-6 text-white/60" />
            <span className="text-xs font-semibold text-white/75">More</span>
          </button>
        </div>

        {/* Download link */}
        <button
          onClick={downloadImage}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Save image
        </button>
      </div>
    </div>,
    document.body
  )
}
