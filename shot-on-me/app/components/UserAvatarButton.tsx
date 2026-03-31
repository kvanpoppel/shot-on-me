'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, User, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface UserAvatarButtonProps {
  userId: string
  firstName: string
  lastName?: string
  profilePicture?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isFriend?: boolean
  isOnline?: boolean
  onViewProfile?: (userId: string) => void
  onSendDrink?: (userId: string, name: string) => void
  onMessage?: (userId: string) => void
  className?: string
  disablePopover?: boolean
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-xl',
}

export default function UserAvatarButton({
  userId,
  firstName,
  lastName = '',
  profilePicture,
  size = 'md',
  isFriend = false,
  isOnline = false,
  onViewProfile,
  onSendDrink,
  onMessage,
  className = '',
  disablePopover = false,
}: UserAvatarButtonProps) {
  const { user: currentUser } = useAuth()
  const isSelf = userId === currentUser?.id || userId === (currentUser as any)?._id
  const [open, setOpen] = useState(false)
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 })
  const avatarRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fullName = `${firstName} ${lastName}`.trim()

  const openCard = useCallback(() => {
    if (disablePopover || isSelf) {
      onViewProfile?.(userId)
      return
    }
    if (!avatarRef.current) return
    const rect = avatarRef.current.getBoundingClientRect()
    const cardWidth = 220
    const cardHeight = 160
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.left + rect.width / 2 - cardWidth / 2
    let top = rect.bottom + 10

    // flip above if not enough space below
    if (top + cardHeight > vh - 80) top = rect.top - cardHeight - 10
    // keep within horizontal bounds
    left = Math.max(8, Math.min(left, vw - cardWidth - 8))

    setCardPos({ top, left })
    setOpen(true)

    // auto-dismiss after 4s
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 4000)
  }, [disablePopover, isSelf, userId, onViewProfile])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        cardRef.current && !cardRef.current.contains(e.target as Node) &&
        avatarRef.current && !avatarRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  // ring color based on status
  const ringClass = isOnline && isFriend
    ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-black'
    : isFriend
    ? 'ring-2 ring-primary-500/60 ring-offset-1 ring-offset-black'
    : ''

  const card = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={cardRef}
      className="fixed z-[10000] animate-in"
      style={{ top: cardPos.top, left: cardPos.left, width: 220 }}
    >
      <div className="bg-gray-950 border border-primary-500/30 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b border-primary-500/10">
          <div className={`${sizeMap.md} rounded-full overflow-hidden flex-shrink-0 ${ringClass}`}>
            {profilePicture ? (
              <img src={profilePicture} alt={firstName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
                <span className="text-primary-400 font-bold text-sm">{firstName[0]}{lastName[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  <span className="text-xs text-gray-500">Offline</span>
                </>
              )}
              {isFriend && (
                <span className="ml-1 text-xs text-primary-500/70 font-medium">· Friend</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 p-3">
          {onSendDrink && (
            <button
              onClick={() => {
                setOpen(false)
                onSendDrink(userId, fullName)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 active:scale-95 border border-yellow-500/20 rounded-xl py-2 transition-all"
            >
              <span className="text-base leading-none">🍺</span>
              <span className="text-xs text-yellow-400 font-semibold">Send Drink</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 px-3 pb-3">
          {onMessage && (
            <button
              onClick={() => {
                setOpen(false)
                onMessage(userId)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500/10 hover:bg-primary-500/20 active:scale-95 border border-primary-500/20 rounded-xl py-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-primary-400" />
              <span className="text-xs text-primary-400 font-semibold">Message</span>
            </button>
          )}
          {onViewProfile && (
            <button
              onClick={() => {
                setOpen(false)
                onViewProfile(userId)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl py-2 transition-all"
            >
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 font-semibold">Profile</span>
            </button>
          )}
        </div>
      </div>
      {/* Arrow pointer */}
      <style>{`
        .animate-in {
          animation: avatarCardIn 0.18s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes avatarCardIn {
          from { opacity: 0; transform: scale(0.85) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={avatarRef}
        onClick={openCard}
        className={`relative rounded-full overflow-visible flex-shrink-0 focus:outline-none active:scale-95 transition-transform ${className}`}
        aria-label={`${fullName} — tap for options`}
      >
        {/* Online pulse ring */}
        {isOnline && isFriend && (
          <span className="absolute inset-0 rounded-full animate-ping bg-green-400/30 pointer-events-none" style={{ animationDuration: '2s' }} />
        )}
        <div className={`${sizeMap[size]} rounded-full overflow-hidden ${ringClass}`}>
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={firstName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-500/20">
              <span className="text-primary-500 font-bold">{firstName[0]}{lastName?.[0] || ''}</span>
            </div>
          )}
        </div>
      </button>
      {card}
    </>
  )
}
