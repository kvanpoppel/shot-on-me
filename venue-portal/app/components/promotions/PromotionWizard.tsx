'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { PromotionTemplate } from './PromotionTemplates'

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

const DEAL_TYPES = [
  { value: 'happy-hour',  emoji: '\u{1F37A}', label: 'Happy Hour',    desc: 'Discounted drinks for a set window' },
  { value: 'flash-deal',  emoji: '\u26A1',     label: 'Flash Deal',    desc: 'Limited-time urgent offer' },
  { value: 'special',     emoji: '\u{1F389}', label: 'Special',       desc: 'Featured food or drink item' },
  { value: 'exclusive',   emoji: '\u{1F451}', label: 'VIP Exclusive', desc: 'For your top customers only' },
  { value: 'event',       emoji: '\u{1F3AA}', label: 'Event',         desc: 'Live music, trivia, themed night' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0] // Mon=1 .. Sun=0

function buildDefaults(
  initialData?: Partial<PromotionFormData>,
  template?: PromotionTemplate | null,
): PromotionFormData {
  const now = new Date()
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 3)

  const base: PromotionFormData = {
    title: '', description: '', offer: '', type: 'happy-hour',
    startTime: start.toISOString().slice(0, 16),
    endTime: end.toISOString().slice(0, 16),
    daysOfWeek: [], isFlashDeal: false, flashDealEndsAt: '',
    pointsReward: 0, isRecurring: false,
    recurrencePattern: { type: 'weekly', frequency: 1, daysOfWeek: [], endDate: '', maxOccurrences: 12 },
    targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false, timeWindow: { start: '', end: '' } },
  }

  if (template?.defaultData) {
    return {
      ...base,
      title: template.defaultData.title || '',
      description: template.defaultData.description || '',
      offer: (template.defaultData as any).offer || '',
      type: template.defaultData.type || 'happy-hour',
      startTime: template.defaultData.startTime || base.startTime,
      endTime: template.defaultData.endTime || base.endTime,
      isFlashDeal: template.defaultData.isFlashDeal || false,
      flashDealEndsAt: template.defaultData.flashDealEndsAt || '',
      pointsReward: template.defaultData.pointsReward || 0,
      targeting: { ...base.targeting, ...template.defaultData.targeting },
    }
  }

  if (initialData) {
    return {
      ...base, ...initialData,
      offer: (initialData as any).offer || '',
      targeting: { ...base.targeting, ...(initialData.targeting || {}) },
    }
  }

  return base
}

export default function PromotionWizard({ initialData, template, onSave, onCancel, isEditing = false }: PromotionWizardProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<PromotionFormData>(() => buildDefaults(initialData, template))
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>(
    formData.type === 'flash-deal' ? 'now' : 'scheduled',
  )
  const [durationMins, setDurationMins] = useState<number | null>(null)

  const update = (u: Partial<PromotionFormData>) => setFormData(p => ({ ...p, ...u }))

  const canNext = () => {
    if (step === 1) return formData.title.trim() !== '' && formData.type !== ''
    if (step === 2) {
      if (scheduleMode === 'now') return durationMins !== null
      return formData.startTime !== '' && formData.endTime !== ''
    }
    return true
  }

  const handlePublish = async (draft = false) => {
    // Apply "Right Now" timing
    if (scheduleMode === 'now' && durationMins) {
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

  const typeInfo = DEAL_TYPES.find(d => d.value === formData.type) || DEAL_TYPES[0]

  // ── Step dots ──
  const dots = (
    <div className="flex items-center justify-center gap-2 py-3">
      {[1, 2, 3].map(s => (
        <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${
          s < step ? 'bg-primary-500' : s === step ? 'bg-primary-500 scale-125' : 'bg-white/20'
        }`} />
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-primary-500/20 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-base font-bold text-white">{isEditing ? 'Edit Deal' : 'New Deal'}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {dots}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">What are you offering?</p>

              {DEAL_TYPES.map(dt => (
                <button key={dt.value} type="button" onClick={() => {
                  update({ type: dt.value, isFlashDeal: dt.value === 'flash-deal' })
                  if (dt.value === 'flash-deal') setScheduleMode('now')
                }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition-all ${
                    formData.type === dt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-primary-500/20 bg-black/60 hover:border-primary-500/40'
                  }`}
                >
                  <span className="text-2xl">{dt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{dt.label}</p>
                    <p className="text-xs text-white/40">{dt.desc}</p>
                  </div>
                  {formData.type === dt.value && <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                </button>
              ))}

              <div>
                <label className="block text-xs font-semibold text-primary-500 mb-1.5">Deal Name *</label>
                <input type="text" value={formData.title} onChange={e => update({ title: e.target.value })}
                  placeholder="e.g. Tito's Tuesday Special"
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm focus:border-primary-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary-500 mb-1.5">What's the offer?</label>
                <input type="text" value={formData.offer} onChange={e => update({ offer: e.target.value })}
                  placeholder="e.g. $5 wells, BOGO shots"
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm focus:border-primary-500 focus:outline-none" />
                <p className="text-[11px] text-white/30 mt-1">This is what customers see on the deal card</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary-500 mb-1.5">Details <span className="text-white/30 font-normal">(optional)</span></label>
                <textarea value={formData.description} onChange={e => update({ description: e.target.value })}
                  placeholder="Fine print, exclusions, extra info..."
                  rows={2}
                  className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white placeholder-white/25 text-sm resize-none focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">When does it run?</p>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                {(['now', 'scheduled'] as const).map(m => (
                  <button key={m} type="button"
                    onClick={() => { setScheduleMode(m); setDurationMins(null) }}
                    disabled={formData.type === 'flash-deal' && m === 'scheduled'}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      scheduleMode === m
                        ? 'border-primary-500 bg-primary-500/10 text-white'
                        : 'border-primary-500/20 bg-black/60 text-white/40 hover:border-primary-500/40'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {m === 'now' ? 'Right Now' : 'Scheduled'}
                  </button>
                ))}
              </div>

              {/* Right Now — duration chips */}
              {scheduleMode === 'now' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-primary-500">How long?</label>
                  <div className="flex flex-wrap gap-2">
                    {(formData.type === 'flash-deal' ? [30, 60, 90, 120] : [60, 120, 180, 240, 360]).map(mins => (
                      <button key={mins} type="button" onClick={() => setDurationMins(mins)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          durationMins === mins
                            ? 'border-primary-500 bg-primary-500/10 text-white'
                            : 'border-primary-500/20 bg-black/60 text-white/40 hover:border-primary-500/40'
                        }`}
                      >
                        {mins < 60 ? `${mins}min` : `${mins / 60}hr`}
                      </button>
                    ))}
                  </div>
                  {durationMins && (
                    <p className="text-xs text-primary-400/60">
                      Starts immediately, ends in {durationMins < 60 ? `${durationMins} minutes` : `${durationMins / 60} hours`}
                    </p>
                  )}
                </div>
              )}

              {/* Scheduled */}
              {scheduleMode === 'scheduled' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary-500 mb-1.5">Start</label>
                    <input type="datetime-local" value={formData.startTime}
                      onChange={e => update({ startTime: e.target.value })}
                      className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary-500 mb-1.5">End</label>
                    <input type="datetime-local" value={formData.endTime}
                      min={formData.startTime}
                      onChange={e => update({ endTime: e.target.value })}
                      className="w-full px-4 py-3 bg-black/60 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500 focus:outline-none" />
                  </div>

                  {/* Recurring toggle */}
                  <div className="flex items-center justify-between bg-black/40 border border-primary-500/20 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Make it recurring</p>
                      <p className="text-[11px] text-white/30">Repeats every week on chosen days</p>
                    </div>
                    <button type="button" onClick={() => update({ isRecurring: !formData.isRecurring })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${formData.isRecurring ? 'bg-primary-500' : 'bg-white/20'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.isRecurring ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {formData.isRecurring && (
                    <div>
                      <label className="block text-xs font-semibold text-primary-500 mb-2">Which days?</label>
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
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">Preview your deal as customers will see it.</p>

              {/* Preview card */}
              <div className="bg-black/60 border border-primary-500/30 rounded-2xl p-5">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${
                  formData.type === 'flash-deal' ? 'bg-rose-500/20 text-rose-400' :
                  formData.type === 'exclusive' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-primary-500/20 text-primary-400'
                }`}>
                  {typeInfo.emoji} {typeInfo.label}
                </span>
                <h3 className="text-lg font-bold text-white">{formData.title || 'Deal Name'}</h3>
                {formData.offer && <p className="text-primary-500 font-semibold text-base mt-1">{formData.offer}</p>}
                {formData.description && <p className="text-white/40 text-sm mt-1">{formData.description}</p>}
                <div className="border-t border-white/10 mt-3 pt-3 text-xs text-white/40">
                  {scheduleMode === 'now' && durationMins
                    ? `Starts now \u00B7 ${durationMins < 60 ? `${durationMins}min` : `${durationMins / 60}hr`}`
                    : `${new Date(formData.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} \u2013 ${new Date(formData.endTime).toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`}
                  {formData.isRecurring && formData.recurrencePattern.daysOfWeek.length > 0 && (
                    <span>{' \u00B7 Every '}{formData.recurrencePattern.daysOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}</span>
                  )}
                </div>
              </div>

              {/* Summary rows */}
              <div className="space-y-1">
                {[
                  ['Type', typeInfo.label],
                  ['Runs', scheduleMode === 'now' ? 'Starts immediately' : `${new Date(formData.startTime).toLocaleDateString()}`],
                  ['Duration', scheduleMode === 'now' && durationMins
                    ? (durationMins < 60 ? `${durationMins} minutes` : `${durationMins / 60} hours`)
                    : (() => { const ms = new Date(formData.endTime).getTime() - new Date(formData.startTime).getTime(); const h = Math.round(ms / 3600000); return h > 0 ? `${h} hours` : 'Set above' })()],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>

              {/* Publish */}
              <button onClick={() => handlePublish(false)} disabled={saving}
                className="w-full py-3.5 bg-primary-500 text-black font-bold text-sm rounded-xl hover:bg-primary-400 transition-all disabled:opacity-40 min-h-[48px]">
                {saving ? 'Publishing...' : isEditing ? 'Save Changes' : 'Publish Deal'}
              </button>
              <button onClick={() => handlePublish(true)} disabled={saving}
                className="w-full py-2.5 text-white/40 text-sm font-medium hover:text-white/60 transition-colors">
                Save as Draft
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step < 3 && (
          <div className="px-5 py-3 border-t border-primary-500/10 flex items-center justify-between gap-3">
            <button onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
              className="flex items-center gap-1 px-4 py-3 bg-white/5 border border-white/10 text-white/50 rounded-xl text-sm min-h-[44px] hover:bg-white/10">
              {step === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" />Back</>}
            </button>
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-1 px-6 py-3 bg-primary-500 text-black rounded-xl text-sm font-bold min-h-[44px] hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="px-5 py-3 border-t border-primary-500/10">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2 text-white/40 text-sm hover:text-white/60">
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
