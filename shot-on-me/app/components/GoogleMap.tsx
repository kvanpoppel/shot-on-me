'use client'

import { useMemo, useCallback } from 'react'
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

// Enhanced dark theme for Google Maps with gold accents matching app design
const mapStyles: google.maps.MapTypeStyle[] = [
  // Base styling - dark background
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#0f0f0f' }]
  },
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', saturation: 20 }] // Gold text
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#000000', visibility: 'on' }]
  },
  {
    featureType: 'all',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  // Water - very dark
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050505' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', lightness: 30 }]
  },
  // Roads - dark with subtle gold tint
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a', lightness: -10 }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a', lightness: -5 }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#1f1f1f' }]
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#151515' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', lightness: 40 }]
  },
  // Points of Interest
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', lightness: 30 }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0f0f0f' }]
  },
  // Administrative areas
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }]
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', lightness: 20 }]
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D4AF37', lightness: 30 }]
  },
  // Transit
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }]
  }
]

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
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      styles: mapStyles,
      backgroundColor: '#000000',
      // Enhanced control styling
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
        style: google.maps.ZoomControlStyle.SMALL
      },
      // Improve map rendering
      gestureHandling: 'greedy',
      minZoom: 3,
      maxZoom: 20,
      restriction: undefined
    }),
    []
  )

  const onMapLoad = useCallback((map: google.maps.Map) => {
    // Optional: Add any map initialization logic here
    console.log('Google Map loaded successfully')
  }, [])

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
      onLoad={onMapLoad}
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
              fontWeight: marker.label.fontWeight || 'bold'
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
            animation={google.maps.Animation.DROP}
          />
        )
      })}
    </GoogleMap>
  )
}

