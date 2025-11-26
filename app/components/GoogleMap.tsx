'use client'

import { useMemo } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

interface MarkerData {
  id: string
  position: { lat: number; lng: number }
  label?: string | { text: string; color?: string; fontWeight?: string }
  title?: string
  icon?: string | { url: string; scaledSize?: { width: number; height: number }; anchor?: { x: number; y: number } }
  onClick?: () => void
}

interface GoogleMapComponentProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MarkerData[]
  onMapClick?: (e: google.maps.MapMouseEvent) => void
  mapContainerStyle?: React.CSSProperties
  mapContainerClassName?: string
}

const defaultMapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%'
}

export default function GoogleMapComponent({
  center,
  zoom = 13,
  markers = [],
  onMapClick,
  mapContainerStyle = defaultMapContainerStyle,
  mapContainerClassName = ''
}: GoogleMapComponentProps) {
  const { isLoaded, loadError } = useGoogleMaps()

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      scrollwheel: true,
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
      <div className="w-full h-full flex items-center justify-center bg-black/50">
        <div className="text-center text-primary-400">
          <p className="text-lg mb-2">Error loading map</p>
          <p className="text-sm">Please check your Google Maps API key</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      mapContainerClassName={mapContainerClassName}
      center={center}
      zoom={zoom}
      options={mapOptions}
      onClick={onMapClick}
    >
      {markers.map((marker) => {
        // Convert icon format if needed
        let iconConfig: any = undefined
        if (marker.icon) {
          if (typeof marker.icon === 'string') {
            iconConfig = marker.icon
          } else {
            // Convert to Google Maps Icon format
            iconConfig = {
              url: marker.icon.url,
              scaledSize: marker.icon.scaledSize 
                ? new google.maps.Size(marker.icon.scaledSize.width, marker.icon.scaledSize.height)
                : undefined,
              anchor: marker.icon.anchor
                ? new google.maps.Point(marker.icon.anchor.x, marker.icon.anchor.y)
                : undefined
            }
          }
        }

        // Convert label format if needed
        let labelConfig: string | google.maps.MarkerLabel | undefined = undefined
        if (marker.label) {
          if (typeof marker.label === 'string') {
            labelConfig = marker.label
          } else {
            labelConfig = {
              text: marker.label.text,
              color: marker.label.color || '#000000',
              fontWeight: marker.label.fontWeight || 'normal'
            }
          }
        }

        return (
          <Marker
            key={marker.id}
            position={marker.position}
            label={labelConfig}
            title={marker.title}
            icon={iconConfig}
            onClick={marker.onClick}
          />
        )
      })}
    </GoogleMap>
  )
}

