/**
 * CENTRALIZED API URL MANAGEMENT
 * This is the single source of truth for API URLs across the entire app
 * 
 * IMPORTANT: All components should use useApiUrl() hook or getApiUrl() function
 * DO NOT create custom API URL functions elsewhere
 */

/**
 * Gets the base API URL (includes /api suffix)
 * This must be called at runtime in the browser, not at module load time
 * 
 * IMPORTANT: Environment variables take absolute priority. 
 * Only use fallback logic if environment variables are not set.
 */
export const getApiUrl = (): string => {
  // PRIORITY 1: Environment variable (set in Vercel for production)
  // This MUST be used when set - do not override with hostname detection
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    // Ensure it ends with /api
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  
  // PRIORITY 2: Fallback logic - only used when NEXT_PUBLIC_API_URL is NOT set
  // This is for local development when environment variable is not configured
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Only use localhost when actually running on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api'
    }

    // Everything else (production, mobile, IP) → production backend
    return 'https://shot-on-me.onrender.com/api'
  }

  // Server-side rendering fallback → production backend
  return 'https://shot-on-me.onrender.com/api'
}

/**
 * Gets the Socket.io URL (no /api suffix)
 * 
 * IMPORTANT: Environment variables take absolute priority.
 * Socket.io client will handle protocol conversion (https -> wss) automatically.
 */
export const getSocketUrl = (): string => {
  // PRIORITY 1: NEXT_PUBLIC_SOCKET_URL environment variable (use as-is)
  // Socket.io client library will automatically convert https:// to wss:// for WebSocket
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim()
  }
  
  // PRIORITY 2: Derive from NEXT_PUBLIC_API_URL if SOCKET_URL is not set
  if (process.env.NEXT_PUBLIC_API_URL) {
    // Remove /api suffix if present, Socket.io doesn't use /api path
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '')
    // Socket.io client will handle https:// to wss:// conversion automatically
    // Do NOT manually convert here - keep it as https://
    return url
  }
  
  // PRIORITY 3: Fallback logic - only used when environment variables are NOT set
  // This is for local development when environment variable is not configured
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Only use localhost when actually running on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000'
    }

    // Everything else → production backend
    return 'https://shot-on-me.onrender.com'
  }

  // Server-side rendering fallback → production backend
  return 'https://shot-on-me.onrender.com'
}

// For backward compatibility
export const getAPI_URL = () => getApiUrl()
export const getSOCKET_URL = () => getSocketUrl()

/**
 * React hook to get API URL at runtime (use in components)
 * Always prioritizes NEXT_PUBLIC_API_URL environment variable when set
 */
export const useApiUrl = () => {
  // Always use getApiUrl() which prioritizes environment variables
  return getApiUrl()
}

export const useSocketUrl = () => {
  // Always use getSocketUrl() which prioritizes environment variables
  return getSocketUrl()
}

/**
 * Gets the venue portal base URL for venue-owner authentication.
 * Prefer NEXT_PUBLIC_VENUE_PORTAL_URL in production.
 */
export const getVenuePortalUrl = (): string => {
  if (process.env.NEXT_PUBLIC_VENUE_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_VENUE_PORTAL_URL.trim().replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location

    // Local development fallback
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3002'
    }

    // If venue portal lives on same host, this still works.
    return origin.replace(/\/$/, '')
  }

  return 'http://localhost:3002'
}

export const getVenuePortalLoginUrl = (): string => {
  const base = `${getVenuePortalUrl()}/?source=app`
  if (typeof window !== 'undefined') {
    const returnTo = encodeURIComponent(window.location.origin)
    return `${base}&returnTo=${returnTo}`
  }
  return base
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
