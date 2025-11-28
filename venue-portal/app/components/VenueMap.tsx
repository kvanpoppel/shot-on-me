'use client'

import { useMemo } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

interface VenueMapProps {
  location?: { latitude: number; longitude: number }
  address?: string
  venueName?: string
  height?: string
}

export default function VenueMap({ location, address, venueName, height = '300px' }: VenueMapProps) {
  const { isLoaded, loadError } = useGoogleMaps()

  // Determine center - use location if available, otherwise default to a location
  const center = useMemo(() => {
    if (location?.latitude && location?.longitude) {
      return { lat: location.latitude, lng: location.longitude }
    }
    // Default to Austin, TX if no location
    return { lat: 30.2672, lng: -97.7431 }
  }, [location])

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      scrollwheel: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#1a1a1a' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d4af37' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#0a0a0a' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#2a2a2a' }]
        },
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#1a1a1a' }]
        }
      ]
    }),
    []
  )

  if (loadError) {
    return (
      <div className="w-full flex items-center justify-center bg-black/50 border border-primary-500/20 rounded-lg" style={{ height }}>
        <div className="text-center text-primary-400 p-4">
          <p className="text-sm mb-2">Error loading map</p>
          <p className="text-xs">Please check your Google Maps API key</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full flex items-center justify-center bg-black/50 border border-primary-500/20 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-primary-400 text-xs">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full border border-primary-500/20 rounded-lg overflow-hidden" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={location ? 15 : 10}
        options={mapOptions}
      >
        {location?.latitude && location?.longitude && (
          <Marker
            position={{ lat: location.latitude, lng: location.longitude }}
            title={venueName || 'Venue Location'}
          />
        )}
      </GoogleMap>
    </div>
  )
}

