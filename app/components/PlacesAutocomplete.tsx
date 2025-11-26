'use client'

import { useState, useRef } from 'react'
import { Autocomplete } from '@react-google-maps/api'
import { Search, X } from 'lucide-react'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
  placeholder?: string
  className?: string
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search venues by name, city, or address...',
  className = ''
}: PlacesAutocompleteProps) {
  const { isLoaded, loadError } = useGoogleMaps()

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance)
  }

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace()
      if (place) {
        // Update the input value with the place name or address
        const displayValue = place.name || place.formatted_address || ''
        onChange(displayValue)
        
        // Call onPlaceSelect callback if provided
        if (onPlaceSelect) {
          onPlaceSelect(place)
        }
      }
    }
  }

  if (loadError) {
    console.error('PlacesAutocomplete: Google Maps failed to load', loadError)
    // Fallback to regular input if Google Maps fails to load
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light ${className}`}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled
          className={`w-full pl-10 pr-10 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 backdrop-blur-sm font-light opacity-50 ${className}`}
        />
      </div>
    )
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ['establishment', 'point_of_interest', 'restaurant', 'bar', 'cafe'],
        fields: ['formatted_address', 'geometry', 'name', 'place_id', 'types', 'rating', 'user_ratings_total']
      }}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light ${className}`}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </Autocomplete>
  )
}

