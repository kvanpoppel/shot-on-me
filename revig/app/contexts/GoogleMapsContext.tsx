'use client'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const LIBRARIES: ('places' | 'geometry')[] = ['places']

const GoogleMapsContext = createContext<{ isLoaded: boolean; loadError: Error | undefined } | undefined>(undefined)

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script-loader-revig',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  useEffect(() => {
    if (loadError) console.error('Revig: Google Maps load error', loadError)
  }, [loadError])

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: new Error('Google Maps API key not configured') }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMaps() {
  const ctx = useContext(GoogleMapsContext)
  if (!ctx) throw new Error('useGoogleMaps must be used within GoogleMapsProvider')
  return ctx
}
