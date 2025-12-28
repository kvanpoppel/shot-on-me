const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const {
  generatePromotionSuggestions,
  autoGenerateAndPostPromotion,
  autoSendNotification,
  processAutoSuggestions
} = require('../services/aiAutomation')

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

module.exports = router
