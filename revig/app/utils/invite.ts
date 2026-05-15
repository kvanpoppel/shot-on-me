/**
 * Invite / referral system for Revig
 */

export interface InviteResult {
  success: boolean
  method: string
  message?: string
  error?: string
}

export async function getInviteLink(userId: string, venueId?: string): Promise<string> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  if (venueId) return `${baseUrl}/?ref=${userId}&venue=${venueId}`
  return `${baseUrl}/?ref=${userId}`
}

export function getInviteMessage(userName?: string): string {
  const name = userName ? `${userName} ` : ''
  return `${name}invited you to join Revig! Gift dirty sodas, coffees & treats to anyone. Discover the best non-alcohol spots near you. Join free now!`
}

export async function shareInvite(inviteLink: string, message?: string): Promise<InviteResult> {
  const shareMessage = message || getInviteMessage()

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join me on Revig!', text: shareMessage, url: inviteLink })
      return { success: true, method: 'native-share' }
    } catch (e: any) {
      if (e.name === 'AbortError') return { success: false, method: 'native-share', error: 'Cancelled' }
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(`${shareMessage} ${inviteLink}`)
      return { success: true, method: 'clipboard', message: 'Invite link copied!' }
    } catch { /* fall through */ }
  }

  return { success: true, method: 'alert', message: `Share this link:\n${inviteLink}` }
}
