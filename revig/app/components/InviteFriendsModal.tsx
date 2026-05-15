'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { X, Share2, Copy, Mail, MessageSquare, CheckCircle } from 'lucide-react'
import { getInviteLink, getInviteMessage, shareInvite } from '../utils/invite'

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InviteFriendsModal({ isOpen, onClose }: InviteFriendsModalProps) {
  const { user } = useAuth()
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [smsNumber, setSmsNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user) {
      const userId = user?.id || (user as any)?._id
      if (userId) {
        setLoading(true)
        getInviteLink(userId).then((link) => {
          setInviteLink(link)
          setLoading(false)
        })
      }
    }
  }, [isOpen, user])

  const userName = user?.firstName || (user as any)?.name || ''
  const message = getInviteMessage(userName)

  const showToast = (msg: string) => {
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] px-5 py-2.5 rounded-lg shadow-lg font-semibold text-sm'
    toast.style.cssText = 'background:#C8F135;color:#1A1A2E'
    toast.textContent = msg
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2500)
  }

  const handleNativeShare = async () => {
    if (!inviteLink) return
    const result = await shareInvite(inviteLink, message)
    if (result.success && result.method === 'clipboard') {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      showToast(result.message || 'Link copied!')
    } else if (result.success && result.method === 'native-share') {
      showToast('Shared!')
    }
  }

  const handleSms = () => {
    if (!smsNumber.trim() || !inviteLink) return
    const clean = smsNumber.replace(/\D/g, '')
    if (clean.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    const body = encodeURIComponent(`${message} ${inviteLink}`)
    const num = smsNumber.startsWith('+') ? smsNumber : `+1${clean}`
    window.open(`sms:${num}?body=${body}`, '_self')
    showToast('Opening messages...')
  }

  const handleEmail = () => {
    if (!emailAddress.trim() || !inviteLink) return
    const subject = encodeURIComponent('Join me on Revig!')
    const body = encodeURIComponent(`${message}\n\n${inviteLink}`)
    window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`, '_self')
    showToast('Opening email...')
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
      showToast('Link copied!')
    } catch {
      setError('Failed to copy link')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: '#1C1C32', border: '1px solid rgba(200,241,53,0.15)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#C8F135' }}>Invite Friends</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#C8F135' }} />
          </div>
        ) : (
          <>
            {/* Invite Link */}
            <div className="rounded-lg p-4 mb-4" style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-white/40 mb-2">Your invite link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg p-2 overflow-hidden" style={{ background: '#1A1A2E' }}>
                  <p className="text-xs text-white/60 font-mono truncate">{inviteLink}</p>
                </div>
                <button onClick={copyLink} className="p-2 rounded-lg transition-all" style={{ background: 'rgba(200,241,53,0.10)', color: '#C8F135' }}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(255,95,87,0.15)', color: '#FF5F57' }}>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-white/50 font-medium">Share via:</p>

              {/* Native Share (mobile) */}
              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button onClick={handleNativeShare} className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-semibold text-sm transition-all" style={{ background: '#C8F135', color: '#1A1A2E' }}>
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              )}

              {/* SMS */}
              <div className="space-y-2">
                <input
                  type="tel"
                  value={smsNumber}
                  onChange={(e) => { setError(null); setSmsNumber(e.target.value) }}
                  placeholder="Phone number"
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.07)' }}
                />
                <button onClick={handleSms} disabled={!smsNumber.trim()} className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40" style={{ background: 'rgba(200,241,53,0.10)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.15)' }}>
                  <MessageSquare className="w-5 h-5" />
                  Send Text
                </button>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => { setError(null); setEmailAddress(e.target.value) }}
                  placeholder="Email address"
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.07)' }}
                />
                <button onClick={handleEmail} disabled={!emailAddress.trim()} className="w-full flex items-center justify-center gap-3 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40" style={{ background: 'rgba(200,241,53,0.10)', color: '#C8F135', border: '1px solid rgba(200,241,53,0.15)' }}>
                  <Mail className="w-5 h-5" />
                  Send Email
                </button>
              </div>
            </div>

            <p className="text-xs text-white/30 text-center mt-4">
              When friends sign up using your link, you both earn rewards!
            </p>
          </>
        )}
      </div>
    </div>
  )
}
