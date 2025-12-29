'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { X, Share2, Copy, Mail, MessageSquare, Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { getInviteLink, shareInvite, getInviteMessage, getBestInviteMethod, supportsNativeShare, supportsSMS } from '../utils/invite'
import axios from 'axios'
import { useApiUrl } from '../utils/api'

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InviteFriendsModal({ isOpen, onClose }: InviteFriendsModalProps) {
  const { user, token } = useAuth()
  const API_URL = useApiUrl()
  const [referralCode, setReferralCode] = useState<string>('')
  const [inviteLink, setInviteLink] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [smsNumber, setSmsNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')

  useEffect(() => {
    if (isOpen && token && user) {
      fetchReferralCode()
    }
  }, [isOpen, token, user])

  const fetchReferralCode = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/referrals/code`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const code = response.data.code
      setReferralCode(code)
      
      // Generate invite link with referral code
      const userId = user?.id || (user as any)?._id
      const link = await getInviteLink(userId, code)
      setInviteLink(link)
    } catch (error: any) {
      console.error('Failed to fetch referral code:', error)
      // Fallback to userId-based link
      const userId = user?.id || (user as any)?._id
      if (userId) {
        const link = await getInviteLink(userId)
        setInviteLink(link)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (method: 'share' | 'clipboard' | 'sms' | 'email') => {
    if (!inviteLink) {
      setError('Invite link not ready. Please try again.')
      return
    }

    setSharing(true)
    setError(null)

    try {
      const userName = user?.firstName || user?.name || ''
      // Include referral code in message for SMS/Email
      const message = getInviteMessage(userName, referralCode || undefined)

      let result
      if (method === 'sms' && smsNumber) {
        result = await shareInvite(inviteLink, message, { method: 'sms', phoneNumber: smsNumber })
      } else if (method === 'email' && emailAddress) {
        result = await shareInvite(inviteLink, message, { method: 'email', email: emailAddress })
        // Show success message for email
        if (result.success) {
          const toast = document.createElement('div')
          toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-500 text-black px-6 py-3 rounded-lg shadow-lg font-semibold'
          toast.textContent = 'Invite email sent successfully!'
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.remove()
          }, 3000)
          // Clear email field
          setEmailAddress('')
        }
      } else {
        result = await shareInvite(inviteLink, message, { method })
      }

      if (result.success) {
        if (result.method === 'clipboard') {
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        }
        // For native share and SMS, the system handles it
      } else {
        setError(result.error || 'Failed to share invite')
      }
    } catch (error: any) {
      console.error('Error sharing invite:', error)
      setError('Failed to share invite. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      setError('Failed to copy link. Please try again.')
    }
  }

  if (!isOpen) return null

  const bestMethod = getBestInviteMethod()
  const canNativeShare = supportsNativeShare()
  const canSMS = supportsSMS()

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-2xl p-6 max-w-md w-full backdrop-blur-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary-500">Invite Friends</h2>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Referral Code Display */}
            {referralCode && (
              <div className="bg-gradient-to-r from-primary-500/10 to-primary-400/10 border border-primary-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-primary-400 mb-2 font-light">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/60 rounded-lg p-3 border border-primary-500/20">
                    <p className="font-mono text-xl font-bold text-primary-500 text-center">
                      {referralCode}
                    </p>
                  </div>
                  <button
                    onClick={copyLink}
                    className="p-3 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all"
                    title="Copy code"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Invite Link */}
            <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-primary-400 mb-2 font-light">Invite Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/60 rounded-lg p-2 border border-primary-500/10 overflow-hidden">
                  <p className="text-xs text-primary-400/80 font-mono truncate">
                    {inviteLink}
                  </p>
                </div>
                <button
                  onClick={copyLink}
                  className="p-2 bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/20 transition-all"
                  title="Copy link"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Share Options */}
            <div className="space-y-3">
              <p className="text-sm text-primary-400 font-medium mb-2">Share via:</p>

              {/* Native Share (Mobile) */}
              {canNativeShare && (
                <button
                  onClick={() => handleShare('share')}
                  disabled={sharing}
                  className="w-full flex items-center justify-center gap-3 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              )}

              {/* SMS - Always show phone number input */}
              <div className="space-y-2">
                <input
                  type="tel"
                  value={smsNumber}
                  onChange={(e) => {
                    // Format phone number as user types
                    let value = e.target.value.replace(/\D/g, '') // Remove non-digits
                    if (value.length > 0 && !value.startsWith('+')) {
                      // Add +1 for US numbers if not present
                      if (value.length <= 10) {
                        value = '+1' + value
                      } else if (!value.startsWith('+')) {
                        value = '+' + value
                      }
                    }
                    setSmsNumber(value)
                  }}
                  placeholder="Phone number (e.g., +1234567890)"
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-600 focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => {
                    if (!smsNumber.trim()) {
                      setError('Please enter a phone number')
                      return
                    }
                    // Validate phone number format (basic validation)
                    const phoneRegex = /^\+?[1-9]\d{1,14}$/
                    const cleanNumber = smsNumber.replace(/\D/g, '')
                    if (cleanNumber.length < 10) {
                      setError('Please enter a valid phone number (at least 10 digits)')
                      return
                    }
                    handleShare('sms')
                  }}
                  disabled={sharing || !smsNumber.trim()}
                  className="w-full flex items-center justify-center gap-3 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Send SMS</span>
                </button>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-600 focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => handleShare('email')}
                  disabled={sharing || !emailAddress.trim()}
                  className="w-full flex items-center justify-center gap-3 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-5 h-5" />
                  <span>Send Email</span>
                </button>
              </div>

              {/* Clipboard (Desktop fallback) */}
              {!canNativeShare && (
                <button
                  onClick={() => handleShare('clipboard')}
                  disabled={sharing}
                  className="w-full flex items-center justify-center gap-3 bg-primary-500/10 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>Copy Link</span>
                </button>
              )}
            </div>

            {/* Info */}
            <p className="text-xs text-primary-400/60 text-center mt-4 font-light">
              When friends sign up using your link, you both earn rewards!
            </p>
          </>
        )}
      </div>
    </div>
  )
}

