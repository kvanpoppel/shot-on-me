'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import axios from 'axios'
import { QrCode, X, Camera, Loader } from 'lucide-react'
import { useApiUrl } from '../utils/api'

interface RedeemQRCodeProps {
  isOpen: boolean
  onClose: () => void
  venueId?: string
}

export default function RedeemQRCode({ isOpen, onClose, venueId }: RedeemQRCodeProps) {
  const { token, updateUser } = useAuth()
  const API_URL = useApiUrl()
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleRedeem = async (redemptionCode: string) => {
    if (!redemptionCode.trim()) return

    setRedeeming(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await axios.post(
        `${API_URL}/payments/redeem`,
        { 
          code: redemptionCode.toUpperCase().trim(),
          venueId: venueId || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setSuccess(true)
      setCode('')
      
      // Refresh user data
      if (updateUser) {
        updateUser({})
      }

      // Show success message
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to redeem:', err)
      setError(err.response?.data?.message || 'Invalid redemption code. Please try again.')
    } finally {
      setRedeeming(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      handleRedeem(code)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.trim()) {
      handleRedeem(pastedText)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-primary-500" />
            <h2 className="text-2xl font-semibold text-primary-500">Redeem Code</h2>
          </div>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-primary-500 text-sm font-medium mb-2">
              Enter or Scan Redemption Code
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onPaste={handlePaste}
                placeholder="Enter code or paste here"
                className="w-full px-4 py-3 bg-black border-2 border-primary-500 rounded-lg text-primary-500 placeholder-primary-600 focus:ring-2 focus:ring-primary-500 text-center text-xl font-mono tracking-wider"
                disabled={redeeming}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Camera className="w-5 h-5 text-primary-400" />
              </div>
            </div>
            <p className="text-primary-400/70 text-xs mt-2 text-center">
              Type the code or paste it here to redeem
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm text-center">
              ✅ Payment redeemed successfully!
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={redeeming}
              className="flex-1 bg-black/40 border border-primary-500/20 text-primary-500 py-3 rounded-lg font-medium hover:bg-black/60 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={redeeming || !code.trim()}
              className="flex-1 bg-primary-500 text-black py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {redeeming ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Redeeming...</span>
                </>
              ) : (
                <span>Redeem</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-primary-500/20">
          <p className="text-primary-400/70 text-xs text-center">
            💡 Tip: You can also scan a QR code if your device supports it
          </p>
        </div>
      </div>
    </div>
  )
}

