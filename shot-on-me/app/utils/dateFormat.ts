/**
 * Safe date formatting utilities that prevent hydration mismatches
 * by only formatting dates on the client side
 */

/**
 * Format a date string to a relative time (e.g., "2h ago", "3d ago")
 * Falls back to a simple date format if more than 7 days
 */
export function formatRelativeTime(dateString: string, isMounted: boolean = false): string {
  if (!isMounted) {
    // Return a placeholder during SSR to prevent hydration mismatch
    return ''
  }
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  
  const minutes = Math.floor(diffInSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  
  // For dates older than 7 days, use a simple format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a date to a locale date string (e.g., "Jan 15")
 * Only formats on client side to prevent hydration mismatch
 */
export function formatDate(dateString: string, isMounted: boolean = false): string {
  if (!isMounted) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a date to a locale date string with year if different from current year
 */
export function formatDateWithYear(dateString: string, isMounted: boolean = false): string {
  if (!isMounted) return ''
  const date = new Date(dateString)
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format a time to locale time string (e.g., "2:30 PM")
 * Only formats on client side to prevent hydration mismatch
 */
export function formatTime(dateString: string, isMounted: boolean = false): string {
  if (!isMounted) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a date to a full locale string
 * Only formats on client side to prevent hydration mismatch
 */
export function formatDateTime(dateString: string, isMounted: boolean = false): string {
  if (!isMounted) return ''
  const date = new Date(dateString)
  return date.toLocaleString()
}



