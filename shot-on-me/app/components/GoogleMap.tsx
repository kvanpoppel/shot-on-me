'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

interface MarkerData {
  id: string
  position: { lat: number; lng: number }
  label?: string | { text: string; color?: string; fontWeight?: string; fontSize?: string }
  title?: string
  icon?: string | { url: string; scaledSize?: { width: number; height: number }; anchor?: { x: number; y: number } } | google.maps.Symbol | google.maps.Icon
  onClick?: () => void
}

interface GoogleMapComponentProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MarkerData[]
  onMapClick?: (e: google.maps.MapMouseEvent) => void
  onDragStart?: () => void
  onIdle?: (center: { lat: number; lng: number }) => void
  mapContainerStyle?: React.CSSProperties
  mapContainerClassName?: string
  interactive?: boolean
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
  onDragStart,
  onIdle,
  mapContainerStyle = defaultMapContainerStyle,
  mapContainerClassName = '',
  interactive = true
}: GoogleMapComponentProps) {
  const { isLoaded, loadError } = useGoogleMaps()
  const mapRef = useRef<google.maps.Map | null>(null)

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: !interactive,
      clickableIcons: interactive,
      scrollwheel: interactive,
      zoomControl: interactive,
      mapTypeControl: false,
      scaleControl: interactive,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: interactive,
      styles: mapStyles,
      backgroundColor: '#000000',
      // Enhanced control styling
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      // Improve map rendering
      gestureHandling: interactive ? 'greedy' : 'none',
      minZoom: 3,
      maxZoom: 20,
      restriction: undefined
    }),
    [interactive]
  )

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const handleIdle = useCallback(() => {
    if (mapRef.current && onIdle) {
      const c = mapRef.current.getCenter()
      if (c) {
        onIdle({ lat: c.lat(), lng: c.lng() })
      }
    }
  }, [onIdle])

  const handleDragStart = useCallback(() => {
    if (onDragStart) onDragStart()
  }, [onDragStart])

  // Listen for center-map events
  useEffect(() => {
    if (!mapRef.current) return

    const handleCenterMap = (event: CustomEvent) => {
      if (mapRef.current && event.detail) {
        mapRef.current.setCenter(event.detail)
        mapRef.current.setZoom(15)
      }
    }
    window.addEventListener('center-map', handleCenterMap as EventListener)
    return () => {
      window.removeEventListener('center-map', handleCenterMap as EventListener)
    }
  }, [mapRef.current])

  // Update map center when center coordinates actually change
  const prevCenterRef = useRef<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (mapRef.current && center) {
      const prev = prevCenterRef.current
      if (!prev || Math.abs(prev.lat - center.lat) > 0.0001 || Math.abs(prev.lng - center.lng) > 0.0001) {
        prevCenterRef.current = center
        mapRef.current.setCenter(center)
      }
    }
  }, [center])

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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      mapContainerClassName={mapContainerClassName}
      center={center}
      zoom={zoom}
      options={mapOptions}
      onClick={onMapClick}
      onLoad={onMapLoad}
      onIdle={handleIdle}
      onDragStart={handleDragStart}
    >
      {markers.map((marker) => {
        // Convert icon format if needed
        let iconConfig: any = undefined
        if (marker.icon) {
          if (typeof marker.icon === 'string') {
            iconConfig = marker.icon
          } else {
            // Convert to Google Maps Icon format
            if (typeof marker.icon === 'object' && marker.icon !== null && 'url' in marker.icon) {
              iconConfig = {
                url: (marker.icon as any).url,
                scaledSize: (marker.icon as any).scaledSize
                  ? new google.maps.Size((marker.icon as any).scaledSize.width, (marker.icon as any).scaledSize.height)
                  : undefined,
                anchor: (marker.icon as any).anchor
                  ? new google.maps.Point((marker.icon as any).anchor.x, (marker.icon as any).anchor.y)
                  : undefined
              }
            } else if (typeof marker.icon === 'object' && marker.icon !== null) {
              // It's already a Symbol or Icon, use it directly
              iconConfig = marker.icon as any
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
    {!interactive && (
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
    )}
    </div>
  )
}

