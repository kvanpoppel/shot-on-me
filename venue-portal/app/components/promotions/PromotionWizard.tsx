'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Calendar, Target, Sparkles, Eye, X } from 'lucide-react'
import { PromotionTemplate } from './PromotionTemplates'

interface PromotionFormData {
  title: string
  description: string
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
  { id: 1, name: 'Basic Info', icon: <Sparkles className="w-4 h-4" /> },
  { id: 2, name: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
  { id: 3, name: 'Targeting', icon: <Target className="w-4 h-4" /> },
  { id: 4, name: 'Enhancements', icon: <Sparkles className="w-4 h-4" /> },
  { id: 5, name: 'Preview', icon: <Eye className="w-4 h-4" /> }
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
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const endDate = new Date(tomorrow)
    endDate.setHours(23, 59, 59)

    const defaultData: PromotionFormData = {
      title: '',
      description: '',
      type: 'happy-hour',
      startTime: now.toISOString().slice(0, 16),
      endTime: endDate.toISOString().slice(0, 16),
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
        maxOccurrences: 12
      },
      targeting: {
        followersOnly: false,
        locationBased: false,
        radiusMiles: 5,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false,
        timeWindow: { start: '', end: '' }
      }
    }

    // Initialize with template or existing data
    if (template?.defaultData) {
      return {
        ...defaultData,
        title: template.defaultData.title,
        description: template.defaultData.description || '',
        type: template.defaultData.type,
        startTime: template.defaultData.startTime || defaultData.startTime,
        endTime: template.defaultData.endTime || defaultData.endTime,
        isFlashDeal: template.defaultData.isFlashDeal || false,
        flashDealEndsAt: template.defaultData.flashDealEndsAt || '',
        pointsReward: template.defaultData.pointsReward || 0,
        targeting: {
          ...defaultData.targeting,
          ...template.defaultData.targeting
        }
      }
    }
    
    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        targeting: {
          ...defaultData.targeting,
          ...(initialData.targeting || {})
        }
      }
    }
    
    return defaultData
  })

  const updateFormData = (updates: Partial<PromotionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving promotion:', error)
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== '' && formData.type !== ''
      case 2:
        if (!formData.isRecurring) {
          return formData.startTime !== '' && formData.endTime !== ''
        } else {
          // For recurring, check pattern is valid
          if (formData.recurrencePattern.type === 'weekly') {
            return formData.startTime !== '' && 
                   formData.recurrencePattern.daysOfWeek && 
                   formData.recurrencePattern.daysOfWeek.length > 0
          } else if (formData.recurrencePattern.type === 'monthly') {
            return formData.startTime !== '' && 
                   formData.recurrencePattern.dayOfMonth !== undefined
          } else {
            return formData.startTime !== ''
          }
        }
      case 3:
      case 4:
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Progress */}
        <div className="p-6 border-b border-primary-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary-500">
              {isEditing ? 'Edit Promotion' : 'Create Promotion'}
            </h2>
            <button
              onClick={onCancel}
              className="text-primary-400 hover:text-primary-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep >= step.id
                        ? 'bg-primary-500 border-primary-500 text-black'
                        : 'bg-black border-primary-500/30 text-primary-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${
                    currentStep >= step.id ? 'text-primary-500' : 'text-primary-400/50'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary-500' : 'bg-primary-500/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <Step1BasicInfo formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <Step2Schedule formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <Step3Targeting formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && (
            <Step4Enhancements formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 5 && (
            <Step5Preview formData={formData} />
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="p-6 border-t border-primary-500/20 flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onCancel : prevStep}
            className="px-4 py-2 bg-black/40 border border-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-all"
          >
            {currentStep === 1 ? 'Cancel' : (
              <>
                <ChevronLeft className="w-4 h-4 inline mr-1" />
                Back
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {currentStep < STEPS.length ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-6 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !canProceed()}
                className="px-6 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? 'Saving...' : isEditing ? 'Update Promotion' : 'Create Promotion'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components
function Step1BasicInfo({ formData, updateFormData }: { formData: PromotionFormData, updateFormData: (updates: Partial<PromotionFormData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-4">Basic Information</h3>
        <p className="text-primary-400 text-sm mb-6">Start by giving your promotion a name and description</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary-500 mb-2">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
          placeholder="e.g., Happy Hour Special"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary-500 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 placeholder-primary-500/40 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
          placeholder="Describe your promotion..."
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary-500 mb-2">Type *</label>
        <select
          value={formData.type}
          onChange={(e) => updateFormData({ type: e.target.value })}
          className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
        >
          <option value="happy-hour" className="bg-black">Happy Hour</option>
          <option value="event" className="bg-black">Event</option>
          <option value="special" className="bg-black">Special</option>
          <option value="birthday" className="bg-black">Birthday</option>
          <option value="anniversary" className="bg-black">Anniversary</option>
          <option value="flash-deal" className="bg-black">Flash Deal</option>
          <option value="exclusive" className="bg-black">Exclusive</option>
        </select>
      </div>
    </div>
  )
}

function Step2Schedule({ formData, updateFormData }: { formData: PromotionFormData, updateFormData: (updates: Partial<PromotionFormData>) => void }) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  const toggleDayOfWeek = (day: number) => {
    const currentDays = formData.recurrencePattern.daysOfWeek || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort()
    updateFormData({
      recurrencePattern: {
        ...formData.recurrencePattern,
        daysOfWeek: newDays
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-4">Schedule</h3>
        <p className="text-primary-400 text-sm mb-6">When should this promotion be active?</p>
      </div>

      {/* Recurring Toggle */}
      <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => updateFormData({ isRecurring: e.target.checked })}
            className="w-5 h-5 rounded border-primary-500/30 bg-black/40 text-primary-500 focus:ring-primary-500/50"
          />
          <span className="text-primary-400 font-medium">Make this a recurring promotion</span>
        </label>
        {formData.isRecurring && (
          <p className="text-primary-500/60 text-xs mt-2 ml-8">
            This promotion will repeat automatically based on your pattern
          </p>
        )}
      </div>

      {/* One-Time Schedule */}
      {!formData.isRecurring && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">Start Time *</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => updateFormData({ startTime: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">End Time *</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => updateFormData({ endTime: e.target.value })}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              required
            />
          </div>
        </div>
      )}

      {/* Recurring Schedule */}
      {formData.isRecurring && (
        <div className="space-y-4">
          {/* Start Time (for first occurrence) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">First Start Time *</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => updateFormData({ startTime: e.target.value })}
                className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">Duration (hours) *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={(() => {
                  const start = new Date(formData.startTime)
                  const end = new Date(formData.endTime)
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                  return hours || 2
                })()}
                onChange={(e) => {
                  const hours = parseFloat(e.target.value) || 2
                  const start = new Date(formData.startTime)
                  const end = new Date(start)
                  end.setHours(end.getHours() + hours)
                  updateFormData({ endTime: end.toISOString().slice(0, 16) })
                }}
                className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
                required
              />
            </div>
          </div>

          {/* Recurrence Pattern */}
          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">Repeat Pattern *</label>
            <select
              value={formData.recurrencePattern.type}
              onChange={(e) => updateFormData({
                recurrencePattern: {
                  ...formData.recurrencePattern,
                  type: e.target.value as 'daily' | 'weekly' | 'monthly' | 'custom'
                }
              })}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
            >
              <option value="daily" className="bg-black">Daily</option>
              <option value="weekly" className="bg-black">Weekly</option>
              <option value="monthly" className="bg-black">Monthly</option>
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">
              Repeat Every {formData.recurrencePattern.type === 'daily' ? 'Days' : formData.recurrencePattern.type === 'weekly' ? 'Weeks' : 'Months'} *
            </label>
            <input
              type="number"
              min="1"
              value={formData.recurrencePattern.frequency}
              onChange={(e) => updateFormData({
                recurrencePattern: {
                  ...formData.recurrencePattern,
                  frequency: parseInt(e.target.value) || 1
                }
              })}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
            />
          </div>

          {/* Days of Week (for weekly) */}
          {formData.recurrencePattern.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">Days of Week *</label>
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDayOfWeek(index)}
                    className={`px-3 py-2 rounded-lg border transition-all ${
                      formData.recurrencePattern.daysOfWeek?.includes(index)
                        ? 'bg-primary-500 text-black border-primary-500'
                        : 'bg-black/40 border-primary-500/20 text-primary-400 hover:border-primary-500/50'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              {formData.recurrencePattern.daysOfWeek?.length === 0 && (
                <p className="text-primary-500/60 text-xs mt-2">Select at least one day</p>
              )}
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {formData.recurrencePattern.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">Day of Month *</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.recurrencePattern.dayOfMonth || new Date(formData.startTime).getDate()}
                onChange={(e) => updateFormData({
                  recurrencePattern: {
                    ...formData.recurrencePattern,
                    dayOfMonth: parseInt(e.target.value) || 1
                  }
                })}
                className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              />
            </div>
          )}

          {/* End Date or Max Occurrences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">End Date (optional)</label>
              <input
                type="date"
                value={formData.recurrencePattern.endDate}
                onChange={(e) => updateFormData({
                  recurrencePattern: {
                    ...formData.recurrencePattern,
                    endDate: e.target.value
                  }
                })}
                className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-500 mb-2">Max Occurrences (optional)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.recurrencePattern.maxOccurrences || 12}
                onChange={(e) => updateFormData({
                  recurrencePattern: {
                    ...formData.recurrencePattern,
                    maxOccurrences: parseInt(e.target.value) || 12
                  }
                })}
                className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/30"
              />
            </div>
          </div>

          {/* Preview of next occurrences */}
          {formData.recurrencePattern.daysOfWeek && formData.recurrencePattern.daysOfWeek.length > 0 && (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4">
              <p className="text-primary-400 text-sm mb-2">Next occurrences:</p>
              <div className="text-primary-500 text-xs space-y-1">
                {(() => {
                  const start = new Date(formData.startTime)
                  const occurrences: string[] = []
                  const days = formData.recurrencePattern.daysOfWeek || []
                  for (let i = 0; i < Math.min(5, days.length * 2); i++) {
                    const date = new Date(start)
                    date.setDate(date.getDate() + (i * 7))
                    if (days.includes(date.getDay())) {
                      occurrences.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
                    }
                  }
                  return occurrences.length > 0 ? occurrences.join(', ') : 'Select days to preview'
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Step3Targeting({ formData, updateFormData }: { formData: PromotionFormData, updateFormData: (updates: Partial<PromotionFormData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-4">Targeting</h3>
        <p className="text-primary-400 text-sm mb-6">Who should see this promotion?</p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.targeting.followersOnly}
            onChange={(e) => updateFormData({
              targeting: { ...formData.targeting, followersOnly: e.target.checked }
            })}
            className="w-5 h-5 rounded border-primary-500/30 bg-black/40 text-primary-500 focus:ring-primary-500/50"
          />
          <span className="text-primary-400">Followers Only</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.targeting.locationBased}
            onChange={(e) => updateFormData({
              targeting: { ...formData.targeting, locationBased: e.target.checked }
            })}
            className="w-5 h-5 rounded border-primary-500/30 bg-black/40 text-primary-500 focus:ring-primary-500/50"
          />
          <span className="text-primary-400">Location-Based (within radius)</span>
        </label>

        {formData.targeting.locationBased && (
          <div>
            <label className="block text-sm font-medium text-primary-500 mb-2">Radius (miles)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.targeting.radiusMiles}
              onChange={(e) => updateFormData({
                targeting: { ...formData.targeting, radiusMiles: parseInt(e.target.value) || 5 }
              })}
              className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-primary-500 mb-2">User Segments</label>
          <select
            multiple
            value={formData.targeting.userSegments}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              updateFormData({
                targeting: { ...formData.targeting, userSegments: selected }
              })
            }}
            className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500"
          >
            <option value="all" className="bg-black">All Users</option>
            <option value="frequent" className="bg-black">Frequent (5+ check-ins)</option>
            <option value="vip" className="bg-black">VIP (10+ check-ins)</option>
            <option value="new" className="bg-black">New (0-2 check-ins)</option>
          </select>
          <p className="text-xs text-primary-400/60 mt-1">Hold Ctrl/Cmd to select multiple</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-500 mb-2">Minimum Check-ins</label>
          <input
            type="number"
            min="0"
            value={formData.targeting.minCheckIns}
            onChange={(e) => updateFormData({
              targeting: { ...formData.targeting, minCheckIns: parseInt(e.target.value) || 0 }
            })}
            className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500"
          />
        </div>
      </div>
    </div>
  )
}

function Step4Enhancements({ formData, updateFormData }: { formData: PromotionFormData, updateFormData: (updates: Partial<PromotionFormData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-4">Enhancements</h3>
        <p className="text-primary-400 text-sm mb-6">Add special features to make your promotion stand out</p>
      </div>

      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.isFlashDeal}
          onChange={(e) => updateFormData({ isFlashDeal: e.target.checked })}
          className="w-5 h-5 rounded border-primary-500/30 bg-black/40 text-primary-500 focus:ring-primary-500/50"
        />
        <span className="text-primary-400">Flash Deal (time-limited)</span>
      </label>

      {formData.isFlashDeal && (
        <div>
          <label className="block text-sm font-medium text-primary-500 mb-2">Flash Deal Ends At</label>
          <input
            type="datetime-local"
            value={formData.flashDealEndsAt}
            onChange={(e) => updateFormData({ flashDealEndsAt: e.target.value })}
            className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-primary-500 mb-2">Points Reward</label>
        <input
          type="number"
          min="0"
          value={formData.pointsReward}
          onChange={(e) => updateFormData({ pointsReward: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 bg-black/40 border border-primary-500/20 rounded-lg text-primary-500"
          placeholder="0"
        />
        <p className="text-xs text-primary-400/60 mt-1">Points customers earn for using this promotion</p>
      </div>
    </div>
  )
}

function Step5Preview({ formData }: { formData: PromotionFormData }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-primary-500 mb-4">Preview</h3>
        <p className="text-primary-400 text-sm mb-6">Review your promotion before publishing</p>
      </div>

      {/* Mobile Preview */}
      <div className="max-w-sm mx-auto bg-black/60 border border-primary-500/30 rounded-2xl p-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-bold text-primary-500">{formData.title}</h4>
            <p className="text-sm text-primary-400 mt-1">{formData.description || 'No description'}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary-500/20 border border-primary-500/30 rounded-full text-xs text-primary-500 capitalize">
              {formData.type.replace('-', ' ')}
            </span>
            {formData.isFlashDeal && (
              <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-500">
                Flash Deal
              </span>
            )}
          </div>

          <div className="text-sm text-primary-400 space-y-1">
            <p>📅 {new Date(formData.startTime).toLocaleString()}</p>
            <p>⏰ Until {new Date(formData.endTime).toLocaleString()}</p>
            {formData.pointsReward > 0 && (
              <p>⭐ {formData.pointsReward} points reward</p>
            )}
          </div>

          <div className="pt-4 border-t border-primary-500/20">
            <p className="text-xs text-primary-400/70">Targeting:</p>
            <ul className="text-xs text-primary-400/60 mt-1 space-y-1">
              {formData.targeting.followersOnly && <li>• Followers only</li>}
              {formData.targeting.locationBased && <li>• Within {formData.targeting.radiusMiles} miles</li>}
              {formData.targeting.userSegments.length > 0 && (
                <li>• {formData.targeting.userSegments.join(', ')} users</li>
              )}
              {formData.targeting.minCheckIns > 0 && (
                <li>• Minimum {formData.targeting.minCheckIns} check-ins</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

