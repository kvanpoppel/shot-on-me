const Venue = require('../models/Venue')
const User = require('../models/User')
const Notification = require('../models/Notification')
const CheckIn = require('../models/CheckIn')
const Payment = require('../models/Payment')
const DailySales = require('../models/DailySales')
const { pushTargetedPromotionNotification } = require('../routes/venue-notifications')
const { getConfidenceMultiplier } = require('./aiLearningLoop')
const AutomationLog = require('../models/AutomationLog')

/**
 * AI Automation Service
 * Handles intelligent automation of venue operations
 */

/**
 * Analyze venue patterns and generate promotion suggestions
 */
async function generatePromotionSuggestions(venueId) {
  try {
    const venue = await Venue.findById(venueId).populate('owner').select('+aiLearning')
    if (!venue) throw new Error('Venue not found')
    const aiLearning = venue.aiLearning || {}

    // Get historical data
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    const startStr = last30Days.toISOString().split('T')[0]

    const [checkIns, venueData, payments, dailySales] = await Promise.all([
      CheckIn.find({ venue: venueId, createdAt: { $gte: last30Days } }),
      Venue.findById(venueId).select('promotions'),
      Payment.find({
        venueId,
        status: { $in: ['succeeded', 'redeemed'] },
        createdAt: { $gte: last30Days }
      }).lean(),
      DailySales.find({ venue: venueId, date: { $gte: startStr } }).lean()
    ])

    // Filter promotions from last 30 days
    const promotions = (venueData?.promotions || []).filter(p => {
      const promoDate = p.createdAt || p.startTime || new Date(0)
      return promoDate >= last30Days
    })

    // Get redemptions (we'll use analytics data)
    const redemptions = promotions.filter(p => p.analytics?.redemptions > 0)

    // Analyze patterns — checkins, payments, and logged sales
    const dayOfWeekActivity = analyzeDayOfWeekActivity(checkIns)
    const timeOfDayActivity = analyzeTimeOfDayActivity(checkIns)
    const promotionPerformance = analyzePromotionPerformance(promotions, redemptions)
    const revenueByDay = analyzeRevenueByDay(payments)
    const revenueByHour = analyzeRevenueByHour(payments)
    const salesTrend = analyzeSalesTrend(dailySales)
    const promotionRevenueLift = analyzePromotionRevenueLift(promotions, payments)

    // Generate intelligent suggestions
    const suggestions = []
    const venuePriceInsights = getVenuePriceInsights(venue, promotions)

    // 1. Slow-day boost — prefer revenue data, fall back to checkins
    const hasRevenueData = payments.length > 0
    const slowDays = hasRevenueData
      ? findSlowDaysFromRevenue(revenueByDay)
      : findSlowDays(dayOfWeekActivity)
    if (slowDays.length > 0) {
      const dayName = slowDays[0]
      const avgRev = hasRevenueData ? Math.round(Object.values(revenueByDay).reduce((a, b) => a + b, 0) / 7) : 0
      const dayRev = hasRevenueData ? Math.round(revenueByDay[dayName] || 0) : 0
      const desc = hasRevenueData
        ? `${capitalize(dayName)}s average $${dayRev} in revenue vs $${avgRev} overall. A targeted deal could close that gap.`
        : `${capitalize(dayName)}s are typically slower. Create a special promotion to drive traffic.`
      suggestions.push({
        type: 'slow-day-boost',
        priority: 'high',
        title: `Boost ${capitalize(dayName)} Revenue`,
        description: desc,
        suggestedPromotion: {
          title: `${capitalize(dayName)} Special`,
          description: `Special ${capitalize(dayName)} deal to bring in more customers`,
          discount: 20,
          pricePoint: buildPricePoint(venuePriceInsights, 20),
          type: 'special',
          startDate: getNextDayOfWeek(dayName),
          endDate: getNextDayOfWeek(dayName),
          startTime: '17:00',
          endTime: '22:00',
          daysOfWeek: [dayName.toLowerCase()]
        },
        autoPost: true,
        autoNotify: true,
        confidence: hasRevenueData ? 0.90 : 0.85
      })
    }

    // 2. Peak-hour optimization — use revenue hours when available
    const peakHours = hasRevenueData
      ? findPeakRevenueHours(revenueByHour)
      : findPeakHours(timeOfDayActivity)
    if (peakHours.length > 0) {
      suggestions.push({
        type: 'peak-optimization',
        priority: 'medium',
        title: 'Optimize Peak Hours',
        description: `Your highest-revenue hours are ${peakHours[0]}-${peakHours[1]}. A happy hour leading into this window could extend the rush.`,
        suggestedPromotion: {
          title: 'Happy Hour Special',
          description: 'Enjoy great deals during peak hours',
          discount: 15,
          pricePoint: buildPricePoint(venuePriceInsights, 15),
          type: 'happy-hour',
          startTime: peakHours[0],
          endTime: peakHours[1],
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        autoPost: true,
        autoNotify: true,
        confidence: hasRevenueData ? 0.85 : 0.80
      })
    }

    // 3. Replicate deals that actually drove revenue
    const topDeals = promotionRevenueLift.length > 0
      ? promotionRevenueLift
          .filter(p => p.revenueLift > 0)
          .sort((a, b) => b.revenueLift - a.revenueLift)
          .slice(0, 2)
      : []
    if (topDeals.length > 0) {
      topDeals.forEach(deal => {
        suggestions.push({
          type: 'replicate-success',
          priority: 'high',
          title: `Run "${deal.title}" Again`,
          description: `This deal brought in $${Math.round(deal.revenueDuring)} in transactions — ${deal.revenueLift > 0 ? `${Math.round(deal.revenueLift)}% above` : 'in line with'} your baseline.`,
          suggestedPromotion: {
            title: deal.title,
            description: deal.description || `Successful deal worth repeating`,
            discount: deal.discount || 20,
            pricePoint: buildPricePoint(venuePriceInsights, deal.discount || 20),
            type: deal.type || 'special',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          autoPost: true,
          autoNotify: true,
          confidence: 0.92
        })
      })
    } else {
      // Fall back to redemption-rate based replication
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
            pricePoint: buildPricePoint(venuePriceInsights, promo.discount || 20),
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          autoPost: true,
          autoNotify: true,
          confidence: 0.90
        })
      })
    }

    // 4. Revenue trend warning — declining logged sales
    if (salesTrend.direction === 'declining' && salesTrend.weekOverWeekChange < -15) {
      suggestions.push({
        type: 'revenue-trend',
        priority: 'high',
        title: 'Revenue Dipping — Time for a Deal',
        description: `Your logged sales are down ${Math.abs(Math.round(salesTrend.weekOverWeekChange))}% week over week. A flash deal could help turn things around.`,
        suggestedPromotion: {
          title: 'Flash Deal',
          description: 'Limited-time deal to drive traffic',
          discount: 25,
          pricePoint: buildPricePoint(venuePriceInsights, 25),
          type: 'flash-deal',
          isFlashDeal: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          startTime: '17:00',
          endTime: '22:00'
        },
        autoPost: true,
        autoNotify: true,
        confidence: 0.88
      })
    }

    // 5. Strong day — skip promos, save money
    if (hasRevenueData) {
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const todayRev = revenueByDay[todayName] || 0
      const avgRev = Object.values(revenueByDay).reduce((a, b) => a + b, 0) / 7
      if (todayRev > avgRev * 1.3 && suggestions.length > 0) {
        // Don't remove suggestions — just add context note
        suggestions.push({
          type: 'strong-day-note',
          priority: 'low',
          title: `${capitalize(todayName)}s Are Already Strong`,
          description: `${capitalize(todayName)}s average $${Math.round(todayRev)} — ${Math.round(((todayRev / avgRev) - 1) * 100)}% above your average. You may not need a deal today.`,
          suggestedPromotion: null,
          autoPost: false,
          autoNotify: false,
          confidence: 0.70
        })
      }
    }

    // 6. Real-time slow detection — "it's quiet RIGHT NOW, launch a flash deal"
    if (hasRevenueData) {
      const now = new Date()
      const currentHour = now.getHours()
      const todayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

      // Only trigger during business hours (11am - 11pm)
      if (currentHour >= 11 && currentHour <= 23) {
        // Count payments TODAY up to this hour
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const todayPayments = payments.filter(p => {
          const t = new Date(p.createdAt)
          return t >= todayStart && t <= now
        })
        const todayRevSoFar = todayPayments.reduce((s, p) => s + (p.amount || 0), 0)

        // Average revenue for this day-of-week up to this hour (from 30-day history)
        const sameDayPayments = payments.filter(p => {
          const t = new Date(p.createdAt)
          return t.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === todayName && t.getHours() <= currentHour
        })
        // Count how many of those same-day occurrences we have (divide by ~4 weeks)
        const weeksOfData = Math.max(1, Math.ceil(payments.length > 0 ? 4 : 1))
        const avgRevByNow = sameDayPayments.reduce((s, p) => s + (p.amount || 0), 0) / weeksOfData

        // Check if any deal is already running right now
        const hasActiveDeal = (venueData?.promotions || []).some(p => {
          if (!p.isActive) return false
          const start = p.startTime ? new Date(p.startTime) : null
          const end = p.endTime ? new Date(p.endTime) : null
          if (start && end) return now >= start && now <= end
          return p.isActive
        })

        // If today's revenue is < 50% of average AND no deal is running → suggest or auto-post flash deal
        if (avgRevByNow > 0 && todayRevSoFar < avgRevByNow * 0.5 && !hasActiveDeal) {
          const gap = Math.round(avgRevByNow - todayRevSoFar)
          const flashSuggestion = {
            type: 'slow-right-now',
            priority: 'urgent',
            title: "It's Quiet — Launch a Flash Deal?",
            description: `Today's revenue ($${Math.round(todayRevSoFar)}) is tracking ${Math.round((1 - todayRevSoFar / avgRevByNow) * 100)}% below your typical ${capitalize(todayName)}. A 1-2 hour flash deal could bring people in.`,
            suggestedPromotion: {
              title: 'Flash Deal — Right Now',
              description: 'Limited-time deal to drive traffic right now',
              discount: 25,
              pricePoint: buildPricePoint(venuePriceInsights, 25),
              type: 'flash-deal',
              isFlashDeal: true,
              startDate: new Date(),
              endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
              startTime: `${currentHour}:00`,
              endTime: `${Math.min(currentHour + 2, 23)}:00`
            },
            autoPost: true,
            autoNotify: true,
            confidence: 0.93
          }

          // Auto-post if automation is enabled — publish + notify without manual approval
          const autoSettings = venue.aiAutomation || {}
          if (autoSettings.enabled && autoSettings.autoGenerateSpecials !== false) {
            try {
              await autoGenerateAndPostPromotion(venueId, flashSuggestion, {
                autoNotifyFollowers: autoSettings.autoNotifyFollowers !== false,
              })
              flashSuggestion.autoPosted = true
              flashSuggestion.title = 'Flash Deal Auto-Published'
              flashSuggestion.description = `It was quiet so we launched a 2-hour flash deal and notified your followers.`

              // Log the automated action
              await AutomationLog.create({
                venue: venueId,
                action: 'auto_flash_deal',
                detail: `Slow ${capitalize(todayName)} detected — auto-published a 2-hour flash deal (25% off). Revenue was tracking ${Math.round((1 - todayRevSoFar / avgRevByNow) * 100)}% below average.`,
                promotionTitle: 'Flash Deal — Right Now',
              })
            } catch (autoErr) {
              console.error('Auto flash deal failed:', autoErr.message)
            }
          }

          suggestions.unshift(flashSuggestion)
        }
      }
    }

    // 7. Seasonal/Event-based suggestions
    const seasonalSuggestion = generateSeasonalSuggestion()
    if (seasonalSuggestion) {
      suggestions.push(seasonalSuggestion)
    }

    // 7. Customer retention
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

    // Apply AI learning multipliers to confidence scores
    const learnedSuggestions = suggestions.map(s => {
      const promoType = s.suggestedPromotion?.type || s.type || 'other'
      const multiplier = getConfidenceMultiplier(aiLearning, promoType)
      return {
        ...s,
        confidence: Math.min(0.99, Math.max(0.5, (s.confidence || 0.75) * multiplier)),
        learnedBoost: multiplier !== 1.0 ? multiplier : undefined
      }
    })

    // Sort by learned confidence descending
    learnedSuggestions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

    // Best revenue day (from payments) or best checkin day
    const bestRevenueDay = hasRevenueData
      ? Object.keys(revenueByDay).reduce((a, b) => revenueByDay[a] > revenueByDay[b] ? a : b)
      : null

    return {
      suggestions: learnedSuggestions,
      insights: {
        averageCheckIns: checkIns.length / 30,
        bestPerformingDay: bestRevenueDay || Object.keys(dayOfWeekActivity).reduce((a, b) =>
          dayOfWeekActivity[a] > dayOfWeekActivity[b] ? a : b
        ),
        peakHours: peakHours,
        topPromotionType: aiLearning.bestType || promotionPerformance[0]?.type || 'happy-hour',
        learnedBestDay: aiLearning.bestDay || null,
        learnedBestHour: aiLearning.bestHour ?? null,
        lastTrained: aiLearning.lastTrainedAt || null,
        hasRevenueData,
        totalPayments30d: payments.length,
        totalRevenue30d: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        salesTrend: salesTrend.direction,
        salesTrendPct: salesTrend.weekOverWeekChange
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
async function autoGenerateAndPostPromotion(venueId, suggestion, options = {}) {
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
      pricePoint: suggestedPromo.pricePoint,
      type: suggestedPromo.type,
      startTime: startDate,
      endTime: endDate,
      isActive: true,
      autoGenerated: true,
      aiConfidence: suggestion.confidence,
      targeting: {
        followersOnly: !!options.followersOnly,
        locationBased: false,
        radiusMiles: 5,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
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
    if (suggestion.autoNotify || options.autoNotifyFollowers) {
      await autoSendNotification(venueId, createdPromotion._id, 'new-promotion')
      await pushTargetedPromotionNotification(venueId, createdPromotion, null)
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

    const venue = await Venue.findById(venueId).select('aiAutomation')
    const maxPromotionsPerCycle = Math.max(1, venue?.aiAutomation?.maxPromotionsPerCycle || 2)
    let postedCount = 0

    for (const suggestion of suggestions) {
      if (suggestion.autoPost && suggestion.confidence >= autoPostThreshold) {
        if (postedCount >= maxPromotionsPerCycle) {
          pending.push(suggestion)
          continue
        }

        try {
          const promotion = await autoGenerateAndPostPromotion(venueId, suggestion, {
            autoNotifyFollowers: !!venue?.aiAutomation?.autoNotifyFollowers,
            followersOnly: false
          })
          autoPosted.push({
            suggestion,
            promotion: promotion._id
          })
          postedCount += 1

          // Log automated action
          try {
            await AutomationLog.create({
              venue: venueId,
              action: 'auto_deal_posted',
              detail: `AI auto-published "${suggestion.title}" (${Math.round((suggestion.confidence || 0) * 100)}% confidence)`,
              promotionTitle: suggestion.title,
            })
          } catch { /* non-critical */ }
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
    const day = new Date(checkIn.createdAt).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
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
        pricePoint: buildPricePoint(getVenuePriceInsights(null, []), 20),
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
        pricePoint: buildPricePoint(getVenuePriceInsights(null, []), 15),
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

function getVenuePriceInsights(venue, promotions = []) {
  const categoryBasePrice = {
    restaurant: 18,
    bar: 12,
    cafe: 8,
    club: 14,
    other: 12
  }

  const activeDiscounts = promotions
    .map(p => Number(p.discount))
    .filter(d => Number.isFinite(d) && d > 0)
  const avgDiscount = activeDiscounts.length
    ? activeDiscounts.reduce((sum, d) => sum + d, 0) / activeDiscounts.length
    : 20

  return {
    basePrice: categoryBasePrice[venue?.category] || 12,
    averageDiscount: Math.min(Math.max(Math.round(avgDiscount), 10), 40),
    currency: 'USD'
  }
}

function buildPricePoint(priceInsights, discount) {
  const basePrice = Number(priceInsights?.basePrice || 12)
  const safeDiscount = Number.isFinite(discount) ? discount : Number(priceInsights?.averageDiscount || 20)
  const specialPrice = +(basePrice * (1 - safeDiscount / 100)).toFixed(2)
  return {
    originalPrice: basePrice,
    specialPrice: Math.max(1, specialPrice),
    currency: priceInsights?.currency || 'USD'
  }
}

// --- Revenue-based analysis helpers ---

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function analyzeRevenueByDay(payments) {
  const rev = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 }
  payments.forEach(p => {
    const day = new Date(p.createdAt).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    if (rev[day] !== undefined) rev[day] += p.amount || 0
  })
  return rev
}

function analyzeRevenueByHour(payments) {
  const hourly = Array(24).fill(0)
  payments.forEach(p => {
    const hour = new Date(p.createdAt).getHours()
    hourly[hour] += p.amount || 0
  })
  return hourly
}

function findSlowDaysFromRevenue(revenueByDay) {
  const values = Object.values(revenueByDay)
  const avg = values.reduce((a, b) => a + b, 0) / 7
  if (avg === 0) return []
  return Object.keys(revenueByDay)
    .filter(day => revenueByDay[day] < avg * 0.7)
    .sort((a, b) => revenueByDay[a] - revenueByDay[b])
}

function findPeakRevenueHours(revenueByHour) {
  let bestStart = 0
  let bestSum = 0
  for (let i = 0; i < 24; i++) {
    const sum = revenueByHour[i] + revenueByHour[(i + 1) % 24]
    if (sum > bestSum) { bestSum = sum; bestStart = i }
  }
  return [`${bestStart}:00`, `${(bestStart + 2) % 24}:00`]
}

function analyzeSalesTrend(dailySales) {
  if (dailySales.length < 7) return { direction: 'unknown', weekOverWeekChange: 0 }
  const sorted = [...dailySales].sort((a, b) => a.date.localeCompare(b.date))
  const midpoint = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midpoint)
  const secondHalf = sorted.slice(midpoint)
  const avgFirst = firstHalf.reduce((s, d) => s + d.totalSales, 0) / (firstHalf.length || 1)
  const avgSecond = secondHalf.reduce((s, d) => s + d.totalSales, 0) / (secondHalf.length || 1)
  const change = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0
  return {
    direction: change < -10 ? 'declining' : change > 10 ? 'growing' : 'stable',
    weekOverWeekChange: change
  }
}

function analyzePromotionRevenueLift(promotions, payments) {
  if (payments.length === 0 || promotions.length === 0) return []
  // Average daily revenue as baseline
  const dayMap = {}
  payments.forEach(p => {
    const d = new Date(p.createdAt).toISOString().split('T')[0]
    dayMap[d] = (dayMap[d] || 0) + (p.amount || 0)
  })
  const dailyValues = Object.values(dayMap)
  const baselineDaily = dailyValues.length > 0 ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0
  if (baselineDaily === 0) return []

  return promotions.map(promo => {
    const start = new Date(promo.startTime || promo.createdAt)
    const end = promo.endTime ? new Date(promo.endTime) : new Date(start.getTime() + 24 * 60 * 60 * 1000)
    const duringPayments = payments.filter(p => {
      const t = new Date(p.createdAt)
      return t >= start && t <= end
    })
    const revenueDuring = duringPayments.reduce((s, p) => s + (p.amount || 0), 0)
    const daysActive = Math.max(1, (end - start) / (24 * 60 * 60 * 1000))
    const dailyDuring = revenueDuring / daysActive
    const lift = baselineDaily > 0 ? ((dailyDuring - baselineDaily) / baselineDaily) * 100 : 0
    return {
      _id: promo._id,
      title: promo.title,
      description: promo.description,
      type: promo.type,
      discount: promo.discount,
      revenueDuring,
      revenueLift: lift
    }
  })
}

module.exports = {
  generatePromotionSuggestions,
  autoGenerateAndPostPromotion,
  autoSendNotification,
  processAutoSuggestions
}
