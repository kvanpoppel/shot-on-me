const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');

// GET /api/dashboard/stats - Get dashboard statistics for venue owner
router.get('/stats', auth, async (req, res) => {
  try {
    // Find venue owned by user
    const venue = await Venue.findOne({ owner: req.user.userId });
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

    // Count active promotions
    const activePromos = venue.promotions.filter(p => p.isActive).length;

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      totalRedemptions,
      pendingPayouts: pendingPayouts.toFixed(2),
      activePromos,
      venueId: venueId.toString(),
      venueName: venue.name
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

