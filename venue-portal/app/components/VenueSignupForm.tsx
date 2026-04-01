'use client'

import { useState, useRef } from 'react'
import { getApiUrl } from '../utils/api'
import { ArrowLeft, Upload, CheckCircle2, Loader2 } from 'lucide-react'

const VENUE_TYPES = ['Bar', 'Restaurant', 'Nightclub', 'Coffee Shop', 'Lounge']
const STATES = [
  { value: 'IN', label: 'Indiana' },
  { value: 'IL', label: 'Illinois' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'MI', label: 'Michigan' },
  { value: 'OH', label: 'Ohio' },
]

interface VenueSignupFormProps {
  onBack: () => void
}

export default function VenueSignupForm({ onBack }: VenueSignupFormProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    venueName: '',
    venueType: '',
    address: '',
    city: '',
    state: '',
    ownerName: '',
    email: '',
    phone: '',
    website: '',
    description: '',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const required = ['venueName', 'venueType', 'address', 'city', 'state', 'ownerName', 'email', 'phone'] as const
    for (const field of required) {
      if (!form[field].trim()) {
        setError('Please fill in all required fields.')
        return
      }
    }

    if (!photoRef.current?.files?.[0]) {
      setError('Please upload at least one photo of your venue.')
      return
    }

    setSubmitting(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => data.append(k, v))
      data.append('photo', photoRef.current.files[0])

      const res = await fetch(`${getApiUrl()}/venue-requests`, {
        method: 'POST',
        body: data,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || 'Something went wrong. Please try again.')
        return
      }
      setStep('success')
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Request Submitted!</h2>
        <p className="text-primary-400/80 text-sm leading-relaxed max-w-xs mx-auto mb-6">
          Thank you! We'll review your request and get back to you within 24 hours.
        </p>
        <button
          onClick={onBack}
          className="text-sm text-primary-400 hover:text-primary-500 underline underline-offset-2"
        >
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-primary-400/70 hover:text-primary-400 text-sm mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-lg font-bold text-white mb-1">Request Access</h2>
      <p className="text-primary-400/60 text-sm mb-5">Tell us about your venue and we'll be in touch within 24 hours.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Venue Name + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-primary-400/70 mb-1">Venue Name *</label>
            <input
              value={form.venueName}
              onChange={e => set('venueName', e.target.value)}
              placeholder="The Gold Room"
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-primary-400/70 mb-1">Venue Type *</label>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPES.map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set('venueType', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.venueType === t
                      ? 'bg-primary-500 text-black border-primary-500'
                      : 'bg-black/40 text-primary-400/70 border-primary-500/20 hover:border-primary-500/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs text-primary-400/70 mb-1">Street Address *</label>
          <input
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="123 Main St"
            className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-primary-400/70 mb-1">City *</label>
            <input
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Indianapolis"
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-400/70 mb-1">State *</label>
            <select
              value={form.state}
              onChange={e => set('state', e.target.value)}
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60"
            >
              <option value="" className="bg-black">Select state</option>
              {STATES.map(s => (
                <option key={s.value} value={s.value} className="bg-black">{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Owner info */}
        <div>
          <label className="block text-xs text-primary-400/70 mb-1">Owner / Manager Name *</label>
          <input
            value={form.ownerName}
            onChange={e => set('ownerName', e.target.value)}
            placeholder="Jane Smith"
            className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-primary-400/70 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@thegoldroom.com"
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
            />
          </div>
          <div>
            <label className="block text-xs text-primary-400/70 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="(317) 555-0100"
              className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-primary-400/70 mb-1">Website <span className="text-primary-400/40">(optional)</span></label>
          <input
            value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder="https://thegoldroom.com"
            className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60"
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-xs text-primary-400/70 mb-1">Venue Photo *</label>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="w-full border border-dashed border-primary-500/30 rounded-lg p-4 text-center hover:border-primary-500/60 transition-colors"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full max-h-32 object-cover rounded-md" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-primary-400/50">
                <Upload className="w-5 h-5" />
                <span className="text-xs">Tap to upload a photo</span>
              </div>
            )}
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-primary-400/70 mb-1">Brief Description <span className="text-primary-400/40">(optional)</span></label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Tell us about your venue, vibe, and what makes it special..."
            rows={3}
            maxLength={500}
            className="w-full bg-black/40 border border-primary-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-primary-400/30 focus:outline-none focus:border-primary-500/60 resize-none"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-500 text-black font-bold py-3 rounded-lg hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : (
            'Submit Request'
          )}
        </button>
      </form>
    </div>
  )
}
