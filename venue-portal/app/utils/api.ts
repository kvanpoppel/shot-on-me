/**
 * CENTRALIZED API URL MANAGEMENT FOR VENUE PORTAL
 * This is the single source of truth for API URLs across the venue portal
 */

/**
 * Gets the base API URL (includes /api suffix)
 */
export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    // Ensure it ends with /api
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  return 'http://localhost:5000/api'
}

/**
 * Gets the Socket.io URL (no /api suffix)
 */
export const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '')
    return url
  }
  return 'http://localhost:5000'
}

/**
 * Helper function to build full API endpoint URLs
 * Ensures proper URL construction without double slashes
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl()
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  // Ensure baseUrl doesn't have trailing slash
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBase}/${cleanEndpoint}`
}

