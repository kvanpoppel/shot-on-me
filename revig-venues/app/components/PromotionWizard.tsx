'use client'

import { useState } from 'react'
import { X, Sparkles, Eye, Repeat } from 'lucide-react'

interface PromotionFormData {
  title: string; description: string; offer: string; type: string
  startTime: string; endTime: string; daysOfWeek: number[]
  isFlashDeal: boolean; flashDealEndsAt: string; pointsReward: number
  isRecurring: boolean
  recurrencePattern: { type: 'daily' | 'weekly' | 'monthly' | 'custom'; frequency: number; daysOfWeek: number[]; endDate: string; maxOccurrences?: number }
  targeting: { followersOnly: boolean; locationBased: boolean; radiusMiles: number; userSegments: string[]; minCheckIns: number; timeBased: boolean; timeWindow: { start: string; end: string } }
}

interface PromotionWizardProps {
  initialData?: Partial<PromotionFormData>
  onSave: (data: PromotionFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

const DEAL_TYPES = [
  { value: 'happy-hour', emoji: '🧋', label: 'Happy Hour' },
  { value: 'flash-deal', emoji: '⚡', label: 'Flash Deal' },
  { value: 'special',    emoji: '🎉', label: 'Special' },
  { value: 'exclusive',  emoji: '👑', label: 'VIP' },
  { value: 'event',      emoji: '🎪', label: 'Event' },
]

const AI_BY_TYPE: Record<string, { title: string; offer: string; desc: string }[]> = {
  'happy-hour': [
    { title: 'Happy Hour', offer: '$5 boba and iced drinks', desc: 'Classic happy hour pricing to fill seats early.' },
    { title: 'Two-for-Tuesday', offer: 'BOGO all smoothies', desc: 'Buy one get one drives groups.' },
    { title: 'Refresher Special', offer: 'Half off all fruit refreshers', desc: 'Refreshers are always a hit.' },
  ],
  'flash-deal': [
    { title: 'Flash Deal', offer: '$2 any small drink for 1 hour', desc: 'Short window creates urgency.' },
    { title: 'Power Hour', offer: '50% off everything for 60 minutes', desc: 'Time pressure fills the room fast.' },
    { title: 'Surprise Drop', offer: 'Free topping with any drink order', desc: 'Unexpected value keeps people talking.' },
  ],
  'special': [
    { title: 'Weekend Special', offer: 'All-day 20% off drinks + bites', desc: 'Weekend traffic wants value.' },
    { title: 'Study Break', offer: 'Student discount 30% off', desc: 'Perfect for campus locations.' },
    { title: 'Family Day', offer: 'Kids drink free with adult purchase', desc: 'Family-friendly brings groups.' },
  ],
  'exclusive': [
    { title: 'VIP Tasting', offer: 'Exclusive new menu preview', desc: 'Followers-only creates buzz.' },
    { title: 'Loyalty Reward', offer: 'Double points on all drinks', desc: 'Reward your regulars.' },
    { title: 'Private Event', offer: 'Reserved seating + custom drinks', desc: 'Premium experience.' },
  ],
  'event': [
    { title: 'Trivia Night', offer: 'Free entry + drink specials', desc: 'Trivia fills slow weeknights.' },
    { title: 'Live Music', offer: 'No cover + $3 drinks during show', desc: 'Music draws new faces.' },
    { title: 'Open Mic', offer: 'Free drink for performers', desc: 'Community engagement.' },
  ],
}

const DURATIONS = [
  { mins: 60, label: '1hr' }, { mins: 120, label: '2hr' }, { mins: 180, label: '3hr' },
  { mins: 240, label: '4hr' }, { mins: 360, label: '6hr' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]
const DAY_FULL: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

function buildDefaults(init?: Partial<PromotionFormData>): PromotionFormData {
  const now = new Date()
  const start = new Date(now); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1)
  const end = new Date(start); end.setHours(end.getHours() + 3)
  const base: PromotionFormData = {
    title: '', description: '', offer: '', type: '',
    startTime: start.toISOString().slice(0, 16), endTime: end.toISOString().slice(0, 16),
    daysOfWeek: [], isFlashDeal: false, flashDealEndsAt: '', pointsReward: 0, isRecurring: false,
    recurrencePattern: { type: 'weekly', frequency: 1, daysOfWeek: [], endDate: '', maxOccurrences: 12 },
    targeting: { followersOnly: false, locationBased: false, radiusMiles: 5, userSegments: ['all'], minCheckIns: 0, timeBased: false, timeWindow: { start: '', end: '' } },
  }
  if (init) return { ...base, ...init, offer: (init as any).offer || '', targeting: { ...base.targeting, ...(init.targeting || {}) } }
  return base
}

// Revig accent colors
const ACCENT = '#C8F135'
const ACCENT_BG = 'rgba(200,241,53,0.1)'
const ACCENT_BORDER = 'rgba(200,241,53,0.2)'
const BG_SURFACE = '#1C1C32'
const BG_INPUT = 'rgba(15,15,30,0.7)'

export default function PromotionWizard({ initialData, onSave, onCancel, isEditing = false }: PromotionWizardProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<PromotionFormData>(() => buildDefaults(initialData))
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later' | 'recurring'>('now')
  const [durationMins, setDurationMins] = useState(120)
  const [recurStartTime, setRecurStartTime] = useState('14:00')
  const [recurEndTime, setRecurEndTime] = useState('17:00')

  const update = (u: Partial<PromotionFormData>) => setFormData(p => ({ ...p, ...u }))
  const suggestions = formData.type ? (AI_BY_TYPE[formData.type] || []) : []
  const applySuggestion = (s: { title: string; offer: string; desc: string }) => {
    update({ title: s.title, offer: s.offer, description: s.desc })
  }

  const isRecurringMode = scheduleMode === 'recurring'
  const recurDaysSelected = formData.recurrencePattern.daysOfWeek.length > 0

  const canPublish = formData.type !== '' && formData.title.trim() !== '' && (
    scheduleMode === 'now' ||
    (scheduleMode === 'later' && formData.startTime && formData.endTime) ||
    (isRecurringMode && recurDaysSelected)
  )

  const handlePublish = async () => {
    const fd = { ...formData }
    if (scheduleMode === 'now') {
      const now = new Date()
      const end = new Date(now.getTime() + durationMins * 60000)
      fd.startTime = now.toISOString().slice(0, 16)
      fd.endTime = end.toISOString().slice(0, 16)
      if (fd.type === 'flash-deal') { fd.isFlashDeal = true; fd.flashDealEndsAt = fd.endTime }
    }
    if (isRecurringMode) {
      fd.isRecurring = true
      fd.recurrencePattern = { ...fd.recurrencePattern, type: 'weekly', frequency: 1 }
      const today = new Date()
      const [sh, sm] = recurStartTime.split(':').map(Number)
      const [eh, em] = recurEndTime.split(':').map(Number)
      const startDt = new Date(today); startDt.setHours(sh, sm, 0, 0)
      const endDt = new Date(today); endDt.setHours(eh, em, 0, 0)
      fd.startTime = startDt.toISOString().slice(0, 16)
      fd.endTime = endDt.toISOString().slice(0, 16)
    }
    setSaving(true)
    try { await onSave(fd) } catch (e) { console.error('Save error:', e) } finally { setSaving(false) }
  }

  const recurDayLabel = formData.recurrencePattern.daysOfWeek.sort((a, b) => a - b).map(d => DAY_FULL[d]).join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl w-full max-w-lg my-6" style={{ background: BG_SURFACE }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-base font-bold text-white">{isEditing ? 'Edit Deal' : 'New Deal'}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 pb-5 space-y-4 pt-4">

          {/* 1. Pick Type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">What type of deal?</p>
            <div className="flex flex-wrap gap-2">
              {DEAL_TYPES.map(dt => (
                <button key={dt.value} type="button"
                  onClick={() => {
                    const typeSuggestions = AI_BY_TYPE[dt.value] || []
                    const first = typeSuggestions[0]
                    update({
                      type: dt.value,
                      isFlashDeal: dt.value === 'flash-deal',
                      title: first ? first.title : '',
                      offer: first ? first.offer : '',
                      description: first ? first.desc : '',
                    })
                  }}
                  className="px-3.5 py-2 rounded-full border text-sm font-semibold transition-all"
                  style={{
                    borderColor: formData.type === dt.value ? ACCENT : 'rgba(255,255,255,0.1)',
                    background: formData.type === dt.value ? ACCENT_BG : 'rgba(0,0,0,0.3)',
                    color: formData.type === dt.value ? ACCENT : 'rgba(255,255,255,0.4)'
                  }}>
                  {dt.emoji} {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(200,241,53,0.04)', border: `1px solid ${ACCENT_BORDER}` }}>
              <p className="text-[10px] font-bold flex items-center gap-1 mb-2" style={{ color: 'rgba(200,241,53,0.6)' }}><Sparkles className="w-3 h-3" /> AI SUGGESTIONS</p>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => applySuggestion(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border transition-all"
                    style={{
                      borderColor: formData.title === s.title && formData.offer === s.offer ? 'rgba(200,241,53,0.3)' : 'rgba(255,255,255,0.05)',
                      background: formData.title === s.title && formData.offer === s.offer ? 'rgba(200,241,53,0.08)' : 'rgba(0,0,0,0.2)',
                    }}>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-[11px]" style={{ color: 'rgba(200,241,53,0.7)' }}>{s.offer}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Deal Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">Deal Name *</label>
              <input type="text" value={formData.title} onChange={e => update({ title: e.target.value })}
                placeholder="e.g. Boba Tuesday"
                className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-white/25 text-sm focus:outline-none"
                style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">The Offer *</label>
              <input type="text" value={formData.offer} onChange={e => update({ offer: e.target.value })}
                placeholder="e.g. $3 boba, BOGO smoothies, 25% off"
                className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-white/25 text-sm focus:outline-none"
                style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1.5">Details <span className="font-normal text-white/10">(optional)</span></label>
              <textarea value={formData.description} onChange={e => update({ description: e.target.value })}
                placeholder="Fine print, exclusions..." rows={2}
                className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-white/25 text-sm resize-none focus:outline-none"
                style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
            </div>
          </div>

          {/* 4. Schedule */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">When?</p>
            <div className="grid grid-cols-3 gap-2">
              {(['now', 'later', 'recurring'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => {
                    setScheduleMode(m)
                    update({ isRecurring: m === 'recurring' })
                  }}
                  className="py-2.5 rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: scheduleMode === m ? ACCENT : 'rgba(255,255,255,0.08)',
                    background: scheduleMode === m ? ACCENT_BG : 'rgba(0,0,0,0.3)',
                    color: scheduleMode === m ? '#fff' : 'rgba(255,255,255,0.35)'
                  }}>
                  {m === 'now' ? 'Start Now' : m === 'later' ? 'Schedule' : 'Recurring'}
                </button>
              ))}
            </div>

            {scheduleMode === 'now' && (
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button key={d.mins} type="button" onClick={() => setDurationMins(d.mins)}
                    className="px-4 py-2 rounded-xl border text-sm font-semibold transition-all"
                    style={{
                      borderColor: durationMins === d.mins ? ACCENT : 'rgba(255,255,255,0.08)',
                      background: durationMins === d.mins ? ACCENT_BG : 'rgba(0,0,0,0.3)',
                      color: durationMins === d.mins ? '#fff' : 'rgba(255,255,255,0.35)'
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {scheduleMode === 'later' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/30 mb-1">Start</label>
                  <input type="datetime-local" value={formData.startTime} onChange={e => update({ startTime: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-white text-sm focus:outline-none"
                    style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 mb-1">End</label>
                  <input type="datetime-local" value={formData.endTime} min={formData.startTime} onChange={e => update({ endTime: e.target.value })}
                    className="w-full px-3 py-2.5 border rounded-xl text-white text-sm focus:outline-none"
                    style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
                </div>
              </div>
            )}

            {isRecurringMode && (
              <div className="space-y-3">
                <p className="text-[10px] text-white/30">Pick the days this deal runs every week</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_NAMES.map((name, i) => {
                    const idx = DAY_INDICES[i]
                    const on = formData.recurrencePattern.daysOfWeek.includes(idx)
                    return (
                      <button key={name} type="button"
                        onClick={() => {
                          const days = on ? formData.recurrencePattern.daysOfWeek.filter(d => d !== idx) : [...formData.recurrencePattern.daysOfWeek, idx].sort()
                          update({ recurrencePattern: { ...formData.recurrencePattern, daysOfWeek: days } })
                        }}
                        className="py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{
                          background: on ? ACCENT : 'rgba(0,0,0,0.3)',
                          borderColor: on ? ACCENT : 'rgba(255,255,255,0.06)',
                          color: on ? '#0F0F1E' : 'rgba(255,255,255,0.35)'
                        }}>
                        {name}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/30 mb-1">Start time</label>
                    <input type="time" value={recurStartTime} onChange={e => setRecurStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl text-white text-sm focus:outline-none"
                      style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/30 mb-1">End time</label>
                    <input type="time" value={recurEndTime} onChange={e => setRecurEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl text-white text-sm focus:outline-none"
                      style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 mb-1">Runs until <span className="text-white/10">(leave blank = indefinitely)</span></label>
                  <input type="date" value={formData.recurrencePattern.endDate}
                    onChange={e => update({ recurrencePattern: { ...formData.recurrencePattern, endDate: e.target.value } })}
                    className="w-full px-3 py-2.5 border rounded-xl text-white text-sm focus:outline-none"
                    style={{ background: BG_INPUT, borderColor: ACCENT_BORDER }} />
                </div>
              </div>
            )}
          </div>

          {/* 5. Who sees this? */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Who sees this?</p>
            <div className="grid grid-cols-2 gap-2">
              {([false, true] as const).map(val => (
                <button key={String(val)} type="button"
                  onClick={() => update({ targeting: { ...formData.targeting, followersOnly: val } })}
                  className="py-2.5 rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: formData.targeting.followersOnly === val ? ACCENT : 'rgba(255,255,255,0.08)',
                    background: formData.targeting.followersOnly === val ? ACCENT_BG : 'rgba(0,0,0,0.3)',
                    color: formData.targeting.followersOnly === val ? '#fff' : 'rgba(255,255,255,0.35)'
                  }}>
                  {val ? '🔒 Followers Only' : '🌍 Everyone'}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Preview */}
          {formData.type && formData.title.trim() && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</p>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{DEAL_TYPES.find(dt => dt.value === formData.type)?.emoji || '🎉'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{formData.title}</p>
                  {formData.offer && <p className="text-xs mt-0.5" style={{ color: 'rgba(200,241,53,0.8)' }}>{formData.offer}</p>}
                  {formData.description && <p className="text-[11px] text-white/25 mt-1 line-clamp-2">{formData.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-[10px] text-white/30">
                      {isRecurringMode && recurDaysSelected
                        ? `Every ${recurDayLabel} · ${recurStartTime} – ${recurEndTime}`
                        : scheduleMode === 'now'
                          ? `Today · ${durationMins >= 60 ? `${Math.floor(durationMins / 60)}hr` : ''}${durationMins % 60 ? ` ${durationMins % 60}m` : ''}`
                          : formData.startTime && formData.endTime
                            ? `${new Date(formData.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(formData.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(formData.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                            : 'Not set'}
                    </span>
                    {isRecurringMode && <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#00D4FF' }}><Repeat className="w-2.5 h-2.5" /> Recurring</span>}
                    <span className="text-[10px] text-white/25">
                      {formData.targeting.followersOnly ? '🔒 Followers' : '🌐 Everyone'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. Publish */}
          <div className="pt-2 space-y-2">
            <button onClick={handlePublish} disabled={!canPublish || saving}
              className="w-full py-3.5 font-bold text-sm rounded-xl transition-all disabled:opacity-30 min-h-[48px]"
              style={{ background: ACCENT, color: '#0F0F1E' }}>
              {saving ? 'Publishing...' : isEditing ? 'Save Changes' : isRecurringMode ? 'Set Up Recurring Deal' : 'Publish Deal'}
            </button>
            <button onClick={onCancel} className="w-full py-2 text-white/30 text-sm hover:text-white/50">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  )
}
