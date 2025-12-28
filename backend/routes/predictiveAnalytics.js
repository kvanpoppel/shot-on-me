const express = require('express');
const auth = require('../middleware/auth');
const predictiveAnalytics = require('../services/predictiveAnalytics');
const promotionSuggestions = require('../services/promotionSuggestions');
const Venue = require('../models/Venue');

const router = express.Router();

/**
 * GET /api/predictive-analytics/revenue
 * Predict future revenue
 */
router.get('/revenue', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const daysAhead = parseInt(req.query.daysAhead) || 7;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const prediction = await predictiveAnalytics.predictRevenue(venue._id, daysAhead);

    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Error predicting revenue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to predict revenue',
      error: error.message 
    });
  }
});

/**
 * GET /api/predictive-analytics/optimal-timing
 * Predict optimal timing for promotion
 */
router.get('/optimal-timing', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const promotionType = req.query.promotionType || 'special';

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const timing = await predictiveAnalytics.predictOptimalTiming(venue._id, promotionType);

    res.json({
      success: true,
      timing
    });
  } catch (error) {
    console.error('Error predicting optimal timing:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to predict optimal timing',
      error: error.message 
    });
  }
});

/**
 * GET /api/predictive-analytics/clv/:userId
 * Forecast customer lifetime value
 */
router.get('/clv/:userId', auth, async (req, res) => {
  try {
    const venueOwnerId = req.user.userId;
    const { userId } = req.params;

    const venue = await Venue.findOne({ owner: venueOwnerId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const clv = await predictiveAnalytics.forecastCLV(venue._id, userId);

    res.json({
      success: true,
      clv
    });
  } catch (error) {
    console.error('Error forecasting CLV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to forecast CLV',
      error: error.message 
    });
  }
});

/**
 * GET /api/predictive-analytics/promotion-suggestions
 * Get AI-generated promotion suggestions
 */
router.get('/promotion-suggestions', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const suggestions = await promotionSuggestions.generateSuggestions(venue._id);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate suggestions',
      error: error.message 
    });
  }
});

module.exports = router;

