'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'

const daysOfWeek = [
  { name: 'Monday', key: 'monday' },
  { name: 'Tuesday', key: 'tuesday' },
  { name: 'Wednesday', key: 'wednesday' },
  { name: 'Thursday', key: 'thursday' },
  { name: 'Friday', key: 'friday' },
  { name: 'Saturday', key: 'saturday' },
  { name: 'Sunday', key: 'sunday' }
]

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState(
    daysOfWeek.reduce((acc, day) => {
      acc[day.key] = { open: '09:00', close: '22:00', isOpen: true }
      return acc
    }, {} as Record<string, { open: string; close: string; isOpen: boolean }>)
  )

  const updateDay = (dayKey: string, field: string, value: string | boolean) => {
    setSchedule({
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        [field]: value
      }
    })
  }

  return (
    <div className="bg-black/40 border border-primary-500/15 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-1.5">
            <MapPin className="w-4 h-4 text-primary-500" />
          </div>
          <h2 className="text-base font-semibold text-primary-500 tracking-tight">Venue Info</h2>
        </div>
        <button 
          onClick={() => window.location.href = '/dashboard/settings'}
          className="text-primary-500/80 hover:text-primary-500 font-medium text-xs transition-all"
        >
          Edit
        </button>
      </div>
      
      <div className="space-y-1.5 mb-2">
        <div>
          <p className="text-primary-400/70 text-xs mb-0.5 uppercase tracking-wider font-medium">Name</p>
          <p className="text-primary-500 font-medium text-xs tracking-tight">Kates Pub</p>
        </div>
        <div>
          <p className="text-primary-400/70 text-xs mb-0.5 uppercase tracking-wider font-medium">Address</p>
          <p className="text-primary-400/80 text-xs font-light">123 Main St, Austin, TX, 78701</p>
        </div>
      </div>
      <button 
        onClick={() => {
          // Get venue location and open in Google Maps
          // This would need venue data - for now, just navigate to settings
          window.location.href = '/dashboard/settings'
        }}
        className="w-full bg-black/40 border border-primary-500/20 text-primary-500 py-1.5 rounded hover:bg-primary-500/10 hover:border-primary-500/30 transition-all font-medium text-xs backdrop-blur-sm"
      >
        Open in Google Maps
      </button>
    </div>
  )
}

