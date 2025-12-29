'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useApiUrl } from '../utils/api'
import axios from 'axios'
import { 
  Share2, 
  Users, 
  X, 
  Copy, 
  Check, 
  MessageSquare,
  Mail,
  Link as LinkIcon
} from 'lucide-react'
import { shareInvite, getInviteLink, supportsNativeShare } from '../utils/invite'

interface VenueReferralInviteProps {
  isOpen: boolean
  onClose: () => void
  venue: {
    _id: string
    name: string
  }
}

export default function VenueReferralInvite({ 
  isOpen, 
  onClose, 
  venue 
}: VenueReferralInviteProps) {
  const { token, user } = useAuth()
  const API_URL = useApiUrl()
  const [inviteLink, setInviteLink] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string>('')

  const generateInviteLink = async () => {
    if (!token || !venue?._id) return

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(
        `${API_URL}/venue-referrals/invite`,
        { venueId: venue._id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const link = response.data.inviteLink || await getInviteLink(user?.id || '', undefined, venue._id)
      setInviteLink(link)
    } catch (err: any) {
      console.error('Error generating venue referral link:', err)
      setError(err.response?.data?.message || 'Failed to generate invite link')
      // Fallback: generate link manually
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
      setInviteLink(`${baseUrl}/venue/${venue._id}/checkin?ref=${user?.id}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) {
      await generateInviteLink()
      return
    }

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      setError('Failed to copy link')
    }
  }

  const handleShare = async () => {
    if (!inviteLink) {
      await generateInviteLink()
      return
    }

    const message = `Join me at ${venue.name}! Check in and we both get points! 🎉`
    
    try {
      await shareInvite(inviteLink, message)
    } catch (err) {
      console.error('Share failed:', err)
      // Fallback to copy
      handleCopyLink()
    }
  }

  const handleSMS = () => {
    if (!inviteLink) {
      generateInviteLink()
      return
    }

    const message = encodeURIComponent(`Join me at ${venue.name}! Check in and we both get points! 🎉\n\n${inviteLink}`)
    window.open(`sms:?body=${message}`, '_blank')
  }

  const handleEmail = () => {
    if (!inviteLink) {
      generateInviteLink()
      return
    }

    const subject = encodeURIComponent(`Join me at ${venue.name}!`)
    const body = encodeURIComponent(`Hey!\n\nI'm at ${venue.name} and thought you'd like to join! Check in using this link and we both get points:\n\n${inviteLink}\n\nSee you there! 🎉`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-black via-black to-primary-500/10 border-2 border-primary-500 rounded-2xl p-6 max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-primary-400 hover:text-primary-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-500">
                Invite Friends to Check In
              </h2>
              <p className="text-primary-400 text-sm">
                {venue.name}
              </p>
            </div>
          </div>
          <p className="text-primary-300 text-sm mt-2">
            Share this link and earn points when your friends check in! 🎉
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Invite link */}
        {inviteLink && (
          <div className="mb-6">
            <label className="block text-primary-400 text-sm mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-black/40 border border-primary-500/30 rounded-lg px-4 py-2 text-primary-300 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-lg px-4 py-2 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-primary-500" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Share options */}
        <div className="space-y-3">
          {supportsNativeShare() && (
            <button
              onClick={handleShare}
              disabled={loading}
              className="w-full bg-primary-500 text-black py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSMS}
              disabled={loading}
              className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageSquare className="w-5 h-5" />
              SMS
            </button>

            <button
              onClick={handleEmail}
              disabled={loading}
              className="bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
              Email
            </button>
          </div>

          {!inviteLink && (
            <button
              onClick={generateInviteLink}
              disabled={loading}
              className="w-full bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-500 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LinkIcon className="w-5 h-5" />
              {loading ? 'Generating...' : 'Generate Link'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 pt-4 border-t border-primary-500/20">
          <p className="text-primary-400 text-xs text-center">
            💡 You'll earn points when your friends check in at this venue!
          </p>
        </div>
      </div>
    </div>
  )
}

