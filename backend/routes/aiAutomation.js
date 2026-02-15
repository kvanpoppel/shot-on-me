const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Venue = require('../models/Venue')
const {
  generatePromotionSuggestions,
  autoGenerateAndPostPromotion,
  autoSendNotification,
  processAutoSuggestions
} = require('../services/aiAutomation')

const dealTypeMatchers = {
  'happy-hour': (suggestion = {}) => {
    const promo = suggestion.suggestedPromotion || {}
    const type = String(promo.type || '').toLowerCase()
    const text = `${promo.title || ''} ${promo.description || ''} ${suggestion.type || ''}`.toLowerCase()
    return type === 'happy-hour' || text.includes('happy hour') || text.includes('peak')
  },
  'flash-deal': (suggestion = {}) => {
    const promo = suggestion.suggestedPromotion || {}
    const type = String(promo.type || '').toLowerCase()
    const text = `${promo.title || ''} ${promo.description || ''} ${suggestion.type || ''}`.toLowerCase()
    return type === 'flash-deal' || text.includes('flash') || text.includes('limited')
  },
  weekend: (suggestion = {}) => {
    const promo = suggestion.suggestedPromotion || {}
    const days = Array.isArray(promo.daysOfWeek) ? promo.daysOfWeek.map((d) => String(d).toLowerCase()) : []
    const text = `${promo.title || ''} ${promo.description || ''} ${suggestion.type || ''}`.toLowerCase()
    return text.includes('weekend') || days.some((d) => d === 'friday' || d === 'saturday' || d === 'sunday')
  },
  vip: (suggestion = {}) => {
    const promo = suggestion.suggestedPromotion || {}
    const type = String(promo.type || '').toLowerCase()
    const text = `${promo.title || ''} ${promo.description || ''} ${suggestion.type || ''}`.toLowerCase()
    return type === 'exclusive' || text.includes('vip') || text.includes('exclusive') || text.includes('retention')
  }
}

function buildFallbackSuggestion(dealType) {
  const map = {
    'happy-hour': {
      type: 'happy-hour',
      title: 'AI Happy Hour',
      description: 'Smartly timed happy hour deal based on venue traffic patterns.',
      discount: 15,
      startTime: '16:00',
      endTime: '19:00',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    'flash-deal': {
      type: 'flash-deal',
      title: 'AI Flash Deal',
      description: 'Limited-time high-conversion offer to drive immediate visits.',
      discount: 20,
      startTime: '17:00',
      endTime: '18:00',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    weekend: {
      type: 'special',
      title: 'AI Weekend Special',
      description: 'Weekend-focused promotion optimized for high intent traffic.',
      discount: 18,
      startTime: '17:00',
      endTime: '22:00',
      daysOfWeek: ['friday', 'saturday', 'sunday']
    },
    vip: {
      type: 'exclusive',
      title: 'AI VIP Exclusive',
      description: 'Premium loyalty offer tuned for your most engaged guests.',
      discount: 22,
      startTime: '18:00',
      endTime: '23:00',
      daysOfWeek: ['friday', 'saturday']
    }
  }

  const promotion = map[dealType] || map['happy-hour']
  return {
    type: `instant-${dealType}`,
    priority: 'high',
    title: promotion.title,
    description: promotion.description,
    suggestedPromotion: promotion,
    autoPost: true,
    autoNotify: true,
    confidence: 0.72
  }
}

function buildImpactSummary({ dealType, source, confidence, followerCount = 0 }) {
  const baselineByType = {
    'happy-hour': { min: 8, max: 15, action: { label: 'View check-ins', href: '/dashboard/redemptions' } },
    'flash-deal': { min: 10, max: 20, action: { label: 'Track live activity', href: '/dashboard/redemptions' } },
    weekend: { min: 9, max: 17, action: { label: 'Review weekend analytics', href: '/dashboard/analytics?tab=activity' } },
    vip: { min: 6, max: 14, action: { label: 'Open personalized insights', href: '/dashboard/analytics?tab=personalized' } }
  }

  const baseline = baselineByType[dealType] || baselineByType['happy-hour']
  const confidenceBoost = Math.max(0, Math.round((Number(confidence || 0.72) - 0.7) * 20))
  const sourceBoost = source === 'ai' ? 2 : 0
  const min = baseline.min + sourceBoost + Math.floor(confidenceBoost / 2)
  const max = baseline.max + sourceBoost + confidenceBoost
  const expectedReach = Math.max(25, Math.round((followerCount || 0) * 0.35) || 35)

  return {
    headline: `Estimated uplift for ${dealType.replace('-', ' ')}`,
    upliftRangePercent: `${min}-${max}%`,
    expectedReachUsers: expectedReach,
    confidence: Number(confidence || 0.72),
    nextActionLabel: baseline.action.label,
    nextActionHref: baseline.action.href
  }
}

/**
 * GET /api/ai-automation/suggestions
 * Get AI-generated promotion suggestions
 */
router.get('/suggestions', auth, async (req, res) => {
  try {
    const venueId = req.query.venueId || req.user.venueId
    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID required' })
    }

    const result = await generatePromotionSuggestions(venueId)
    res.json(result)
  } catch (error) {
    console.error('Error fetching AI suggestions:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-automation/auto-post
 * Auto-generate and post a promotion based on suggestion
 */
router.post('/auto-post', auth, async (req, res) => {
  try {
    const { venueId, suggestion } = req.body
    if (!venueId || !suggestion) {
      return res.status(400).json({ error: 'Venue ID and suggestion required' })
    }

    const promotion = await autoGenerateAndPostPromotion(venueId, suggestion)
    res.json({ success: true, promotion })
  } catch (error) {
    console.error('Error auto-posting promotion:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-automation/instant-deal
 * Publish one AI-optimized deal instantly by type
 */
router.post('/instant-deal', auth, async (req, res) => {
  try {
    const { venueId, dealType } = req.body || {}
    if (!venueId || !dealType) {
      return res.status(400).json({ error: 'Venue ID and deal type required' })
    }

    const normalizedDealType = String(dealType).toLowerCase()
    if (!dealTypeMatchers[normalizedDealType]) {
      return res.status(400).json({ error: 'Unsupported deal type' })
    }

    const venue = await Venue.findById(venueId).select('owner followerCount')
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' })
    }

    if (venue.owner?.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    let selectedSuggestion = null
    let source = 'fallback'

    try {
      const result = await generatePromotionSuggestions(venueId)
      const suggestions = result?.suggestions || []
      selectedSuggestion = suggestions.find(dealTypeMatchers[normalizedDealType]) || suggestions[0] || null
      if (selectedSuggestion) {
        source = 'ai'
      }
    } catch (error) {
      console.warn('AI suggestions unavailable for instant deal, using fallback:', error.message)
    }

    if (!selectedSuggestion) {
      selectedSuggestion = buildFallbackSuggestion(normalizedDealType)
    }

    const created = await autoGenerateAndPostPromotion(venueId, selectedSuggestion, {
      autoNotifyFollowers: true,
      followersOnly: normalizedDealType === 'vip'
    })

    const impact = buildImpactSummary({
      dealType: normalizedDealType,
      source,
      confidence: selectedSuggestion?.confidence,
      followerCount: Number(venue.followerCount || 0)
    })

    res.json({
      success: true,
      source,
      dealType: normalizedDealType,
      promotionId: created?._id || created?.promotion?._id || null,
      suggestionTitle: selectedSuggestion?.title || null,
      impact
    })
  } catch (error) {
    console.error('Error publishing instant AI deal:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-automation/process-all
 * Process all pending suggestions and auto-post high-confidence ones
 */
router.post('/process-all', auth, async (req, res) => {
  try {
    const venueId = req.body.venueId || req.user.venueId
    const autoPostThreshold = req.body.threshold || 0.85

    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID required' })
    }

    const result = await processAutoSuggestions(venueId, autoPostThreshold)
    await Venue.findByIdAndUpdate(venueId, {
      $set: { 'aiAutomation.lastRunAt': new Date() }
    }).catch(() => {})
    res.json(result)
  } catch (error) {
    console.error('Error processing auto-suggestions:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-automation/auto-notify
 * Auto-send notification for a promotion
 */
router.post('/auto-notify', auth, async (req, res) => {
  try {
    const { venueId, promotionId, type } = req.body
    if (!venueId || !promotionId) {
      return res.status(400).json({ error: 'Venue ID and promotion ID required' })
    }

    const notification = await autoSendNotification(venueId, promotionId, type || 'new-promotion')
    res.json({ success: true, notification })
  } catch (error) {
    console.error('Error auto-sending notification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai-automation/settings
 * Fetch persisted AI automation settings for a venue
 */
router.get('/settings', auth, async (req, res) => {
  try {
    const venueId = req.query.venueId || req.user.venueId
    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID required' })
    }

    const venue = await Venue.findById(venueId).select('owner aiAutomation')
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' })
    }

    if (venue.owner?.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const defaults = {
      enabled: false,
      autoPostThreshold: 0.85,
      autoNotifyFollowers: true,
      autoGenerateSpecials: true,
      checkIntervalHours: 24,
      maxPromotionsPerCycle: 2,
      lastRunAt: null
    }

    res.json({
      venueId,
      settings: { ...defaults, ...(venue.aiAutomation?.toObject?.() || venue.aiAutomation || {}) }
    })
  } catch (error) {
    console.error('Error fetching AI automation settings:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/ai-automation/settings
 * Persist AI automation settings for a venue
 */
router.put('/settings', auth, async (req, res) => {
  try {
    const { venueId, settings } = req.body
    if (!venueId || !settings) {
      return res.status(400).json({ error: 'Venue ID and settings required' })
    }

    const venue = await Venue.findById(venueId).select('owner aiAutomation')
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' })
    }

    if (venue.owner?.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const nextSettings = {
      enabled: !!settings.enabled,
      autoPostThreshold: Math.min(Math.max(Number(settings.autoPostThreshold ?? 0.85), 0.5), 0.99),
      autoNotifyFollowers: settings.autoNotifyFollowers !== false,
      autoGenerateSpecials: settings.autoGenerateSpecials !== false,
      checkIntervalHours: Math.min(Math.max(Number(settings.checkIntervalHours ?? 24), 1), 168),
      maxPromotionsPerCycle: Math.min(Math.max(Number(settings.maxPromotionsPerCycle ?? 2), 1), 10),
      lastRunAt: venue.aiAutomation?.lastRunAt || null
    }

    venue.aiAutomation = nextSettings
    await venue.save()

    res.json({ success: true, settings: venue.aiAutomation })
  } catch (error) {
    console.error('Error updating AI automation settings:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai-automation/run-cycle
 * Run an automation cycle if enabled and interval elapsed
 */
router.post('/run-cycle', auth, async (req, res) => {
  try {
    const venueId = req.body.venueId || req.user.venueId
    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID required' })
    }

    const venue = await Venue.findById(venueId).select('owner aiAutomation')
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' })
    }

    if (venue.owner?.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const settings = venue.aiAutomation?.toObject?.() || venue.aiAutomation || {}
    if (!settings.enabled) {
      return res.json({ success: true, skipped: true, reason: 'disabled' })
    }
    if (settings.autoGenerateSpecials === false) {
      return res.json({ success: true, skipped: true, reason: 'auto_generate_disabled' })
    }

    const checkIntervalHours = Math.max(1, Number(settings.checkIntervalHours || 24))
    const lastRunAt = settings.lastRunAt ? new Date(settings.lastRunAt) : null
    const now = new Date()
    const elapsedMs = lastRunAt ? now.getTime() - lastRunAt.getTime() : Number.POSITIVE_INFINITY
    const requiredMs = checkIntervalHours * 60 * 60 * 1000

    if (elapsedMs < requiredMs && !req.body.force) {
      return res.json({
        success: true,
        skipped: true,
        reason: 'interval_not_elapsed',
        nextRunInMinutes: Math.ceil((requiredMs - elapsedMs) / (60 * 1000))
      })
    }

    const threshold = Number(settings.autoPostThreshold || 0.85)
    const result = await processAutoSuggestions(venueId, threshold)

    venue.aiAutomation = {
      ...settings,
      lastRunAt: now
    }
    await venue.save()

    res.json({ success: true, skipped: false, result })
  } catch (error) {
    console.error('Error running AI automation cycle:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
