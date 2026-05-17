const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');

// GET /api/dashboard/stats - Get dashboard statistics for venue owner
router.get('/stats', auth, async (req, res) => {
  try {
    // Find venue owned by user or where user is staff
    const venue = await Venue.findOne({
      $or: [
        { owner: req.user.userId },
        { 'staff.user': req.user.userId }
      ]
    });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const venueId = venue._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate total revenue (payments redeemed at this venue)
    // Include both 'succeeded' and 'redeemed' status for compatibility
    const revenuePayments = await Payment.aggregate([
      {
        $match: {
          venueId: venueId,
          type: { $in: ['shot_redeemed', 'transfer'] },
          status: { $in: ['succeeded', 'redeemed'] },
          createdAt: { $gte: thirtyDaysAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    const totalRevenue = revenuePayments[0]?.total || 0;

    // Count total redemptions
    const totalRedemptions = await Payment.countDocuments({
      venueId: venueId,
      type: { $in: ['shot_redeemed', 'transfer'] },
      status: { $in: ['succeeded', 'redeemed'] },
      createdAt: { $gte: thirtyDaysAgo, $lte: now }
    });

    // Get pending payouts (from Stripe balance if available)
    let pendingPayouts = 0;
    try {
      const stripeUtils = require('../utils/stripe');
      if (venue.stripeAccountId && stripeUtils.isStripeConfigured()) {
        const stripe = stripeUtils.stripe;
        const balance = await stripe.balance.retrieve({
          stripeAccount: venue.stripeAccountId
        });
        pendingPayouts = balance.pending[0]?.amount / 100 || 0;
      }
    } catch (error) {
      console.error('Error fetching Stripe balance for dashboard:', error);
    }

    // Yesterday's stats
    const yesterdayStart = new Date(now); yesterdayStart.setDate(yesterdayStart.getDate() - 1); yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(now); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1); yesterdayEnd.setHours(23, 59, 59, 999);

    const [yesterdayRevenueAgg, yesterdayRedemptions] = await Promise.all([
      Payment.aggregate([
        { $match: { venueId, type: { $in: ['shot_redeemed', 'transfer'] }, status: { $in: ['succeeded', 'redeemed'] }, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({ venueId, type: { $in: ['shot_redeemed', 'transfer'] }, status: { $in: ['succeeded', 'redeemed'] }, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } })
    ]);
    const yesterdayRevenue = yesterdayRevenueAgg[0]?.total || 0;

    // Count active promotions
    const activePromos = venue.promotions.filter(p => p.isActive).length;

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      totalRedemptions,
      yesterdayRevenue: yesterdayRevenue.toFixed(2),
      yesterdayRedemptions,
      pendingPayouts: pendingPayouts.toFixed(2),
      activePromos,
      venueId: venueId.toString(),
      venueName: venue.name
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

module.exports = router;

