'use client'

import { useState } from 'react'
import { X, Lock, Sparkles, Pencil, Eye, Crown } from 'lucide-react'
import { PromotionTemplate } from './PromotionTemplates'
import { useFeatureAvailable } from '../FeatureGate'

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
  template?: PromotionTemplate | null
  onSave: (data: PromotionFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

const DEAL_TYPES = [
  { value: 'happy-hour', emoji: '🍻', label: 'Happy Hour' },
  { value: 'flash-deal', emoji: '⚡', label: 'Flash Deal' },
  { value: 'special',    emoji: '🎉', label: 'Special' },
  { value: 'exclusive',  emoji: '👑', label: 'VIP' },
  { value: 'event',      emoji: '🎪', label: 'Event' },
]

/* AI suggestions PER deal type — changes when you pick a type */
const AI_BY_TYPE: Record<string, { title: string; offer: string; desc: string }[]> = {
  'happy-hour': [
    { title: 'Happy Hour', offer: '$5 wells and drafts', desc: 'Classic happy hour pricing to fill seats early.' },
    { title: 'Two-for-Tuesday', offer: 'BOGO all cocktails', desc: 'Buy one get one drives groups.' },
    { title: 'Wine Down', offer: 'Half off all wines by the glass', desc: 'Wine drinkers love a deal.' },
  ],
  'flash-deal': [
    { title: 'Flash Deal', offer: '$3 shots for the next hour', desc: 'Short window creates urgency.' },
    { title: 'Power Hour', offer: '50% off all drinks for 60 minutes', desc: 'Time pressure fills the room fast.' },
    { title: 'Surprise Drop', offer: 'Free app with any drink order', desc: 'Unexpected value keeps people talking.' },
  ],
  'special': [
    { title: 'Weekend Special', offer: 'All-day 20% off food + drinks', desc: 'Weekend traffic wants value.' },
    { title: 'Date Night', offer: '2 entrees + bottle of wine for $60', desc: 'Couples love a packaged deal.' },
    { title: 'Industry Night', offer: 'Service workers get 30% off', desc: 'Build loyalty with locals.' },
  ],
  'exclusive': [
    { title: 'VIP Night', offer: 'Bottle service 25% off', desc: 'Premium spenders expect exclusivity.' },
    { title: 'Members Only', offer: 'Private tasting + reserved seating', desc: 'Followers-only creates buzz.' },
    { title: 'VIP Late Night', offer: 'Champagne toast + priority entry after 11pm', desc: 'Late crowd spends big.' },
  ],
  'event': [
    { title: 'Trivia Night', offer: 'Free entry + drink specials', desc: 'Trivia fills slow weeknights.' },
    { title: 'Live Music', offer: 'No cover + $4 drafts during show', desc: 'Music draws new faces.' },
    { title: 'Game Day', offer: '$5 pitchers during all games', desc: 'Sports crowds stay and spend.' },
  ],
}

const DURATIONS = [
  { mins: 60, label: '1hr' }, { mins: 120, label: '2hr' }, { mins: 180, label: '3hr' },
  { mins: 240, label: '4hr' }, { mins: 360, label: '6hr' },
]

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]

function buildDefaults(init?: Partial<PromotionFormData>, tmpl?: PromotionTemplate | null): PromotionFormData {
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
  if (tmpl?.defaultData) return { ...base, ...tmpl.defaultData, offer: (tmpl.defaultData as any).offer || '', targeting: { ...base.targeting, ...(tmpl.defaultData.targeting || {}) } }
  if (init) return { ...base, ...init, offer: (init as any).offer || '', targeting: { ...base.targeting, ...(init.targeting || {}) } }
  return base
}

export default function PromotionWizard({ initialData, template, onSave, onCancel, isEditing = false }: PromotionWizardProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<PromotionFormData>(() => buildDefaults(initialData, template))
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [durationMins, setDurationMins] = useState(120)
  const canRecur = useFeatureAvailable('growth')

  const update = (u: Partial<PromotionFormData>) => setFormData(p => ({ ...p, ...u }))

  // AI suggestions change with the selected type
  const suggestions = formData.type ? (AI_BY_TYPE[formData.type] || []) : []

  const applySuggestion = (s: { title: string; offer: string; desc: string }) => {
    update({ title: s.title, offer: s.offer, description: s.desc })
  }

  const canPublish = formData.type !== '' && formData.title.trim() !== '' && (scheduleMode === 'now' || (formData.startTime && formData.endTime))

  const handlePublish = async () => {
    const fd = { ...formData }
    if (scheduleMode === 'now') {
      const now = new Date()
      const end = new Date(now.getTime() + durationMins * 60000)
      fd.startTime = now.toISOString().slice(0, 16)
      fd.endTime = end.toISOString().slice(0, 16)
      if (fd.type === 'flash-deal') { fd.isFlashDeal = true; fd.flashDealEndsAt = fd.endTime }
    }
    setSaving(true)
    try { await onSave(fd) } catch (e) { console.error('Save error:', e) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-black border border-primary-500/20 rounded-2xl w-full max-w-lg my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-500/15">
          <h2 className="text-base font-bold text-white">{isEditing ? 'Edit Deal' : 'New Deal'}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-primary-400/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 pb-5 space-y-4 pt-4">

          {/* 1. Pick Type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-2">What type of deal?</p>
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
                  className={`px-3.5 py-2 rounded-full border text-sm font-semibold transition-all ${
                    formData.type === dt.value
                      ? 'border-primary-500 bg-primary-500/15 text-primary-400'
                      : 'border-primary-500/20 bg-black/40 text-primary-400/60 hover:border-primary-500/30'
                  }`}>
                  {dt.emoji} {dt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. AI Suggestions — appear when type is picked */}
          {suggestions.length > 0 && (
            <div className="rounded-xl border border-primary-500/15 bg-primary-500/[0.04] p-3">
              <p className="text-[10px] font-bold text-primary-500/60 flex items-center gap-1 mb-2"><Sparkles className="w-3 h-3" /> AI SUGGESTIONS</p>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => applySuggestion(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      formData.title === s.title && formData.offer === s.offer
                        ? 'border-primary-500/40 bg-primary-500/10'
                        : 'border-primary-500/10 bg-black/30 hover:border-primary-500/20'
                    }`}>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-[11px] text-primary-500/70">{s.offer}</p>
                    <p className="text-[10px] text-primary-400/40 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-primary-400/30 mt-2 text-center">Tap a suggestion or type your own below</p>
            </div>
          )}

          {/* 3. Deal Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-1.5">Deal Name *</label>
              <input type="text" value={formData.title} onChange={e => update({ title: e.target.value })}
                placeholder="e.g. Tito's Tuesday"
                className="w-full px-3.5 py-2.5 bg-black/50 border border-primary-500/20 rounded-xl text-white placeholder-primary-400/40 text-sm focus:border-primary-500/40 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-1.5">The Offer *</label>
              <input type="text" value={formData.offer} onChange={e => update({ offer: e.target.value })}
                placeholder="e.g. $5 wells, BOGO shots, 25% off bottles"
                className="w-full px-3.5 py-2.5 bg-black/50 border border-primary-500/20 rounded-xl text-white placeholder-primary-400/40 text-sm focus:border-primary-500/40 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-1.5">Details <span className="font-normal text-white/10">(optional)</span></label>
              <textarea value={formData.description} onChange={e => update({ description: e.target.value })}
                placeholder="Fine print, exclusions..." rows={2}
                className="w-full px-3.5 py-2.5 bg-black/50 border border-primary-500/20 rounded-xl text-white placeholder-primary-400/40 text-sm resize-none focus:border-primary-500/40 focus:outline-none" />
            </div>
          </div>

          {/* 4. Who sees this? */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-2">Who sees this?</p>
            <div className="grid grid-cols-2 gap-2">
              {([false, true] as const).map(val => (
                <button key={String(val)} type="button"
                  onClick={() => update({ targeting: { ...formData.targeting, followersOnly: val } })}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    formData.targeting.followersOnly === val
                      ? 'border-primary-500 bg-primary-500/10 text-white'
                      : 'border-primary-500/20 bg-black/40 text-primary-400/50 hover:border-primary-500/25'
                  }`}>
                  {val ? '🔒 Followers Only' : '🌍 Everyone'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/40">When?</p>
              {!canRecur && (
                <span className="flex items-center gap-1 text-[9px] text-primary-400/40">
                  <Lock className="w-2.5 h-2.5" /> Recurring deals available on Growth plan
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['now', 'later'] as const).map(m => (
                <button key={m} type="button" onClick={() => setScheduleMode(m)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    scheduleMode === m ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-primary-500/20 bg-black/40 text-primary-400/50 hover:border-primary-500/25'
                  }`}>
                  {m === 'now' ? 'Start Now' : 'Schedule'}
                </button>
              ))}
            </div>

            {scheduleMode === 'now' && (
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button key={d.mins} type="button" onClick={() => setDurationMins(d.mins)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      durationMins === d.mins ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-primary-500/20 bg-black/40 text-primary-400/50 hover:border-primary-500/25'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {scheduleMode === 'later' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-primary-400/40 mb-1">Start</label>
                  <input type="datetime-local" value={formData.startTime} onChange={e => update({ startTime: e.target.value })}
                    className="w-full px-3 py-2.5 bg-black/50 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-primary-400/40 mb-1">End</label>
                  <input type="datetime-local" value={formData.endTime} min={formData.startTime} onChange={e => update({ endTime: e.target.value })}
                    className="w-full px-3 py-2.5 bg-black/50 border border-primary-500/20 rounded-xl text-white text-sm focus:border-primary-500/40 focus:outline-none" />
                </div>
              </div>
            )}

            {/* Recurring — paywall warning shown upfront */}
            {!canRecur && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06]">
                <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-[11px] text-amber-300/80">Recurring deals require the <span className="font-bold text-amber-300">Growth plan</span>. Upgrade to automate weekly specials.</p>
              </div>
            )}
            <button type="button" onClick={() => canRecur && update({ isRecurring: !formData.isRecurring })}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border transition-all ${
                !canRecur ? 'border-primary-500/10 bg-black/30 cursor-not-allowed' :
                formData.isRecurring ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500/20 bg-black/40 hover:border-primary-500/25'
              }`}>
              {!canRecur && <Lock className="w-3.5 h-3.5 text-primary-400/40" />}
              <span className={`text-sm font-semibold ${canRecur ? 'text-white/60' : 'text-primary-400/40'}`}>Recurring</span>
              {!canRecur && <span className="text-[9px] text-primary-500/40 ml-auto">Growth plan</span>}
              {canRecur && (
                <div className={`ml-auto w-9 h-5 rounded-full transition-colors flex-shrink-0 ${formData.isRecurring ? 'bg-primary-500' : 'bg-white/15'}`}>
                  <span className={`block w-4 h-4 mt-0.5 ml-0.5 rounded-full bg-white transition-transform ${formData.isRecurring ? 'translate-x-4' : ''}`} />
                </div>
              )}
            </button>

            {formData.isRecurring && canRecur && (
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
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${on ? 'bg-primary-500 border-primary-500 text-black' : 'bg-black/40 border-primary-500/15 text-primary-400/50'}`}>
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 5. Who sees this? */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/40 mb-2">Who sees this?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => update({ targeting: { ...formData.targeting, followersOnly: false } })}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  !formData.targeting.followersOnly ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-primary-500/20 bg-black/40 text-primary-400/50 hover:border-primary-500/25'
                }`}>
                Everyone nearby
              </button>
              <button type="button" onClick={() => update({ targeting: { ...formData.targeting, followersOnly: true } })}
                className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  formData.targeting.followersOnly ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-primary-500/20 bg-black/40 text-primary-400/50 hover:border-primary-500/25'
                }`}>
                My followers only
              </button>
            </div>
          </div>

          {/* 6. Preview */}
          {formData.type && formData.title.trim() && (
            <div className="rounded-xl border border-primary-500/15 bg-black/40 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400/40 flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</p>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{DEAL_TYPES.find(dt => dt.value === formData.type)?.emoji || '🎉'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{formData.title}</p>
                  {formData.offer && <p className="text-xs text-primary-500/80 mt-0.5">{formData.offer}</p>}
                  {formData.description && <p className="text-[11px] text-primary-400/40 mt-1 line-clamp-2">{formData.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-[10px] text-primary-400/50">
                      {scheduleMode === 'now'
                        ? `Today · ${durationMins >= 60 ? `${Math.floor(durationMins / 60)}hr` : ''}${durationMins % 60 ? ` ${durationMins % 60}m` : ''} from now`
                        : formData.startTime && formData.endTime
                          ? `${new Date(formData.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(formData.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(formData.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          : 'Schedule not set'}
                    </span>
                    <span className="text-[10px] text-primary-400/40">
                      {formData.targeting.followersOnly ? '🔒 Followers only' : '🌐 Everyone'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. Publish */}
          <div className="pt-2 space-y-2">
            <button onClick={handlePublish} disabled={!canPublish || saving}
              className="w-full py-3.5 bg-primary-500 text-black font-bold text-sm rounded-xl hover:bg-primary-400 transition-all disabled:opacity-30 min-h-[48px]">
              {saving ? 'Publishing...' : isEditing ? 'Save Changes' : 'Publish Deal'}
            </button>
            <button onClick={onCancel} className="w-full py-2 text-primary-400/50 text-sm hover:text-primary-400/60">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  )
}
