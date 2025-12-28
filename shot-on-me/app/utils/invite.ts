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
 * Get user's invite link with referral code
 */
export async function getInviteLink(userId: string, referralCode?: string, venueId?: string): Promise<string> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  
  // Venue-specific referral link
  if (venueId) {
    return `${baseUrl}/venue/${venueId}/checkin?ref=${userId}`
  }
  
  // Use referral code if available, otherwise use userId
  if (referralCode) {
    return `${baseUrl}/signup?ref=${referralCode}`
  }
  
  return `${baseUrl}/signup?ref=${userId}`
}

/**
 * Get invite message text
 */
export function getInviteMessage(userName?: string, referralCode?: string): string {
  const name = userName ? `${userName} ` : ''
  const codeText = referralCode ? ` Use my referral code: ${referralCode}` : ''
  return `${name}invited you to join Shot On Me! Send drinks to friends at any bar or coffee shop.${codeText} Join now and get started!`
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
    // Extract referral code from link if present
    const urlParams = new URLSearchParams(inviteLink.split('?')[1] || '')
    const refCode = urlParams.get('ref') || ''
    
    // Create message with referral code prominently displayed
    let smsMessage = shareMessage
    if (refCode && !smsMessage.includes(refCode)) {
      // Add referral code to message if not already included
      smsMessage = `${shareMessage}\n\nReferral Code: ${refCode}\n\nJoin here: ${inviteLink}`
    } else {
      smsMessage = `${shareMessage}\n\n${inviteLink}`
    }
    
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
    // Extract referral code from link if present
    const urlParams = new URLSearchParams(inviteLink.split('?')[1] || '')
    const refCode = urlParams.get('ref') || ''
    
    // Get API URL - use centralized getApiUrl function
    let API_URL = 'http://localhost:5000/api'
    if (typeof window !== 'undefined') {
      // Use the same logic as getApiUrl but inline to avoid import
      if (process.env.NEXT_PUBLIC_API_URL) {
        API_URL = process.env.NEXT_PUBLIC_API_URL.trim()
        if (!API_URL.endsWith('/api')) {
          API_URL = API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`
        }
      } else {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        // For production domains (shotonme.com) OR Vercel deployments, use production API
        if (hostname.includes('shotonme.com') || 
            hostname.includes('shot-on-me') || 
            hostname.includes('vercel.app')) {
          // Check if this is local development (http:// or port 3001)
          const isLocalDev = protocol === 'http:' || window.location.port === '3001' || window.location.port === '3000'
          if (isLocalDev) {
            // Local development with domain override
            if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
              API_URL = `http://${hostname}:5000/api`
            } else {
              API_URL = 'http://localhost:5000/api'
            }
          } else {
            // Production - Use Render URL directly to ensure connection works
            API_URL = 'https://shot-on-me.onrender.com/api'
          }
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          API_URL = 'http://localhost:5000/api'
        } else if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
          API_URL = `http://${hostname}:5000/api`
        } else {
          // Fallback for any other hostname - use Render URL directly
          API_URL = 'https://shot-on-me.onrender.com/api'
        }
      }
    }
    
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
          inviteLink: inviteLink,
          referralCode: refCode || undefined
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

