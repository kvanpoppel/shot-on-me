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
 */
export const getApiUrl = (): string => {
  // PRIORITY 1: Environment variable (set in Vercel for production)
  // This is the most reliable way and should be used in production
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    // Ensure it ends with /api
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  
  // PRIORITY 2: If running in browser, detect from current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // For production domains (shotonme.com), use Render backend
    if (hostname.includes('shotonme.com') || hostname.includes('shot-on-me')) {
      // Backend is deployed on Render at: https://shot-on-me.onrender.com
      return 'https://shot-on-me.onrender.com/api'
    }
    
    // For localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api'
    }
    
    // For IP addresses (mobile devices on same network), use that IP
    // Mobile devices accessing via IP address (e.g., 192.168.1.100:3001)
    // Should connect to backend at that same IP on port 5000
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:5000/api`
    }
    
    // Fallback for any other hostname
    return `http://${hostname}:5000/api`
  }
  
  // Default for server-side rendering
  return 'http://localhost:5000/api'
}

/**
 * Gets the Socket.io URL (no /api suffix)
 */
export const getSocketUrl = (): string => {
  // If environment variable is set, use it (remove /api if present)
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '')
    return url
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    if (hostname.includes('shotonme.com') || hostname.includes('shot-on-me')) {
      // Backend is deployed on Render at: https://shot-on-me.onrender.com
      return 'https://shot-on-me.onrender.com'
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000'
    }
    
    return `http://${hostname}:5000`
  }
  
  return 'http://localhost:5000'
}

// For backward compatibility
export const getAPI_URL = () => getApiUrl()
export const getSOCKET_URL = () => getSocketUrl()

/**
 * React hook to get API URL at runtime (use in components)
 * This ensures the URL is correct when accessed from mobile devices via IP
 */
export const useApiUrl = () => {
  if (typeof window !== 'undefined') {
    return getApiUrl()
  }
  return 'http://localhost:5000/api'
}

export const useSocketUrl = () => {
  if (typeof window !== 'undefined') {
    return getSocketUrl()
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
