const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const {
  generatePromotionSuggestions,
  autoGenerateAndPostPromotion,
  processAutoSuggestions
} = require('../services/aiAutomation');
const { runAiAutomationSchedulerCycle } = require('../services/aiAutomationScheduler');

// GET /api/ai-automation/suggestions
// Get AI-generated promotion suggestions for venue owner
router.get('/suggestions', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const result = await generatePromotionSuggestions(venue._id);

    res.json({
      success: true,
      suggestions: result.suggestions,
      insights: result.insights,
      venueId: venue._id,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    res.status(500).json({ message: 'Failed to generate suggestions', error: undefined });
  }
});

// POST /api/ai-automation/suggestions/apply
// Apply a specific suggestion (creates a promotion from it)
router.post('/suggestions/apply', auth, async (req, res) => {
  try {
    const { suggestion, options = {} } = req.body;

    if (!suggestion || !suggestion.suggestedPromotion) {
      return res.status(400).json({ message: 'Valid suggestion with suggestedPromotion is required' });
    }

    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const result = await autoGenerateAndPostPromotion(venue._id, suggestion, {
      ...options,
      autoNotifyFollowers: options.autoNotifyFollowers ?? venue.aiAutomation?.autoNotifyFollowers ?? true
    });

    res.json({
      success: true,
      message: 'Promotion created from AI suggestion',
      promotion: result.promotion,
      promotionId: result._id
    });
  } catch (error) {
    console.error('Error applying AI suggestion:', error);
    res.status(500).json({ message: 'Failed to apply suggestion', error: undefined });
  }
});

// POST /api/ai-automation/run
// Manually trigger an AI automation cycle for the venue
router.post('/run', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const threshold = parseFloat(req.body.autoPostThreshold) || 0.85;
    const result = await processAutoSuggestions(venue._id, threshold);

    res.json({
      success: true,
      message: `AI cycle complete: ${result.autoPosted.length} auto-posted, ${result.pending.length} pending review`,
      autoPosted: result.autoPosted.length,
      pendingReview: result.pending.length,
      totalSuggestions: result.total,
      pending: result.pending
    });
  } catch (error) {
    console.error('Error running AI automation:', error);
    res.status(500).json({ message: 'Failed to run automation cycle', error: undefined });
  }
});

// POST /api/ai-automation/run-cycle
// Trigger the AI automation scheduler cycle for the venue (used by AutoModeToggle)
router.post('/run-cycle', auth, async (req, res) => {
  try {
    const { force = false } = req.body;

    const venue = await Venue.findOne({ owner: req.user.userId })
      .select('aiAutomation name');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // If not forced, check if interval has elapsed
    if (!force && venue.aiAutomation?.lastRunAt) {
      const intervalHours = Math.max(1, Number(venue.aiAutomation.checkIntervalHours || 24));
      const elapsedMs = Date.now() - new Date(venue.aiAutomation.lastRunAt).getTime();
      const intervalMs = intervalHours * 60 * 60 * 1000;
      if (elapsedMs < intervalMs) {
        const nextRunInMinutes = Math.ceil((intervalMs - elapsedMs) / (60 * 1000));
        return res.json({
          success: true,
          skipped: true,
          reason: 'interval_not_elapsed',
          nextRunInMinutes
        });
      }
    }

    const threshold = Math.min(Math.max(Number(venue.aiAutomation?.autoPostThreshold || 0.85), 0.5), 0.99);
    const result = await processAutoSuggestions(venue._id, threshold);

    // Update lastRunAt
    if (!venue.aiAutomation) venue.aiAutomation = {};
    venue.aiAutomation.lastRunAt = new Date();
    await venue.save();

    res.json({
      success: true,
      skipped: false,
      autoPosted: result.autoPosted.length,
      pending: result.pending.length,
      total: result.total
    });
  } catch (error) {
    console.error('Error running AI cycle:', error);
    res.status(500).json({ message: 'Failed to run AI cycle', error: undefined });
  }
});

// GET /api/ai-automation/settings
// Get AI automation settings for the venue
router.get('/settings', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId })
      .select('aiAutomation name');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Return settings with defaults if not configured
    const settings = {
      enabled: venue.aiAutomation?.enabled ?? false,
      autoPostThreshold: venue.aiAutomation?.autoPostThreshold ?? 0.85,
      autoNotifyFollowers: venue.aiAutomation?.autoNotifyFollowers ?? true,
      autoGenerateSpecials: venue.aiAutomation?.autoGenerateSpecials ?? true,
      maxPromotionsPerCycle: venue.aiAutomation?.maxPromotionsPerCycle ?? 2,
      checkIntervalHours: venue.aiAutomation?.checkIntervalHours ?? 24,
      schedulerIntervalHours: venue.aiAutomation?.checkIntervalHours ?? 24,
      focusAreas: venue.aiAutomation?.focusAreas ?? ['slow-day-boost', 'retention', 'peak-optimization'],
      lastRunAt: venue.aiAutomation?.lastRunAt || null
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting AI settings:', error);
    res.status(500).json({ message: 'Failed to get settings', error: undefined });
  }
});

// PUT /api/ai-automation/settings
// Update AI automation settings for the venue
router.put('/settings', auth, async (req, res) => {
  try {
    // Support both flat body { enabled, autoPostThreshold, ... }
    // and nested body { settings: { enabled, ... } } (sent by AutoModeToggle)
    const body = req.body?.settings ?? req.body;
    const {
      enabled,
      autoPostThreshold,
      autoNotifyFollowers,
      autoGenerateSpecials,
      maxPromotionsPerCycle,
      schedulerIntervalHours,
      checkIntervalHours,
      focusAreas
    } = body;

    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Validate inputs
    if (autoPostThreshold !== undefined) {
      const t = parseFloat(autoPostThreshold);
      if (!Number.isFinite(t) || t < 0.5 || t > 1.0) {
        return res.status(400).json({ message: 'autoPostThreshold must be between 0.5 and 1.0' });
      }
    }
    if (maxPromotionsPerCycle !== undefined) {
      const m = parseInt(maxPromotionsPerCycle);
      if (!Number.isFinite(m) || m < 1 || m > 10) {
        return res.status(400).json({ message: 'maxPromotionsPerCycle must be between 1 and 10' });
      }
    }

    if (!venue.aiAutomation) venue.aiAutomation = {};

    if (enabled !== undefined) venue.aiAutomation.enabled = !!enabled;
    if (autoPostThreshold !== undefined) venue.aiAutomation.autoPostThreshold = parseFloat(autoPostThreshold);
    if (autoNotifyFollowers !== undefined) venue.aiAutomation.autoNotifyFollowers = !!autoNotifyFollowers;
    if (autoGenerateSpecials !== undefined) venue.aiAutomation.autoGenerateSpecials = !!autoGenerateSpecials;
    if (maxPromotionsPerCycle !== undefined) venue.aiAutomation.maxPromotionsPerCycle = parseInt(maxPromotionsPerCycle);
    // Support both checkIntervalHours (AutoModeToggle) and schedulerIntervalHours
    const intervalHours = checkIntervalHours ?? schedulerIntervalHours;
    if (intervalHours !== undefined) venue.aiAutomation.checkIntervalHours = parseInt(intervalHours);
    if (focusAreas !== undefined && Array.isArray(focusAreas)) venue.aiAutomation.focusAreas = focusAreas;

    await venue.save();

    res.json({
      success: true,
      message: 'AI automation settings updated',
      settings: venue.aiAutomation
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({ message: 'Failed to update settings', error: undefined });
  }
});

// POST /api/ai-automation/auto-post  (frontend alias for suggestions/apply)
router.post('/auto-post', auth, async (req, res) => {
  try {
    const { suggestion, options = {} } = req.body;

    if (!suggestion || !suggestion.suggestedPromotion) {
      return res.status(400).json({ message: 'Valid suggestion with suggestedPromotion is required' });
    }

    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const result = await autoGenerateAndPostPromotion(venue._id, suggestion, {
      ...options,
      autoNotifyFollowers: options.autoNotifyFollowers ?? venue.aiAutomation?.autoNotifyFollowers ?? true
    });

    res.json({
      success: true,
      message: `Promotion "${suggestion.title}" created and posted automatically!`,
      promotion: result.promotion,
      promotionId: result._id
    });
  } catch (error) {
    console.error('Error auto-posting suggestion:', error);
    res.status(500).json({ message: 'Failed to auto-post suggestion', error: undefined });
  }
});

// POST /api/ai-automation/process-all  (frontend alias for /run)
router.post('/process-all', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const threshold = parseFloat(req.body.threshold) || 0.85;
    const result = await processAutoSuggestions(venue._id, threshold);

    res.json({
      success: true,
      autoPosted: result.autoPosted,
      pending: result.pending,
      total: result.total
    });
  } catch (error) {
    console.error('Error processing all suggestions:', error);
    res.status(500).json({ message: 'Failed to process suggestions', error: undefined });
  }
});

// GET /api/ai-automation/history
// Get history of AI-generated promotions for this venue
router.get('/history', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId })
      .select('promotions');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const { limit = 20 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const autoGenerated = (venue.promotions || [])
      .filter(p => p.autoGenerated === true)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, safeLimit)
      .map(p => ({
        _id: p._id,
        title: p.title,
        description: p.description,
        type: p.type,
        discount: p.discount,
        isActive: p.isActive,
        aiConfidence: p.aiConfidence,
        analytics: p.analytics,
        createdAt: p.createdAt,
        startTime: p.startTime,
        endTime: p.endTime
      }));

    res.json({
      success: true,
      history: autoGenerated,
      total: autoGenerated.length
    });
  } catch (error) {
    console.error('Error getting AI history:', error);
    res.status(500).json({ message: 'Failed to get history', error: undefined });
  }
});

// GET /api/ai-automation/status
// Get current automation status summary for venue dashboard widget
router.get('/status', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId })
      .select('aiAutomation promotions name');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const autoGeneratedPromos = (venue.promotions || []).filter(p => p.autoGenerated);
    const activeAutoPromos = autoGeneratedPromos.filter(p => p.isActive);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAutoPromos = autoGeneratedPromos.filter(p =>
      new Date(p.createdAt || 0) >= last30Days
    );

    res.json({
      success: true,
      status: {
        enabled: venue.aiAutomation?.enabled ?? false,
        autoPostThreshold: venue.aiAutomation?.autoPostThreshold ?? 0.85,
        totalAutoGenerated: autoGeneratedPromos.length,
        activeAutoPromotions: activeAutoPromos.length,
        generatedLast30Days: recentAutoPromos.length,
        lastCycleAt: venue.aiAutomation?.lastCycleAt || null
      }
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ message: 'Failed to get status', error: undefined });
  }
});

module.exports = router;
