export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.trim()
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? `${url}api` : `${url}/api`
    }
    return url
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    // For production domains (shotonme.com) OR Vercel deployments, use production API
    if (hostname.includes('shotonme.com') || 
        hostname.includes('shot-on-me') || 
        hostname.includes('vercel.app')) {
      // Check if this is local development (http:// or port 3000/3002)
      const isLocalDev = protocol === 'http:' || window.location.port === '3000' || window.location.port === '3002'
      if (isLocalDev) {
        // Local development with domain override
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
          return `http://${hostname}:5000/api`
        } else {
          return 'http://localhost:5000/api'
        }
      } else {
        // Production - Backend is deployed at: https://api.shotonme.com
        return 'https://api.shotonme.com/api'
      }
    }
    
    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `${protocol}//${hostname}:5000/api`
    }
    
    // Fallback for any other hostname - use production API
    return 'https://api.shotonme.com/api'
  }
  
  return 'http://localhost:5000/api'
}

export function useApiUrl() {
  return getApiUrl()
}

