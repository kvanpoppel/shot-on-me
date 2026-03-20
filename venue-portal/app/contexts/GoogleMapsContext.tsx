'use client'
import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
if (!GOOGLE_MAPS_API_KEY) { throw new Error('[GoogleMapsContext] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.') }
const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places']
const GoogleMapsContext = createContext<{ isLoaded: boolean; loadError: Error | undefined } | undefined>(undefined)
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-maps-script-loader-venue', googleMapsApiKey: GOOGLE_MAPS_API_KEY!, libraries: GOOGLE_MAPS_LIBRARIES })
  useEffect(() => { if (loadError) console.error('Google Maps API Error:', loadError) }, [loadError])
  return <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>{children}</GoogleMapsContext.Provider>
}
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  if (context === undefined) throw new Error('useGoogleMaps must be used within a GoogleMapsProvider')
  return context
}
