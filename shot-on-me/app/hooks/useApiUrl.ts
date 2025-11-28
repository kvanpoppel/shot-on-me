'use client'

import { useMemo } from 'react'

/**
 * Hook to get the API URL dynamically based on current hostname
 * This ensures the URL is correct when accessed from mobile devices via IP
 */
export const useApiUrl = () => {
  return useMemo(() => {
    // If environment variable is set, use it
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    
    // If running in browser, use current hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      // If accessing via IP address (mobile), use that IP for backend
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:5000/api`
      }
    }
    
    // Default to localhost
    return 'http://localhost:5000/api'
  }, [])
}

