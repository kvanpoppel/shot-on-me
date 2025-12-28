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
    
    // For production domains (shotonme.com) OR Vercel deployments, use Render backend
    // Vercel preview URLs look like: shotonme-665zqvmre-kate-vanpoppels-projects.vercel.app
    // Production domain: www.shotonme.com or shotonme.com
    // BUT: If using http (not https) or port 3001, assume local development
    if (hostname.includes('shotonme.com') || 
        hostname.includes('shot-on-me') || 
        hostname.includes('vercel.app')) {
      // Check if this is local development (http:// or port 3001)
      const isLocalDev = protocol === 'http:' || window.location.port === '3001' || window.location.port === '3000'
      if (isLocalDev) {
        // Local development with domain override
        // When DNS override is set up on mobile, window.location.hostname will be the IP address
        // If hostname is an IP, use it (mobile device with DNS override)
        if (/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
          // Mobile device - DNS override resolved domain to IP
          return `http://${window.location.hostname}:5000/api`
        }
        // Desktop local development - use localhost
        // (When accessing www.shotonme.com on desktop with hosts file, hostname will be the domain,
        // but we want localhost for backend since desktop can access localhost)
        return 'http://localhost:5000/api'
      }
      // Production - Try custom domain first, fallback to Render URL
      // Custom domain might not be configured or service might be sleeping
      // Fallback to direct Render URL ensures connection works
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
      const apiUrl = `http://${hostname}:5000/api`
      console.log('📱 Mobile device detected, using IP-based API URL:', apiUrl)
      return apiUrl
    }
    
    // Fallback for any other hostname - use Render URL directly
    // This ensures connection works even if custom domain isn't configured
    return 'https://shot-on-me.onrender.com/api'
  }
  
  // Default for server-side rendering
  return 'http://localhost:5000/api'
}

/**
 * Gets the Socket.io URL (no /api suffix)
 */
export const getSocketUrl = (): string => {
  const isProd = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname.includes('shotonme.com') ||
     window.location.hostname.includes('vercel.app'))
  
  // If environment variable is set, use it (remove /api if present)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim()
  }
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, '')
    // Use wss:// in production if protocol is https
    if (isProd && url.startsWith('http://')) {
      url = url.replace('http://', 'wss://')
    } else if (isProd && url.startsWith('https://')) {
      url = url.replace('https://', 'wss://')
    }
    return url
  }
  
  // If running in browser, use current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // For production domains OR Vercel deployments, use Render backend with wss
    // BUT: If using http (not https) or port 3001, assume local development
    if (hostname.includes('shotonme.com') || 
        hostname.includes('shot-on-me') || 
        hostname.includes('vercel.app')) {
      // Check if this is local development (http:// or port 3001)
      const isLocalDev = protocol === 'http:' || window.location.port === '3001' || window.location.port === '3000'
      if (isLocalDev) {
        // Local development with domain override
        // When DNS override is set up on mobile, window.location.hostname will be the IP address
        // If hostname is an IP, use it (mobile device with DNS override)
        if (/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
          // Mobile device - DNS override resolved domain to IP
          return `http://${window.location.hostname}:5000`
        }
        // Desktop local development - use localhost
        return 'http://localhost:5000'
      }
      // Production - Use Render URL for WebSocket (wss://)
      // Use direct Render URL to ensure connection works even when service is sleeping
      return 'wss://shot-on-me.onrender.com'
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000'
    }
    
    // For IP addresses (mobile devices), extract IP and use port 5000
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:5000`
    }
    
    // Fallback for any other hostname - use Render URL directly
    return isProd ? 'wss://shot-on-me.onrender.com' : 'http://localhost:5000'
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
