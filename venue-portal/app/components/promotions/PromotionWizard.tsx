'use client'

import { useState, useMemo } from 'react'
import { X, Lock } from 'lucide-react'
import { PromotionTemplate } from './PromotionTemplates'
import { useFeatureAvailable } from '../FeatureGate'

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

const DEAL_TYPES = [
  { value: 'happy-hour',  emoji: '\u{1F37A}', label: 'Happy Hour' },
  { value: 'flash-deal',  emoji: '\u26A1',     label: 'Flash Deal' },
  { value: 'special',     emoji: '\u{1F389}', label: 'Special' },
  { value: 'exclusive',   emoji: '\u{1F451}', label: 'VIP' },
  { value: 'event',       emoji: '\u{1F3AA}', label: 'Event' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]

const DURATIONS = [
  { mins: 60, label: '1hr' },
  { mins: 120, label: '2hr' },
  { mins: 180, label: '3hr' },
  { mins: 240, label: '4hr' },
  { mins: 360, label: '6hr' },
]

function getAISuggestion(): { type: string; title: string; offer: string } | null {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const hour = now.getHours()

  if (hour >= 22) return { type: 'exclusive', title: 'Late Night VIP', offer: 'Bottle service 25% off until close' }
  if (day === 0) return { type: 'special', title: 'Sunday Funday', offer: 'Half off apps all day' }
  if (day === 6 && hour >= 17) return { type: 'flash-deal', title: 'Saturday Night Flash', offer: '$3 shots for the next 2 hours' }
  if (day === 5 && hour >= 15) return { type: 'happy-hour', title: 'Weekend Kickoff', offer: 'BOGO on all cocktails, 5-9 PM' }
  if (day >= 1 && day <= 4 && hour >= 12 && hour < 19) return { type: 'happy-hour', title: 'Happy Hour', offer: '$5 wells and drafts, 4-7 PM' }
  return null
}

function buildDefaults(
  initialData?: Partial<PromotionFormData>,
  template?: PromotionTemplate | null,
): PromotionFormData {
  const now = new Date()
  const start = new Date(now); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1)
  const end = new Date(start); end.setHours(end.getHours() + 3)

  const base: PromotionFormData = {
    title: '', description: '', offer: '', type: '',
    startTime: start.toISOString().slice(0, 16),
    endTime: end.toISOString().slice(0, 16),
    daysOfWeek: [], isFlashDeal: false, flashDealEndsAt: '',
    pointsReward: 0, isRecurring: false,
    recurrencePattern: { type: 'weekly', frequency: 1, daysOfWeek: [], endDate: '', maxOccurrences: 12 },
    targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false, timeWindow: { start: '', end: '' } },
  }

  if (template?.defaultData) {
    return { ...base, title: template.defaultData.title || '', description: template.defaultData.description || '', offer: (template.defaultData as any).offer || '', type: template.defaultData.type || '', startTime: template.defaultData.startTime || base.startTime, endTime: template.defaultData.endTime || base.endTime, isFlashDeal: template.defaultData.isFlashDeal || false, flashDealEndsAt: template.defaultData.flashDealEndsAt || '', pointsReward: template.defaultData.pointsReward || 0, targeting: { ...base.targeting, ...template.defaultData.targeting } }
  }
  if (initialData) {
    return { ...base, ...initialData, offer: (initialData as any).offer || '', targeting: { ...base.targeting, ...(initialData.targeting || {}) } }
  }
  return base
}

export default function PromotionWizard({ initialData, template, onSave, onCancel, isEditing = false }: PromotionWizardProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<PromotionFormData>(() => buildDefaults(initialData, template))
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [durationMins, setDurationMins] = useState(120)
  const canRecur = useFeatureAvailable('growth')
  const suggestion = useMemo(() => getAISuggestion(), [])

  const update = (u: Partial<PromotionFormData>) => setFormData(p => ({ ...p, ...u }))

  const applySuggestion = () => {
    if (!suggestion) return
    update({ type: suggestion.type, title: suggestion.title, offer: suggestion.offer, isFlashDeal: suggestion.type === 'flash-deal' })
  }

  const canPublish = formData.type !== '' && formData.title.trim() !== '' && (scheduleMode === 'now' || (formData.startTime && formData.endTime))

  const handlePublish = async () => {
    if (scheduleMode === 'now') {
      const now = new Date()
      const end = new Date(now.getTime() + durationMins * 60000)
      formData.startTime = now.toISOString().slice(0, 16)
      formData.endTime = end.toISOString().slice(0, 16)
      if (formData.type === 'flash-deal') {
        formData.isFlashDeal = true
        formData.flashDealEndsAt = formData.endTime
      }
    }
    setSaving(true)
    try { await onSave(formData) } catch (e) { console.error('Save error:', e) } finally { setSaving(false) }
  }

  const now = new Date()
  const dayLabel = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()]
  const timeLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-black border border-primary-500/20 rounded-2xl w-full max-w-lg my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-white">{isEditing ? 'Edit Deal' : 'New Deal'}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">

          {/* Section 1: Deal Type */}
          <div className="flex flex-wrap gap-2">
            {DEAL_TYPES.map(dt => (
              <button key={dt.value} type="button"
                onClick={() => update({ type: dt.value, isFlashDeal: dt.value === 'flash-deal' })}
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                  formData.type === dt.value
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-primary-500/20 bg-black/60 text-white/50 hover:border-primary-500/40'
                }`}
              >
                {dt.emoji} {dt.label}
              </button>
            ))}
          </div>

          {/* Section 2: AI Suggestion */}
          <div className="border-t border-primary-500/10 pt-4">
            {suggestion ? (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <p className="text-xs text-white/50 mb-1">Based on {dayLabel} at {timeLabel}, we suggest:</p>
                <p className="text-sm font-semibold text-white">{suggestion.title} &mdash; {suggestion.offer}</p>
                <button type="button" onClick={applySuggestion}
                  className="mt-2 px-4 py-1.5 bg-primary-500/20 border border-primary-500/40 rounded-lg text-xs font-bold text-primary-400 hover:bg-primary-500/30 transition-all">
                  Use this suggestion
                </button>
              </div>
            ) : (
              <p className="text-sm text-white/30">Fill in your deal below</p>
            )}
          </div>

          {/* Section 3: Deal Details */}
          <div className="border-t border-primary-500/10 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-primary-500 mb-1.5">Deal Name *</label>
              <input type="text" value={formData.title} onChange={e => update({ title: e.target.value })}
                placeholder="e.g. Tito's Tuesday Special"
                className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary-500 mb-1.5">What&apos;s the offer? *</label>
              <input type="text" value={formData.offer} onChange={e => update({ offer: e.target.value })}
                placeholder="e.g. $5 wells, BOGO shots"
                className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-primary-500 mb-1.5">Details <span className="text-white/30 font-normal">(optional)</span></label>
              <textarea value={formData.description} onChange={e => update({ description: e.target.value })}
                placeholder="Fine print, exclusions, extra info..."
                rows={2}
                className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm resize-none focus:border-primary-500 focus:outline-none" />
            </div>
          </div>

          {/* Section 4: Schedule */}
          <div className="border-t border-primary-500/10 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(['now', 'later'] as const).map(m => (
                <button key={m} type="button" onClick={() => setScheduleMode(m)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    scheduleMode === m
                      ? 'border-primary-500 bg-primary-500/10 text-white'
                      : 'border-primary-500/20 bg-black/60 text-white/40 hover:border-primary-500/40'
                  }`}
                >
                  {m === 'now' ? 'Start Now' : 'Schedule for Later'}
                </button>
              ))}
            </div>

            {scheduleMode === 'now' && (
              <div>
                <label className="block text-xs font-semibold text-primary-500 mb-1.5">Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.mins} type="button" onClick={() => setDurationMins(d.mins)}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        durationMins === d.mins
                          ? 'border-primary-500 bg-primary-500/10 text-white'
                          : 'border-primary-500/20 bg-black/60 text-white/40 hover:border-primary-500/40'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scheduleMode === 'later' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-primary-500 mb-1.5">Start</label>
                  <input type="datetime-local" value={formData.startTime}
                    onChange={e => update({ startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary-500 mb-1.5">End</label>
                  <input type="datetime-local" value={formData.endTime} min={formData.startTime}
                    onChange={e => update({ endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
              </div>
            )}

            {/* Recurring */}
            <button type="button"
              onClick={() => canRecur && update({ isRecurring: !formData.isRecurring })}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${
                !canRecur ? 'border-white/10 bg-black/30 cursor-not-allowed' :
                formData.isRecurring ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500/20 bg-black/60 hover:border-primary-500/40'
              }`}
            >
              {!canRecur && <Lock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
              <span className={`text-sm font-semibold ${canRecur ? 'text-white' : 'text-white/30'}`}>Recurring</span>
              {canRecur && (
                <div className={`ml-auto relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${formData.isRecurring ? 'bg-primary-500' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.isRecurring ? 'translate-x-4' : ''}`} />
                </div>
              )}
            </button>

            {formData.isRecurring && canRecur && (
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_NAMES.map((name, i) => {
                  const idx = DAY_INDICES[i]
                  const active = formData.recurrencePattern.daysOfWeek.includes(idx)
                  return (
                    <button key={name} type="button"
                      onClick={() => {
                        const days = active
                          ? formData.recurrencePattern.daysOfWeek.filter(d => d !== idx)
                          : [...formData.recurrencePattern.daysOfWeek, idx].sort()
                        update({ recurrencePattern: { ...formData.recurrencePattern, daysOfWeek: days } })
                      }}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        active
                          ? 'bg-primary-500 border-primary-500 text-black'
                          : 'bg-black/60 border-primary-500/20 text-white/40 hover:border-primary-500/40'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 5: Publish */}
          <div className="border-t border-primary-500/10 pt-4 space-y-2">
            <button onClick={handlePublish} disabled={!canPublish || saving}
              className="w-full py-3.5 bg-primary-500 text-black font-bold text-sm rounded-xl hover:bg-primary-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]">
              {saving ? 'Publishing...' : isEditing ? 'Save Changes' : 'Publish Deal'}
            </button>
            <button onClick={onCancel} className="w-full py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
