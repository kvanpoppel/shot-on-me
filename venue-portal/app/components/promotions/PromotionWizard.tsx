'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Sparkles, Clock, Users, Eye, X, Bell, Zap, Flame } from 'lucide-react'
import { PromotionTemplate } from './PromotionTemplates'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface PromotionFormData {
  title: string
  description: string
  offer: string
  type: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  isFlashDeal: boolean
  flashDealEndsAt: string
  pointsReward: number
  isRecurring: boolean
  recurrencePattern: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom'
    frequency: number
    daysOfWeek: number[]
    dayOfMonth?: number
    endDate: string
    maxOccurrences?: number
  }
  targeting: {
    followersOnly: boolean
    locationBased: boolean
    radiusMiles: number
    userSegments: string[]
    minCheckIns: number
    timeBased: boolean
    timeWindow: { start: string; end: string }
  }
}

interface PromotionWizardProps {
  initialData?: Partial<PromotionFormData>
  template?: PromotionTemplate | null
  onSave: (data: PromotionFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

const STEPS = [
  { id: 1, name: 'The Deal',  icon: <Sparkles className="w-4 h-4" /> },
  { id: 2, name: 'Schedule',  icon: <Clock className="w-4 h-4" /> },
  { id: 3, name: 'Audience',  icon: <Users className="w-4 h-4" /> },
  { id: 4, name: 'Preview',   icon: <Eye className="w-4 h-4" /> },
]

const DEAL_TYPES = [
  { value: 'happy-hour',  label: 'Happy Hour',  emoji: '🍺', desc: 'Discounted drinks for a set time' },
  { value: 'flash-deal',  label: 'Flash Deal',  emoji: '⚡', desc: 'Limited-time urgent offer' },
  { value: 'special',     label: 'Special',     emoji: '🎉', desc: 'Featured food or drink item' },
  { value: 'exclusive',   label: 'VIP Exclusive', emoji: '👑', desc: 'For your top followers' },
  { value: 'event',       label: 'Event',       emoji: '📅', desc: 'Live music, trivia, etc.' },
]

export default function PromotionWizard({
  initialData,
  template,
  onSave,
  onCancel,
  isEditing = false
}: PromotionWizardProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<PromotionFormData>(() => {
    const now = new Date()
    // Default start = top of next hour
    const defaultStart = new Date(now)
    defaultStart.setMinutes(0, 0, 0)
    defaultStart.setHours(defaultStart.getHours() + 1)
    // Default end = 3 hours after start
    const defaultEnd = new Date(defaultStart)
    defaultEnd.setHours(defaultEnd.getHours() + 3)

    const defaultData: PromotionFormData = {
      title: '',
      description: '',
      offer: '',
      type: 'happy-hour',
      startTime: defaultStart.toISOString().slice(0, 16),
      endTime: defaultEnd.toISOString().slice(0, 16),
      daysOfWeek: [],
      isFlashDeal: false,
      flashDealEndsAt: '',
      pointsReward: 0,
      isRecurring: false,
      recurrencePattern: {
        type: 'weekly',
        frequency: 1,
        daysOfWeek: [],
        endDate: '',
        maxOccurrences: 12,
      },
      targeting: {
        followersOnly: false,
        locationBased: false,
        radiusMiles: 5,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false,
        timeWindow: { start: '', end: '' },
      },
    }

    if (template?.defaultData) {
      return {
        ...defaultData,
        title: template.defaultData.title || '',
        description: template.defaultData.description || '',
        offer: (template.defaultData as any).offer || '',
        type: template.defaultData.type || 'happy-hour',
        startTime: template.defaultData.startTime || defaultData.startTime,
        endTime: template.defaultData.endTime || defaultData.endTime,
        isFlashDeal: template.defaultData.isFlashDeal || false,
        flashDealEndsAt: template.defaultData.flashDealEndsAt || '',
        pointsReward: template.defaultData.pointsReward || 0,
        targeting: { ...defaultData.targeting, ...template.defaultData.targeting },
      }
    }

    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        offer: (initialData as any).offer || '',
        targeting: { ...defaultData.targeting, ...(initialData.targeting || {}) },
      }
    }

    return defaultData
  })

  const updateFormData = (updates: Partial<PromotionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => { if (currentStep < STEPS.length) setCurrentStep(s => s + 1) }
  const prevStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1) }

  const handleSubmit = async () => {
    setSaving(true)
    try { await onSave(formData) }
    catch (error) { console.error('Error saving promotion:', error) }
    finally { setSaving(false) }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.title.trim() !== '' && formData.type !== ''
      case 2:
        if (formData.isFlashDeal) return formData.flashDealEndsAt !== ''
        if (formData.isRecurring) {
          if (formData.recurrencePattern.type === 'weekly')
            return formData.startTime !== '' && formData.recurrencePattern.daysOfWeek.length > 0
          return formData.startTime !== ''
        }
        return formData.startTime !== '' && formData.endTime !== ''
      case 3:
      case 4:
        return true
      default: return false
    }
  }

  const progressPct = ((currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-black border border-primary-500/30 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xl max-h-[94vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-primary-500/15 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Deal' : 'New Deal'}
              </h2>
              <p className="text-xs text-primary-400/50 mt-0.5">
                Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].name}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex justify-between">
            {STEPS.map(step => (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${
                  currentStep > step.id
                    ? 'bg-primary-500 border-primary-500 text-black'
                    : currentStep === step.id
                      ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                      : 'bg-white/5 border-white/10 text-white/20'
                }`}>
                  {currentStep > step.id ? <Check className="w-3 h-3" /> : step.id}
                </div>
                <span className={`text-[9px] font-medium hidden sm:block ${currentStep >= step.id ? 'text-primary-400' : 'text-white/20'}`}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentStep === 1 && <Step1TheDeal formData={formData} updateFormData={updateFormData} />}
          {currentStep === 2 && <Step2Schedule formData={formData} updateFormData={updateFormData} />}
          {currentStep === 3 && <Step3Audience formData={formData} updateFormData={updateFormData} />}
          {currentStep === 4 && <Step4Preview formData={formData} />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-primary-500/15 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={currentStep === 1 ? onCancel : prevStep}
            className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border border-white/10 text-primary-400 rounded-xl hover:bg-white/10 transition-all text-sm min-h-[44px]"
          >
            {currentStep === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" />Back</>}
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-1.5 px-6 py-3 bg-primary-500 text-black rounded-xl hover:bg-primary-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold min-h-[44px]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-6 py-3 bg-primary-500 text-black rounded-xl hover:bg-primary-400 transition-all disabled:opacity-40 text-sm font-bold min-h-[44px]"
            >
              {saving ? 'Publishing...' : isEditing ? 'Save Changes' : '🚀 Publish Deal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: The Deal ────────────────────────────────────────────────────────

function Step1TheDeal({ formData, updateFormData }: { formData: PromotionFormData; updateFormData: (u: Partial<PromotionFormData>) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-primary-400/70 text-sm">What are you offering tonight?</p>

      {/* Deal Type — large tap targets */}
      <div>
        <label className="block text-sm font-semibold text-primary-500 mb-2">Type of Deal *</label>
        <div className="grid grid-cols-1 gap-2">
          {DEAL_TYPES.map(dt => (
            <button
              key={dt.value}
              type="button"
              onClick={() => updateFormData({ type: dt.value })}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all min-h-[56px] ${
                formData.type === dt.value
                  ? 'bg-primary-500/15 border-primary-500 text-white'
                  : 'bg-black/40 border-white/10 text-white/60 hover:border-primary-500/40'
              }`}
            >
              <span className="text-2xl leading-none">{dt.emoji}</span>
              <div>
                <p className="text-sm font-semibold leading-tight">{dt.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{dt.desc}</p>
              </div>
              {formData.type === dt.value && (
                <Check className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-primary-500 mb-2">Deal Name *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm min-h-[48px]"
          placeholder="e.g., Tito's Tuesday Special"
        />
      </div>

      {/* Offer — the most important field */}
      <div>
        <label className="block text-sm font-semibold text-primary-500 mb-2">What's the Offer?</label>
        <input
          type="text"
          value={formData.offer}
          onChange={(e) => updateFormData({ offer: e.target.value })}
          className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm min-h-[48px]"
          placeholder="e.g., $5 Tito's drinks, BOGO shots, 50% off apps"
        />
        <p className="text-xs text-white/30 mt-1.5">This is what customers will see on the deal card</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-primary-500 mb-2">Additional Details <span className="text-white/30 font-normal">(optional)</span></label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm resize-none"
          placeholder="Any fine print, exclusions, or extra details..."
          rows={3}
        />
      </div>
    </div>
  )
}

// ─── Step 2: Schedule ────────────────────────────────────────────────────────

function Step2Schedule({ formData, updateFormData }: { formData: PromotionFormData; updateFormData: (u: Partial<PromotionFormData>) => void }) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toggleDay = (day: number) => {
    const days = formData.recurrencePattern.daysOfWeek || []
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort()
    updateFormData({ recurrencePattern: { ...formData.recurrencePattern, daysOfWeek: next } })
  }

  // Duration in hours between startTime and endTime
  const durationHours = (() => {
    const s = new Date(formData.startTime)
    const e = new Date(formData.endTime)
    const h = (e.getTime() - s.getTime()) / 3600000
    return h > 0 ? h : 2
  })()

  const setDuration = (hours: number) => {
    const start = new Date(formData.startTime)
    const end = new Date(start)
    end.setTime(end.getTime() + hours * 3600000)
    updateFormData({ endTime: end.toISOString().slice(0, 16) })
  }

  return (
    <div className="space-y-5">
      <p className="text-primary-400/70 text-sm">When does this deal run?</p>

      {/* Recurring toggle — secondary, not leading */}
      <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Repeating deal</p>
          <p className="text-xs text-white/40 mt-0.5">Runs the same time every week</p>
        </div>
        <button
          type="button"
          onClick={() => updateFormData({ isRecurring: !formData.isRecurring })}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.isRecurring ? 'bg-primary-500' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.isRecurring ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Flash deal toggle */}
      {!formData.isRecurring && (
        <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-sm font-semibold text-white">Flash Deal</p>
              <p className="text-xs text-white/40 mt-0.5">Creates urgency — ends at a hard cutoff</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateFormData({ isFlashDeal: !formData.isFlashDeal })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.isFlashDeal ? 'bg-rose-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.isFlashDeal ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      )}

      {/* ONE-TIME */}
      {!formData.isRecurring && !formData.isFlashDeal && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-500 mb-2">Starts *</label>
            <DatePicker
              selected={formData.startTime ? new Date(formData.startTime) : null}
              onChange={(date: Date | null) => {
                if (date) updateFormData({ startTime: date.toISOString().slice(0, 16) })
              }}
              showTimeSelect
              timeFormat="h:mm aa"
              timeIntervals={15}
              dateFormat="EEE, MMM d · h:mm aa"
              className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white text-sm min-h-[48px] focus:ring-2 focus:ring-primary-500/50"
              wrapperClassName="w-full"
              minDate={new Date()}
              placeholderText="Pick start time"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-500 mb-2">Ends *</label>
            <DatePicker
              selected={formData.endTime ? new Date(formData.endTime) : null}
              onChange={(date: Date | null) => {
                if (date) updateFormData({ endTime: date.toISOString().slice(0, 16) })
              }}
              showTimeSelect
              timeFormat="h:mm aa"
              timeIntervals={15}
              dateFormat="EEE, MMM d · h:mm aa"
              className="w-full px-4 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white text-sm min-h-[48px] focus:ring-2 focus:ring-primary-500/50"
              wrapperClassName="w-full"
              minDate={formData.startTime ? new Date(formData.startTime) : new Date()}
              placeholderText="Pick end time"
            />
          </div>

          {/* Quick duration chips */}
          <div>
            <p className="text-xs text-white/40 mb-2">Quick set duration:</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 6].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDuration(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    Math.abs(durationHours - h) < 0.1
                      ? 'bg-primary-500 border-primary-500 text-black'
                      : 'bg-black/40 border-white/15 text-white/50 hover:border-primary-500/40'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLASH DEAL */}
      {!formData.isRecurring && formData.isFlashDeal && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-500 mb-2">Starts now — ends at *</label>
            <DatePicker
              selected={formData.flashDealEndsAt ? new Date(formData.flashDealEndsAt) : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const now = new Date().toISOString().slice(0, 16)
                  updateFormData({
                    startTime: now,
                    flashDealEndsAt: date.toISOString().slice(0, 16),
                    endTime: date.toISOString().slice(0, 16),
                  })
                }
              }}
              showTimeSelect
              timeFormat="h:mm aa"
              timeIntervals={15}
              dateFormat="EEE, MMM d · h:mm aa"
              className="w-full px-4 py-3 bg-black/40 border border-rose-500/40 rounded-xl text-white text-sm min-h-[48px] focus:ring-2 focus:ring-rose-500/50"
              wrapperClassName="w-full"
              minDate={new Date()}
              placeholderText="When does the flash deal expire?"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <p className="text-xs text-white/40 w-full mb-1">Quick set:</p>
            {[30, 60, 90, 120].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  const end = new Date()
                  end.setMinutes(end.getMinutes() + mins)
                  const now = new Date().toISOString().slice(0, 16)
                  updateFormData({
                    startTime: now,
                    flashDealEndsAt: end.toISOString().slice(0, 16),
                    endTime: end.toISOString().slice(0, 16),
                  })
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-black/40 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>
          {formData.flashDealEndsAt && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-400">
              ⚡ Flash deal starts immediately, expires {new Date(formData.flashDealEndsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* RECURRING */}
      {formData.isRecurring && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-500 mb-2">Which days? *</label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${
                    formData.recurrencePattern.daysOfWeek?.includes(i)
                      ? 'bg-primary-500 border-primary-500 text-black'
                      : 'bg-black/40 border-white/10 text-white/50 hover:border-primary-500/30'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-primary-500 mb-2">Start time *</label>
              <DatePicker
                selected={formData.startTime ? new Date(formData.startTime) : null}
                onChange={(date: Date | null) => {
                  if (date) updateFormData({ startTime: date.toISOString().slice(0, 16) })
                }}
                showTimeSelect
                showTimeSelectOnly
                timeFormat="h:mm aa"
                timeIntervals={15}
                dateFormat="h:mm aa"
                className="w-full px-3 py-3 bg-black/40 border border-primary-500/20 rounded-xl text-white text-sm min-h-[48px]"
                wrapperClassName="w-full"
                placeholderText="e.g. 4:00 PM"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary-500 mb-2">Duration *</label>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDuration(h)}
                    className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      Math.abs(durationHours - h) < 0.1
                        ? 'bg-primary-500 border-primary-500 text-black'
                        : 'bg-black/40 border-white/10 text-white/50 hover:border-primary-500/30'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {formData.recurrencePattern.daysOfWeek?.length > 0 && formData.startTime && (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 text-xs text-primary-400">
              Repeats every {formData.recurrencePattern.daysOfWeek.map(d => DAY_NAMES[d]).join(', ')} at {new Date(formData.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} for {Math.round(durationHours)}h
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Audience ────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: 'all',       label: 'Everyone',      desc: 'Any SOM user nearby',          emoji: '🌎' },
  { value: 'followers', label: 'Followers Only', desc: 'Only people who follow you',   emoji: '⭐' },
  { value: 'vip',       label: 'VIP Guests',    desc: 'Top customers (5+ check-ins)', emoji: '👑' },
]

function Step3Audience({ formData, updateFormData }: { formData: PromotionFormData; updateFormData: (u: Partial<PromotionFormData>) => void }) {
  const currentAudience = formData.targeting.followersOnly
    ? (formData.targeting.minCheckIns >= 5 ? 'vip' : 'followers')
    : 'all'

  const setAudience = (val: string) => {
    updateFormData({
      targeting: {
        ...formData.targeting,
        followersOnly: val !== 'all',
        minCheckIns: val === 'vip' ? 5 : 0,
        userSegments: val === 'vip' ? ['vip'] : val === 'followers' ? ['frequent', 'vip'] : ['all'],
      }
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-primary-400/70 text-sm">Who should see this deal?</p>

      <div className="grid grid-cols-1 gap-2">
        {AUDIENCE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAudience(opt.value)}
            className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all min-h-[60px] ${
              currentAudience === opt.value
                ? 'bg-primary-500/15 border-primary-500 text-white'
                : 'bg-black/40 border-white/10 text-white/60 hover:border-primary-500/40'
            }`}
          >
            <span className="text-2xl leading-none">{opt.emoji}</span>
            <div>
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-white/40 mt-0.5">{opt.desc}</p>
            </div>
            {currentAudience === opt.value && (
              <Check className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Location toggle */}
      <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Nearby only</p>
          <p className="text-xs text-white/40 mt-0.5">Only show to users within {formData.targeting.radiusMiles} miles</p>
        </div>
        <button
          type="button"
          onClick={() => updateFormData({ targeting: { ...formData.targeting, locationBased: !formData.targeting.locationBased } })}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.targeting.locationBased ? 'bg-primary-500' : 'bg-white/20'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.targeting.locationBased ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {formData.targeting.locationBased && (
        <div>
          <label className="block text-sm font-semibold text-primary-500 mb-2">Radius</label>
          <div className="flex gap-2">
            {[1, 2, 5, 10, 25].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => updateFormData({ targeting: { ...formData.targeting, radiusMiles: r } })}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                  formData.targeting.radiusMiles === r
                    ? 'bg-primary-500 border-primary-500 text-black'
                    : 'bg-black/40 border-white/10 text-white/50 hover:border-primary-500/30'
                }`}
              >
                {r}mi
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Points reward */}
      <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">Bonus Points</p>
            <p className="text-xs text-white/40 mt-0.5">Reward customers who use this deal</p>
          </div>
          <span className="text-primary-500 font-bold text-lg">{formData.pointsReward > 0 ? `+${formData.pointsReward}` : 'Off'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          step={25}
          value={formData.pointsReward}
          onChange={(e) => updateFormData({ pointsReward: parseInt(e.target.value) })}
          className="w-full accent-primary-500"
        />
        <div className="flex justify-between text-xs text-white/25 mt-1">
          <span>None</span>
          <span>500 pts</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Preview ─────────────────────────────────────────────────────────

function Step4Preview({ formData }: { formData: PromotionFormData }) {
  const typeInfo = {
    'happy-hour': { label: 'Happy Hour',    color: 'text-amber-400',  bg: 'bg-amber-500/20 border-amber-500/30',  emoji: '🍺' },
    'flash-deal': { label: 'Flash Deal',    color: 'text-rose-400',   bg: 'bg-rose-500/20 border-rose-500/30',    emoji: '⚡' },
    'special':    { label: 'Special',       color: 'text-primary-400',bg: 'bg-primary-500/20 border-primary-500/30', emoji: '🎉' },
    'exclusive':  { label: 'VIP Exclusive', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30', emoji: '👑' },
    'event':      { label: 'Event',         color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/30',    emoji: '📅' },
  }[formData.type] || { label: formData.type, color: 'text-primary-400', bg: 'bg-primary-500/20 border-primary-500/30', emoji: '🎉' }

  const expiryTime = formData.isFlashDeal && formData.flashDealEndsAt
    ? new Date(formData.flashDealEndsAt)
    : new Date(formData.endTime)

  const audienceLabel = formData.targeting.minCheckIns >= 5
    ? 'VIP Guests (5+ check-ins)'
    : formData.targeting.followersOnly
      ? 'Your Followers'
      : 'Everyone'

  return (
    <div className="space-y-4">
      <p className="text-primary-400/70 text-sm">This is how your deal will appear to customers.</p>

      {/* Deal Card Preview */}
      <div className="bg-black/60 border border-primary-500/30 rounded-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-3">
              <h3 className="text-lg font-bold text-white leading-tight">{formData.title || 'Your Deal Name'}</h3>
              {formData.offer && (
                <p className="text-primary-500 font-semibold text-base mt-1">{formData.offer}</p>
              )}
              {formData.description && (
                <p className="text-white/50 text-sm mt-1 line-clamp-2">{formData.description}</p>
              )}
            </div>
            <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${typeInfo.bg} ${typeInfo.color}`}>
              {typeInfo.emoji} {typeInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/40 border-t border-white/10 pt-3">
            <span>⏰ Until {expiryTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <span>👥 {audienceLabel}</span>
            {formData.pointsReward > 0 && <span>⭐ +{formData.pointsReward} pts</span>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        {[
          { label: 'Deal type', value: typeInfo.label },
          { label: 'Runs',      value: formData.isFlashDeal
              ? `Now → ${new Date(formData.flashDealEndsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
              : formData.isRecurring
                ? `Every ${(formData.recurrencePattern.daysOfWeek || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`
                : `${new Date(formData.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} → ${new Date(formData.endTime).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}` },
          { label: 'Audience',  value: audienceLabel },
          { label: 'Location',  value: formData.targeting.locationBased ? `Within ${formData.targeting.radiusMiles} miles` : 'Anywhere' },
        ].map(row => (
          <div key={row.label} className="flex justify-between text-sm py-2 border-b border-white/5">
            <span className="text-white/40">{row.label}</span>
            <span className="text-white font-medium text-right max-w-[60%]">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Notification notice */}
      <div className="bg-gradient-to-r from-primary-500/15 to-cyan-500/15 border border-primary-500/30 rounded-xl p-4 flex items-start gap-3">
        <Bell className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary-500 flex items-center gap-1.5">
            Push notifications will fire <Zap className="w-3.5 h-3.5 text-yellow-400" />
          </p>
          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
            Customers matching your audience get a push notification the moment you publish.
          </p>
        </div>
      </div>
    </div>
  )
}
