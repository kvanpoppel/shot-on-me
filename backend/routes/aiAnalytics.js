const express = require('express');
const auth = require('../middleware/auth');
const aiAnalytics = require('../services/aiAnalytics');
const Venue = require('../models/Venue');

const router = express.Router();

/**
 * GET /api/ai-analytics/performance
 * Get comprehensive AI analytics for venue promotions
 */
router.get('/performance', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get venue owned by user
    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const timeRange = parseInt(req.query.timeRange) || 30;
    const analysis = await aiAnalytics.analyzePromotionPerformance(venue._id, timeRange);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics',
      error: undefined 
    });
  }
});

/**
 * GET /api/ai-analytics/optimal-deals
 * Get optimal deal recommendations for specific timeframe
 */
router.get('/optimal-deals', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeframe = req.query.timeframe || 'evening';
    const dayOfWeek = req.query.dayOfWeek ? parseInt(req.query.dayOfWeek) : null;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const optimalDeals = await aiAnalytics.getOptimalDealsForTimeframe(
      venue._id,
      timeframe,
      dayOfWeek
    );

    res.json({
      success: true,
      optimalDeals
    });
  } catch (error) {
    console.error('Error getting optimal deals:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get optimal deals',
      error: undefined 
    });
  }
});

/**
 * GET /api/ai-analytics/recommendations
 * Get AI-powered recommendations for promotional strategies
 */
router.get('/recommendations', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeRange = parseInt(req.query.timeRange) || 30;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const analysis = await aiAnalytics.analyzePromotionPerformance(venue._id, timeRange);
    
    res.json({
      success: true,
      recommendations: analysis.recommendations,
      summary: analysis.summary
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get recommendations',
      error: undefined 
    });
  }
});

// GET /api/ai-analytics/viral-moments
// Returns viral event history for the venue + current promotion spike status
router.get('/viral-moments', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId })
      .select('viralEvents promotions name')
      .lean();

    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    const { limit = 20 } = req.query;
    const safeLimit = Math.min(50, parseInt(limit) || 20);

    const recentEvents = (venue.viralEvents || [])
      .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))
      .slice(0, safeLimit);

    // Current hot promotions (flash deals active now)
    const now = new Date();
    const hotPromos = (venue.promotions || [])
      .filter(p => p.isFlashDeal && p.isActive && p.flashDealEndsAt && new Date(p.flashDealEndsAt) > now)
      .map(p => ({
        _id: p._id,
        title: p.title,
        flashDealEndsAt: p.flashDealEndsAt,
        views: p.analytics?.views || 0,
        lastViralAt: p.analytics?.lastViralAt
      }));

    res.json({
      success: true,
      totalViralEvents: (venue.viralEvents || []).length,
      recentEvents,
      hotPromotions: hotPromos
    });
  } catch (error) {
    console.error('Error fetching viral moments:', error);
    res.status(500).json({ message: 'Failed to fetch viral moments', error: undefined });
  }
});

// POST /api/ai-analytics/viral-moments/run
// Manually trigger viral detection for this venue (owner only)
router.post('/viral-moments/run', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({ owner: req.user.userId }).select('_id name');
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    const { detectViralMoments } = require('../services/viralMomentDetector');
    const io = req.app.get('io');
    const result = await detectViralMoments(io);

    res.json({
      success: true,
      detected: result.detected,
      events: result.events.filter(e => e.venueId.toString() === venue._id.toString())
    });
  } catch (error) {
    console.error('Error running viral detector:', error);
    res.status(500).json({ message: 'Failed to run viral detection', error: undefined });
  }
});

module.exports = router;

