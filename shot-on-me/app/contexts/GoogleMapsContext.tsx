'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8'

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined)

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  // Wrap in try-catch at component level, but hooks must be called unconditionally
  let loaderResult
  try {
    loaderResult = useJsApiLoader({
      id: 'google-maps-script-loader',
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      libraries: ['places']
    })
  } catch (error) {
    console.error('GoogleMapsProvider: Error initializing Google Maps API:', error)
    // Return a safe default if hook fails
    loaderResult = { isLoaded: false, loadError: error as Error }
  }
  
  const { isLoaded, loadError } = loaderResult || { isLoaded: false, loadError: undefined }

  useEffect(() => {
    if (loadError) {
      console.error('Google Maps API Error:', loadError)
      console.error('API Key:', GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 'MISSING')
    }
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key is missing! Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file')
    }
  }, [loadError])

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  if (context === undefined) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider')
  }
  return context
}

