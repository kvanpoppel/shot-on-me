const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const User = require('../models/User');

// Get venue analytics dashboard
router.get('/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { startDate, endDate } = req.query;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is venue owner
    if (venue.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Total check-ins
    const totalCheckIns = await CheckIn.countDocuments({
      venue: venueId,
      createdAt: { $gte: start, $lte: end }
    });

    // Unique visitors
    const uniqueVisitors = await CheckIn.distinct('user', {
      venue: venueId,
      createdAt: { $gte: start, $lte: end }
    });

    // Check-ins by day (for chart)
    const checkInsByDay = await CheckIn.aggregate([
      {
        $match: {
          venue: require('mongoose').Types.ObjectId(venueId),
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Peak times (by hour)
    const peakTimes = await CheckIn.aggregate([
      {
        $match: {
          venue: require('mongoose').Types.ObjectId(venueId),
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Total redemptions (payments redeemed at this venue)
    const totalRedemptions = await Payment.countDocuments({
      venueId: venueId,
      type: 'shot_redeemed',
      status: 'succeeded',
      createdAt: { $gte: start, $lte: end }
    });

    // Total redemption value
    const redemptionValue = await Payment.aggregate([
      {
        $match: {
          venueId: require('mongoose').Types.ObjectId(venueId),
          type: 'shot_redeemed',
          status: 'succeeded',
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Most active users (top 10)
    const topUsers = await CheckIn.aggregate([
      {
        $match: {
          venue: require('mongoose').Types.ObjectId(venueId),
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$user',
          checkInCount: { $sum: 1 },
          lastCheckIn: { $max: '$createdAt' }
        }
      },
      {
        $sort: { checkInCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const userIds = topUsers.map(u => u._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name firstName lastName profilePicture');

    const topUsersWithDetails = topUsers.map(u => {
      const user = users.find(usr => usr._id.toString() === u._id.toString());
      return {
        user: {
          id: user?._id,
          name: user?.name,
          firstName: user?.firstName,
          lastName: user?.lastName,
          profilePicture: user?.profilePicture
        },
        checkInCount: u.checkInCount,
        lastCheckIn: u.lastCheckIn
      };
    });

    // Promotion performance with detailed analytics
    const promotionStats = await Promise.all(venue.promotions.map(async (promo) => {
      const promoStart = promo.startTime || start;
      const promoEnd = promo.endTime || promo.validUntil || end;
      
      // Get redemptions for this promotion (if we track promotionId in metadata)
      const redemptions = await Payment.find({
        venueId: venueId,
        type: { $in: ['shot_redeemed', 'tap_and_pay'] },
        status: 'succeeded',
        createdAt: { $gte: promoStart, $lte: promoEnd }
      });
      
      const revenue = redemptions.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      return {
        id: promo._id,
        title: promo.title,
        type: promo.type,
        isActive: promo.isActive,
        currentUses: promo.currentUses || 0,
        maxUses: promo.maxUses,
        startTime: promoStart,
        endTime: promoEnd,
        analytics: {
          views: promo.analytics?.views || 0,
          clicks: promo.analytics?.clicks || 0,
          shares: promo.analytics?.shares || 0,
          redemptions: promo.analytics?.redemptions || redemptions.length,
          revenue: promo.analytics?.revenue || revenue,
          conversionRate: promo.analytics?.views > 0 
            ? ((promo.analytics?.redemptions || redemptions.length) / promo.analytics.views * 100).toFixed(2)
            : '0.00'
        }
      };
    }));

    // Events stats
    const eventsCount = await Event.countDocuments({
      venue: venueId,
      startTime: { $gte: start, $lte: end }
    });

    const upcomingEvents = await Event.find({
      venue: venueId,
      startTime: { $gte: new Date() }
    })
      .sort({ startTime: 1 })
      .limit(5);

    res.json({
      venue: {
        id: venue._id,
        name: venue.name
      },
      period: {
        start,
        end
      },
      overview: {
        totalCheckIns,
        uniqueVisitors: uniqueVisitors.length,
        totalRedemptions,
        redemptionValue: redemptionValue[0]?.total || 0,
        eventsCount
      },
      charts: {
        checkInsByDay,
        peakTimes
      },
      topUsers: topUsersWithDetails,
      promotions: promotionStats,
      upcomingEvents: upcomingEvents.map(e => ({
        id: e._id,
        title: e.title,
        startTime: e.startTime,
        rsvpCount: e.rsvps.length,
        attendeeCount: e.attendees.length
      }))
    });
  } catch (error) {
    console.error('Error fetching venue analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get promotion ROI
router.get('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const { venueId, promotionId } = req.params;
    
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const promotion = venue.promotions.id(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Get check-ins during promotion period
    const promoStart = promotion.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const promoEnd = promotion.endTime || promotion.validUntil || new Date();

    const checkInsDuringPromo = await CheckIn.countDocuments({
      venue: venueId,
      createdAt: { $gte: promoStart, $lte: promoEnd }
    });

    // Estimate revenue (check-ins * average spend, or use actual redemption data)
    const redemptions = await Payment.find({
      venueId: venueId,
      type: 'shot_redeemed',
      status: 'succeeded',
      createdAt: { $gte: promoStart, $lte: promoEnd }
    });

    const estimatedRevenue = redemptions.reduce((sum, r) => sum + r.amount, 0);

    res.json({
      promotion: {
        id: promotion._id,
        title: promotion.title,
        type: promotion.type,
        discount: promotion.discount
      },
      stats: {
        checkIns: checkInsDuringPromo,
        redemptions: redemptions.length,
        estimatedRevenue,
        currentUses: promotion.currentUses || 0,
        maxUses: promotion.maxUses
      },
      period: {
        start: promoStart,
        end: promoEnd
      }
    });
  } catch (error) {
    console.error('Error fetching promotion ROI:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

