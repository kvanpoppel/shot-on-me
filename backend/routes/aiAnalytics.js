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
      error: error.message 
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
      error: error.message 
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
      error: error.message 
    });
  }
});

module.exports = router;

