'use client'

import { Sparkles, Clock, Zap, Calendar, Gift, Users, PartyPopper, Heart, X } from 'lucide-react'

export interface PromotionTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'time-based' | 'event' | 'loyalty' | 'special'
  defaultData: {
    title: string
    description: string
    type: string
    startTime?: string
    endTime?: string
    isFlashDeal?: boolean
    flashDealEndsAt?: string
    pointsReward?: number
    targeting?: {
      followersOnly?: boolean
      locationBased?: boolean
      radiusMiles?: number
      userSegments?: string[]
      minCheckIns?: number
      timeBased?: boolean
      timeWindow?: { start: string; end: string }
    }
  }
}

export const PROMOTION_TEMPLATES: PromotionTemplate[] = [
  {
    id: 'happy-hour',
    name: 'Happy Hour',
    description: 'Classic weekday happy hour (Mon-Fri, 4-7 PM)',
    icon: <Clock className="w-5 h-5" />,
    category: 'time-based',
    defaultData: {
      title: 'Happy Hour',
      description: 'Join us for discounted drinks and appetizers!',
      type: 'happy-hour',
      targeting: {
        followersOnly: false,
        locationBased: false,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: true,
        timeWindow: { start: '16:00', end: '19:00' }
      },
      pointsReward: 10
    }
  },
  {
    id: 'weekend-special',
    name: 'Weekend Special',
    description: 'All-day weekend promotion (Fri-Sun)',
    icon: <Calendar className="w-5 h-5" />,
    category: 'time-based',
    defaultData: {
      title: 'Weekend Special',
      description: 'Special deals all weekend long!',
      type: 'special',
      targeting: {
        followersOnly: false,
        locationBased: false,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 15
    }
  },
  {
    id: 'flash-deal',
    name: 'Flash Deal',
    description: 'Time-limited deal (2 hours)',
    icon: <Zap className="w-5 h-5" />,
    category: 'special',
    defaultData: {
      title: 'Flash Deal',
      description: 'Limited time offer - act fast!',
      type: 'flash-deal',
      isFlashDeal: true,
      targeting: {
        followersOnly: true,
        locationBased: true,
        radiusMiles: 5,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 25
    }
  },
  {
    id: 'vip-exclusive',
    name: 'VIP Exclusive',
    description: 'Exclusive promotion for VIP customers',
    icon: <Gift className="w-5 h-5" />,
    category: 'loyalty',
    defaultData: {
      title: 'VIP Exclusive Offer',
      description: 'Special deal just for our VIP members!',
      type: 'exclusive',
      targeting: {
        followersOnly: true,
        locationBased: false,
        userSegments: ['vip'],
        minCheckIns: 10,
        timeBased: false
      },
      pointsReward: 50
    }
  },
  {
    id: 'new-customer',
    name: 'New Customer Welcome',
    description: 'Welcome offer for first-time visitors',
    icon: <Users className="w-5 h-5" />,
    category: 'loyalty',
    defaultData: {
      title: 'Welcome! First Visit Special',
      description: 'Special offer for new customers',
      type: 'special',
      targeting: {
        followersOnly: false,
        locationBased: false,
        userSegments: ['new'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 20
    }
  },
  {
    id: 'birthday',
    name: 'Birthday Special',
    description: 'Birthday celebration promotion',
    icon: <PartyPopper className="w-5 h-5" />,
    category: 'event',
    defaultData: {
      title: 'Birthday Special',
      description: 'Celebrate your birthday with us!',
      type: 'birthday',
      targeting: {
        followersOnly: false,
        locationBased: false,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 30
    }
  },
  {
    id: 'anniversary',
    name: 'Anniversary Special',
    description: 'Anniversary celebration promotion',
    icon: <Heart className="w-5 h-5" />,
    category: 'event',
    defaultData: {
      title: 'Anniversary Special',
      description: 'Celebrate your special day with us!',
      type: 'anniversary',
      targeting: {
        followersOnly: false,
        locationBased: false,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 30
    }
  },
  {
    id: 'event',
    name: 'Event Promotion',
    description: 'Promotion for special events',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'event',
    defaultData: {
      title: 'Special Event',
      description: 'Join us for this special event!',
      type: 'event',
      targeting: {
        followersOnly: true,
        locationBased: true,
        radiusMiles: 10,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      pointsReward: 20
    }
  }
]

interface PromotionTemplatesProps {
  onSelectTemplate: (template: PromotionTemplate) => void
  onClose: () => void
}

export default function PromotionTemplates({ onSelectTemplate, onClose }: PromotionTemplatesProps) {
  const categories = ['time-based', 'event', 'loyalty', 'special'] as const
  const categoryLabels: Record<string, string> = {
    'time-based': 'Time-Based',
    'event': 'Events',
    'loyalty': 'Loyalty',
    'special': 'Special Offers'
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-primary-500/30 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-primary-500 mb-2">Choose a Template</h2>
              <p className="text-primary-400 text-sm">Start with a template or create from scratch</p>
            </div>
            <button
              onClick={onClose}
              className="text-primary-400 hover:text-primary-500 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Template Grid */}
          <div className="space-y-6">
            {categories.map((category) => {
              const templates = PROMOTION_TEMPLATES.filter(t => t.category === category)
              if (templates.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-primary-500 mb-3">
                    {categoryLabels[category]}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="text-left p-4 bg-black/40 border border-primary-500/15 rounded-lg hover:border-primary-500/40 hover:bg-black/60 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-primary-500 mb-1 group-hover:text-primary-400 transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs text-primary-400/70 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Create from Scratch Option */}
          <div className="mt-6 pt-6 border-t border-primary-500/20">
            <button
              onClick={() => onSelectTemplate(null as any)}
              className="w-full p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg hover:bg-primary-500/20 hover:border-primary-500/40 transition-all text-primary-500 font-medium"
            >
              Create from Scratch
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

