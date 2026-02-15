/**
 * Unified invite system for Shot On Me
 * Works seamlessly across iOS, Android, and Web
 */

export interface InviteOptions {
  method?: 'share' | 'clipboard' | 'sms' | 'email' | 'link'
  phoneNumber?: string
  email?: string
}

export interface InviteResult {
  success: boolean
  method: string
  message?: string
  error?: string
}

/**
 * Get user's invite link. Uses userId only – referral is tied to user ID on backend.
 */
export async function getInviteLink(userId: string, _referralCode?: string, venueId?: string): Promise<string> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (venueId) {
    return `${baseUrl}/venue/${venueId}/checkin?ref=${userId}`
  }
  return `${baseUrl}/?ref=${userId}`
}

/**
 * Get invite message text. No referral code – backend attributes by user ID.
 */
export function getInviteMessage(userName?: string): string {
  const name = userName ? `${userName} ` : ''
  return `${name}invited you to join Shot On Me! Send drinks to friends at any bar or coffee shop. Join now and get started!`
}

/**
 * Share invite link using native share (mobile) or clipboard (desktop)
 */
export async function shareInvite(
  inviteLink: string,
  message?: string,
  options?: InviteOptions
): Promise<InviteResult> {
  const shareMessage = message || getInviteMessage()
  const shareTitle = 'Join me on Shot On Me!'

  // Method 1: Native Web Share API (iOS Safari, Android Chrome, etc.)
  if ((!options?.method || options.method === 'share') && navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareMessage,
        url: inviteLink
      })
      return {
        success: true,
        method: 'native-share',
        message: 'Invite shared successfully!'
      }
    } catch (error: any) {
      // User cancelled - that's okay
      if (error.name === 'AbortError') {
        return {
          success: false,
          method: 'native-share',
          error: 'Share cancelled'
        }
      }
      // Other error - fall through to clipboard
    }
  }

  // Method 2: SMS (if phone number provided)
  if (options?.method === 'sms' && options.phoneNumber) {
    const smsMessage = `${shareMessage}\n\n${inviteLink}`
    const smsLink = `sms:${options.phoneNumber}?body=${encodeURIComponent(smsMessage)}`
    window.location.href = smsLink
    return {
      success: true,
      method: 'sms',
      message: 'Opening SMS...'
    }
  }

  // Method 3: Email (if email provided) - Send via backend API
  if (options?.method === 'email' && options.email) {
    // Get API URL - use centralized getApiUrl function
    const { getApiUrl } = await import('./api')
    const API_URL = getApiUrl()
    
    // Get auth token from localStorage
    let token = null
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('auth')
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed.token
        } catch (e) {
          console.error('Failed to parse auth data:', e)
        }
      }
    }
    
    if (!token) {
      return {
        success: false,
        method: 'email',
        error: 'Please log in to send email invitations'
      }
    }
    
    try {
      // Send email via backend API
      const response = await fetch(`${API_URL}/invites/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: options.email,
          inviteLink: inviteLink
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        return {
          success: true,
          method: 'email',
          message: 'Invite email sent successfully!'
        }
      } else {
        return {
          success: false,
          method: 'email',
          error: data.message || 'Failed to send invite email'
        }
      }
    } catch (error: any) {
      console.error('Error sending invite email:', error)
      return {
        success: false,
        method: 'email',
        error: error.message || 'Failed to send invite email'
      }
    }
  }

  // Method 4: Clipboard (fallback for desktop)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(`${shareMessage} ${inviteLink}`)
      return {
        success: true,
        method: 'clipboard',
        message: 'Invite link copied to clipboard!'
      }
    } catch (error) {
      // Clipboard failed
    }
  }

  // Method 5: Show link in alert (last resort)
  return {
    success: true,
    method: 'alert',
    message: `Share this link:\n\n${inviteLink}`
  }
}

/**
 * Check if device supports native sharing
 */
export function supportsNativeShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

/**
 * Open native share sheet (Facebook, Messenger, Email, Signal, etc. – OS‑dependent).
 * Use this when user taps "Share"; they pick app from the system picker.
 */
export async function openNativeShare(inviteLink: string, message?: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  const shareMessage = message || getInviteMessage()
  try {
    await navigator.share({
      title: 'Join me on Shot On Me!',
      text: shareMessage,
      url: inviteLink
    })
    return true
  } catch (e: any) {
    if (e?.name === 'AbortError') return false
    throw e
  }
}

export type AppShareTarget = 'facebook' | 'whatsapp' | 'twitter' | 'email' | 'copy'

/**
 * Get share URLs or actions for app-specific buttons (Facebook, WhatsApp, Email, Copy).
 * Use when native share isn't available or user wants a specific app.
 */
export function getAppShareTargets(inviteLink: string, message?: string): Record<AppShareTarget, { url?: string; type: 'url' | 'copy' }> {
  const text = (message || getInviteMessage()) + '\n\n' + inviteLink
  const encodedUrl = encodeURIComponent(inviteLink)
  const encodedText = encodeURIComponent(text)
  return {
    facebook: {
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      type: 'url'
    },
    whatsapp: {
      url: `https://wa.me/?text=${encodedText}`,
      type: 'url'
    },
    twitter: {
      url: `https://twitter.com/intent/tweet?text=${encodedText}`,
      type: 'url'
    },
    email: {
      url: `mailto:?subject=${encodeURIComponent('Join me on Shot On Me!')}&body=${encodedText}`,
      type: 'url'
    },
    copy: { type: 'copy' }
  }
}

/**
 * Check if device supports SMS
 * SMS is supported on mobile devices via sms: protocol
 * Also check for user agent to detect mobile devices
 */
export function supportsSMS(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if device is mobile (iOS, Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // SMS protocol works on mobile devices
  // Also check if we're on a device that can handle sms: links
  return isMobile || 'sms' in window
}

/**
 * Check if device supports clipboard
 */
export function supportsClipboard(): boolean {
  return typeof navigator !== 'undefined' && 'clipboard' in navigator && 'writeText' in navigator.clipboard
}

/**
 * Get best invite method for current platform
 */
export function getBestInviteMethod(): 'share' | 'clipboard' | 'link' {
  if (supportsNativeShare()) {
    return 'share'
  }
  if (supportsClipboard()) {
    return 'clipboard'
  }
  return 'link'
}

