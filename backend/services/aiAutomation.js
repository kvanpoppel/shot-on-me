const Venue = require('../models/Venue')
const User = require('../models/User')
const Notification = require('../models/Notification')
const CheckIn = require('../models/CheckIn')

/**
 * AI Automation Service
 * Handles intelligent automation of venue operations
 */

/**
 * Analyze venue patterns and generate promotion suggestions
 */
async function generatePromotionSuggestions(venueId) {
  try {
    const venue = await Venue.findById(venueId).populate('owner')
    if (!venue) throw new Error('Venue not found')

    // Get historical data
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)

    const [checkIns, venueData] = await Promise.all([
      CheckIn.find({ venue: venueId, createdAt: { $gte: last30Days } }),
      Venue.findById(venueId).select('promotions')
    ])
    
    // Filter promotions from last 30 days
    const promotions = (venueData?.promotions || []).filter(p => {
      const promoDate = p.createdAt || p.startTime || new Date(0)
      return promoDate >= last30Days
    })
    
    // Get redemptions (we'll use analytics data)
    const redemptions = promotions.filter(p => p.analytics?.redemptions > 0)

    // Analyze patterns
    const dayOfWeekActivity = analyzeDayOfWeekActivity(checkIns)
    const timeOfDayActivity = analyzeTimeOfDayActivity(checkIns)
    const promotionPerformance = analyzePromotionPerformance(promotions, redemptions)
    const currentDay = new Date().getDay()
    const currentHour = new Date().getHours()

    // Generate intelligent suggestions
    const suggestions = []

    // 1. Time-based suggestions
    const slowDays = findSlowDays(dayOfWeekActivity)
    if (slowDays.length > 0) {
      suggestions.push({
        type: 'slow-day-boost',
        priority: 'high',
        title: `Boost ${slowDays[0]} Traffic`,
        description: `${slowDays[0]}s are typically slower. Create a special promotion to drive traffic.`,
        suggestedPromotion: {
          title: `${slowDays[0]} Special`,
          description: `Special ${slowDays[0]} deal to bring in more customers`,
          discount: 20,
          type: 'special',
          startDate: getNextDayOfWeek(slowDays[0]),
          endDate: getNextDayOfWeek(slowDays[0]),
          startTime: '17:00',
          endTime: '22:00'
        },
        autoPost: true,
        confidence: 0.85
      })
    }

    // 2. Peak time optimization
    const peakHours = findPeakHours(timeOfDayActivity)
    if (peakHours.length > 0) {
      suggestions.push({
        type: 'peak-optimization',
        priority: 'medium',
        title: 'Optimize Peak Hours',
        description: `Your busiest hours are ${peakHours[0]}-${peakHours[1]}. Consider a happy hour promotion.`,
        suggestedPromotion: {
          title: 'Happy Hour Special',
          description: 'Enjoy great deals during peak hours',
          discount: 15,
          type: 'happy-hour',
          startTime: peakHours[0],
          endTime: peakHours[1],
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        autoPost: true,
        confidence: 0.80
      })
    }

    // 3. Replicate successful promotions
    const topPromotions = promotionPerformance
      .filter(p => p.redemptionRate > 0.3)
      .sort((a, b) => b.redemptionRate - a.redemptionRate)
      .slice(0, 2)

    topPromotions.forEach(promo => {
      suggestions.push({
        type: 'replicate-success',
        priority: 'high',
        title: `Replicate "${promo.title}"`,
        description: `This promotion had ${(promo.redemptionRate * 100).toFixed(0)}% redemption rate. Create a similar one.`,
        suggestedPromotion: {
          ...promo,
          title: `${promo.title} (New)`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        },
        autoPost: true,
        confidence: 0.90
      })
    })

    // 4. Seasonal/Event-based suggestions
    const seasonalSuggestion = generateSeasonalSuggestion()
    if (seasonalSuggestion) {
      suggestions.push(seasonalSuggestion)
    }

    // 5. Customer retention
    const inactiveDays = daysSinceLastCheckIn(checkIns)
    if (inactiveDays > 3) {
      suggestions.push({
        type: 'retention',
        priority: 'high',
        title: 'Re-engage Customers',
        description: `It's been ${inactiveDays} days since last check-in. Send a special offer to bring customers back.`,
        suggestedPromotion: {
          title: 'We Miss You!',
          description: 'Come back and enjoy a special discount',
          discount: 25,
          type: 'special',
          targetAudience: 'returning-customers'
        },
        autoPost: true,
        autoNotify: true,
        confidence: 0.75
      })
    }

    return {
      suggestions,
      insights: {
        averageCheckIns: checkIns.length / 30,
        bestPerformingDay: Object.keys(dayOfWeekActivity).reduce((a, b) => 
          dayOfWeekActivity[a] > dayOfWeekActivity[b] ? a : b
        ),
        peakHours: peakHours,
        topPromotionType: promotionPerformance[0]?.type || 'happy-hour'
      }
    }
  } catch (error) {
    console.error('Error generating promotion suggestions:', error)
    throw error
  }
}

/**
 * Auto-generate and post a promotion based on AI suggestions
 */
async function autoGenerateAndPostPromotion(venueId, suggestion) {
  try {
    const venue = await Venue.findById(venueId)
    if (!venue) throw new Error('Venue not found')

    const suggestedPromo = suggestion.suggestedPromotion
    const startDate = suggestedPromo.startDate ? new Date(suggestedPromo.startDate) : new Date()
    const endDate = suggestedPromo.endDate ? new Date(suggestedPromo.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const promotion = {
      title: suggestedPromo.title,
      description: suggestedPromo.description,
      discount: suggestedPromo.discount,
      type: suggestedPromo.type,
      startTime: startDate,
      endTime: endDate,
      isActive: true,
      autoGenerated: true,
      aiConfidence: suggestion.confidence,
      schedule: (suggestedPromo.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).map(day => ({
        days: day,
        start: suggestedPromo.startTime || '17:00',
        end: suggestedPromo.endTime || '22:00'
      }))
    }

    venue.promotions.push(promotion)
    await venue.save()
    
    // Return the created promotion (last one in array)
    const createdPromotion = venue.promotions[venue.promotions.length - 1]

    // Auto-send notification if enabled
    if (suggestion.autoNotify) {
      await autoSendNotification(venueId, createdPromotion._id, 'new-promotion')
    }

    return { promotion: createdPromotion, _id: createdPromotion._id }
  } catch (error) {
    console.error('Error auto-generating promotion:', error)
    throw error
  }
}

/**
 * Auto-send intelligent notifications
 */
async function autoSendNotification(venueId, promotionId, type) {
  try {
    const venue = await Venue.findById(venueId).populate('owner')
    if (!venue) return

    // Find promotion in venue's promotions array
    const promotion = venue.promotions.id(promotionId)
    if (!promotion) return

    // Determine optimal send time
    const optimalTime = calculateOptimalNotificationTime(venueId)
    const sendAt = new Date(optimalTime)

    // Get target audience
    const targetAudience = await getTargetAudience(venueId, promotion)

    const notification = new Notification({
      venue: venueId,
      promotion: promotionId,
      type: type,
      title: generateNotificationTitle(promotion, type),
      message: generateNotificationMessage(promotion, type),
      targetAudience: targetAudience,
      sendAt: sendAt,
      autoGenerated: true
    })

    await notification.save()
    return notification
  } catch (error) {
    console.error('Error auto-sending notification:', error)
    throw error
  }
}

/**
 * Process all pending AI suggestions and auto-post high-confidence ones
 */
async function processAutoSuggestions(venueId, autoPostThreshold = 0.85) {
  try {
    const { suggestions } = await generatePromotionSuggestions(venueId)
    
    const autoPosted = []
    const pending = []

    for (const suggestion of suggestions) {
      if (suggestion.autoPost && suggestion.confidence >= autoPostThreshold) {
        try {
          const promotion = await autoGenerateAndPostPromotion(venueId, suggestion)
          autoPosted.push({
            suggestion,
            promotion: promotion._id
          })
        } catch (error) {
          console.error('Error auto-posting suggestion:', error)
        }
      } else {
        pending.push(suggestion)
      }
    }

    return {
      autoPosted,
      pending,
      total: suggestions.length
    }
  } catch (error) {
    console.error('Error processing auto-suggestions:', error)
    throw error
  }
}

// Helper functions

function analyzeDayOfWeekActivity(checkIns) {
  const activity = {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  }

  checkIns.forEach(checkIn => {
    const day = new Date(checkIn.createdAt).toLocaleDateString('en-US', { weekday: 'lowercase' })
    if (activity[day] !== undefined) {
      activity[day]++
    }
  })

  return activity
}

function analyzeTimeOfDayActivity(checkIns) {
  const hourlyActivity = Array(24).fill(0)

  checkIns.forEach(checkIn => {
    const hour = new Date(checkIn.createdAt).getHours()
    hourlyActivity[hour]++
  })

  return hourlyActivity
}

function analyzePromotionPerformance(promotions, redemptions) {
  return promotions.map(promo => {
    const promoRedemptions = redemptions.filter(r => 
      r._id.toString() === promo._id.toString()
    )
    const views = promo.views || 0
    const redemptionCount = promoRedemptions.length

    return {
      _id: promo._id,
      title: promo.title,
      type: promo.type,
      redemptionRate: views > 0 ? redemptionCount / views : 0,
      redemptionCount,
      views
    }
  })
}

function findSlowDays(dayActivity) {
  const avg = Object.values(dayActivity).reduce((a, b) => a + b, 0) / 7
  return Object.keys(dayActivity).filter(day => dayActivity[day] < avg * 0.7)
}

function findPeakHours(hourlyActivity) {
  const maxHour = hourlyActivity.indexOf(Math.max(...hourlyActivity))
  return [`${maxHour}:00`, `${(maxHour + 2) % 24}:00`]
}

function daysSinceLastCheckIn(checkIns) {
  if (checkIns.length === 0) return 999
  const lastCheckIn = new Date(Math.max(...checkIns.map(c => new Date(c.createdAt))))
  const now = new Date()
  return Math.floor((now - lastCheckIn) / (1000 * 60 * 60 * 24))
}

function getNextDayOfWeek(dayName) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const targetDay = days.indexOf(dayName.toLowerCase())
  const today = new Date()
  const currentDay = today.getDay()
  const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7
  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntilTarget)
  return nextDate
}

function generateSeasonalSuggestion() {
  const month = new Date().getMonth()
  const day = new Date().getDate()

  // Holiday suggestions
  if (month === 11 && day >= 20) { // December
    return {
      type: 'seasonal',
      priority: 'high',
      title: 'Holiday Special',
      description: 'Create a festive promotion for the holiday season',
      suggestedPromotion: {
        title: 'Holiday Celebration',
        description: 'Join us for special holiday deals',
        discount: 20,
        type: 'special',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      autoPost: true,
      confidence: 0.88
    }
  }

  // Weekend suggestions
  const dayOfWeek = new Date().getDay()
  if (dayOfWeek === 4) { // Thursday
    return {
      type: 'weekend-prep',
      priority: 'medium',
      title: 'Weekend Special',
      description: 'Prepare for the weekend with a special promotion',
      suggestedPromotion: {
        title: 'Weekend Deal',
        description: 'Great deals for the weekend',
        discount: 15,
        type: 'special',
        daysOfWeek: ['friday', 'saturday', 'sunday']
      },
      autoPost: true,
      confidence: 0.75
    }
  }

  return null
}

function calculateOptimalNotificationTime(venueId) {
  // Default to 2 hours before typical peak time
  const now = new Date()
  const optimalHour = 17 // 5 PM
  const sendTime = new Date(now)
  sendTime.setHours(optimalHour - 2, 0, 0, 0)
  
  // If that time has passed today, schedule for tomorrow
  if (sendTime < now) {
    sendTime.setDate(sendTime.getDate() + 1)
  }

  return sendTime
}

async function getTargetAudience(venueId, promotion) {
  // Get recent check-ins to target returning customers
  const recentCheckIns = await CheckIn.find({ venue: venueId })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user')

  return {
    type: 'returning-customers',
    userIds: [...new Set(recentCheckIns.map(c => c.user._id.toString()))]
  }
}

function generateNotificationTitle(promotion, type) {
  if (type === 'new-promotion') {
    return `New ${promotion.type === 'happy-hour' ? 'Happy Hour' : 'Promotion'}: ${promotion.title}`
  }
  return promotion.title
}

function generateNotificationMessage(promotion, type) {
  if (type === 'new-promotion') {
    return `${promotion.description}. ${promotion.discount}% off! Valid ${formatPromotionSchedule(promotion)}.`
  }
  return promotion.description
}

function formatPromotionSchedule(promotion) {
  if (promotion.daysOfWeek && promotion.daysOfWeek.length < 7) {
    return `on ${promotion.daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}`
  }
  return 'daily'
}

module.exports = {
  generatePromotionSuggestions,
  autoGenerateAndPostPromotion,
  autoSendNotification,
  processAutoSuggestions
}
