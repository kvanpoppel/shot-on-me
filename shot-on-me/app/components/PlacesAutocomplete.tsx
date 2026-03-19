'use client'
import { useState, useRef } from 'react'
import { Autocomplete } from '@react-google-maps/api'
import { Search, X } from 'lucide-react'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
export default function PlacesAutocomplete({ value, onChange, onPlaceSelect, placeholder = 'Search venues...', className = '' }: any) {
  const { isLoaded, loadError } = useGoogleMaps()
  const [autocomplete, setAutocomplete] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputClass = `w-full pl-10 pr-10 py-2.5 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/30 backdrop-blur-sm font-light ${className}`
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace()
      if (place) { onChange(place.name || place.formatted_address || ''); if (onPlaceSelect) onPlaceSelect(place) }
    }
  }
  if (loadError || !isLoaded) return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} disabled={!isLoaded} />
      {value && <button onClick={() => onChange('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400"><X className="w-5 h-5" /></button>}
    </div>
  )
  return (
    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged} options={{ types: ['establishment'], fields: ['formatted_address','geometry','name','place_id','types','rating','user_ratings_total'] }}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input ref={inputRef} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
        {value && <button onClick={() => onChange('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400"><X className="w-5 h-5" /></button>}
      </div>
    </Autocomplete>
  )
}
