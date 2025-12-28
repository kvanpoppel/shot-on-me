const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const CheckIn = require('../models/CheckIn');
const mongoose = require('mongoose');

// GET /api/promotion-analytics/:venueId/:promotionId
// Get detailed analytics for a specific promotion
router.get('/:venueId/:promotionId', auth, async (req, res) => {
  try {
    const { venueId, promotionId } = req.params;
    const { startDate, endDate } = req.query;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check authorization
    if (venue.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find promotion by ID (handle both string and ObjectId)
    let promotion = null;
    try {
      promotion = venue.promotions.id(promotionId);
    } catch (err) {
      // If .id() doesn't work, try finding by _id string
      promotion = venue.promotions.find(p => p._id.toString() === promotionId);
    }
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Handle date ranges - ensure we have valid dates
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultEnd = new Date();
    
    let start, end;
    if (startDate) {
      start = new Date(startDate);
    } else if (promotion.startTime) {
      start = new Date(promotion.startTime);
    } else {
      start = defaultStart;
    }
    
    if (endDate) {
      end = new Date(endDate);
    } else if (promotion.endTime) {
      end = new Date(promotion.endTime);
    } else if (promotion.validUntil) {
      end = new Date(promotion.validUntil);
    } else {
      end = defaultEnd;
    }
    
    // Ensure dates are valid
    if (isNaN(start.getTime())) start = defaultStart;
    if (isNaN(end.getTime())) end = defaultEnd;

    // Get redemptions
    const redemptions = await Payment.find({
      venueId: venueId,
      type: { $in: ['shot_redeemed', 'tap_and_pay'] },
      status: 'succeeded',
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    const revenue = redemptions.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Get check-ins during promotion period
    const checkIns = await CheckIn.countDocuments({
      venue: venueId,
      createdAt: { $gte: start, $lte: end }
    });

    // Daily performance data
    const dailyStats = await Payment.aggregate([
      {
        $match: {
          venueId: new mongoose.Types.ObjectId(venueId),
          type: { $in: ['shot_redeemed', 'tap_and_pay'] },
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Hourly performance (best times)
    const hourlyStats = await Payment.aggregate([
      {
        $match: {
          venueId: new mongoose.Types.ObjectId(venueId),
          type: { $in: ['shot_redeemed', 'tap_and_pay'] },
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const analytics = promotion.analytics || {};
    const views = analytics.views || 0;
    const clicks = analytics.clicks || 0;
    const shares = analytics.shares || 0;
    const redemptionCount = redemptions.length;

    res.json({
      promotion: {
        id: promotion._id ? promotion._id.toString() : promotionId,
        title: promotion.title || 'Untitled Promotion',
        description: promotion.description || '',
        type: promotion.type || 'other',
        isActive: promotion.isActive !== undefined ? promotion.isActive : true,
        startTime: promotion.startTime ? promotion.startTime.toISOString() : start.toISOString(),
        endTime: promotion.endTime ? promotion.endTime.toISOString() : end.toISOString(),
        discount: promotion.discount || 0
      },
      metrics: {
        views,
        clicks,
        shares,
        redemptions: redemptionCount,
        revenue,
        checkIns,
        conversionRate: views > 0 ? ((redemptionCount / views) * 100).toFixed(2) : '0.00',
        clickThroughRate: views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00',
        averageOrderValue: redemptionCount > 0 ? (revenue / redemptionCount).toFixed(2) : '0.00'
      },
      charts: {
        dailyPerformance: dailyStats,
        hourlyPerformance: hourlyStats
      },
      period: {
        start,
        end
      }
    });
  } catch (error) {
    console.error('Error fetching promotion analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/promotion-analytics/:venueId/:promotionId/track
// Track promotion view/click/share
router.post('/:venueId/:promotionId/track', auth, async (req, res) => {
  try {
    const { venueId, promotionId } = req.params;
    const { action } = req.body; // 'view', 'click', 'share'

    if (!['view', 'click', 'share'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const promotion = venue.promotions.id(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Initialize analytics if not exists
    if (!promotion.analytics) {
      promotion.analytics = {
        views: 0,
        clicks: 0,
        shares: 0,
        redemptions: 0,
        revenue: 0
      };
    }

    // Update analytics
    if (action === 'view') {
      promotion.analytics.views = (promotion.analytics.views || 0) + 1;
      promotion.analytics.lastViewed = new Date();
    } else if (action === 'click') {
      promotion.analytics.clicks = (promotion.analytics.clicks || 0) + 1;
    } else if (action === 'share') {
      promotion.analytics.shares = (promotion.analytics.shares || 0) + 1;
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

module.exports = router;

