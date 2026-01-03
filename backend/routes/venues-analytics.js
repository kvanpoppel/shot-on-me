const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/venues/:venueId/promotions/track - Track promotion analytics (by title or ID)
router.post('/:venueId/promotions/track', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { type, promotionId, promotionTitle } = req.body; // 'view', 'click', 'share', 'redemption'

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Find promotion by ID or title
    let promotion;
    if (promotionId) {
      promotion = venue.promotions.id(promotionId);
    } else if (promotionTitle) {
      promotion = venue.promotions.find((p) => p.title === promotionTitle);
    }

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Initialize analytics if it doesn't exist
    if (!promotion.analytics) {
      promotion.analytics = {
        views: 0,
        clicks: 0,
        shares: 0,
        redemptions: 0,
        revenue: 0,
        viewHistory: []
      };
    }

    // Update analytics based on type
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (type) {
      case 'view':
        promotion.analytics.views = (promotion.analytics.views || 0) + 1;
        promotion.analytics.lastViewed = now;
        
        // Update view history
        const todayHistory = promotion.analytics.viewHistory.find(
          (h) => h.date && new Date(h.date).getTime() === today.getTime()
        );
        if (todayHistory) {
          todayHistory.count = (todayHistory.count || 0) + 1;
        } else {
          promotion.analytics.viewHistory.push({ date: today, count: 1 });
        }
        break;
      case 'click':
        promotion.analytics.clicks = (promotion.analytics.clicks || 0) + 1;
        break;
      case 'share':
        promotion.analytics.shares = (promotion.analytics.shares || 0) + 1;
        break;
      case 'redemption':
        promotion.analytics.redemptions = (promotion.analytics.redemptions || 0) + 1;
        // Revenue would be updated separately when payment is processed
        break;
      default:
        return res.status(400).json({ message: 'Invalid tracking type' });
    }

    await venue.save();

    res.json({ 
      success: true, 
      analytics: promotion.analytics 
    });
  } catch (error) {
    console.error('Error tracking promotion analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/venues/:venueId/promotions/:promotionId/analytics - Get promotion analytics
router.get('/:venueId/promotions/:promotionId/analytics', auth, async (req, res) => {
  try {
    const { venueId, promotionId } = req.params;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is venue owner
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const promotion = venue.promotions.id(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.json({ 
      analytics: promotion.analytics || {
        views: 0,
        clicks: 0,
        shares: 0,
        redemptions: 0,
        revenue: 0,
        viewHistory: []
      }
    });
  } catch (error) {
    console.error('Error fetching promotion analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

