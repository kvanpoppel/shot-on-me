const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/venues/featured - Get featured/promoted venues
router.get('/featured', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // Get venues that are featured or have premium/enterprise subscriptions
    const featuredVenues = await Venue.find({
      isActive: true,
      $or: [
        { isFeatured: true, $or: [{ featuredUntil: { $exists: false } }, { featuredUntil: { $gte: now } }] },
        { subscriptionTier: { $in: ['premium', 'enterprise'] }, $or: [{ subscriptionExpiresAt: { $exists: false } }, { subscriptionExpiresAt: { $gte: now } }] }
      ]
    })
      .select('name address description category promotions subscriptionTier isFeatured')
      .populate('owner', 'firstName lastName')
      .sort({ subscriptionTier: -1, isFeatured: -1, followerCount: -1 })
      .limit(10)
      .lean();
    
    // Filter to only show venues with active promotions
    const venuesWithActivePromos = featuredVenues.map(venue => {
      const activePromotions = venue.promotions.filter((promo) => {
        if (!promo.isActive) return false;
        const startTime = new Date(promo.startTime);
        const endTime = new Date(promo.endTime);
        return now >= startTime && now <= endTime;
      });
      return { ...venue, promotions: activePromotions };
    }).filter(venue => venue.promotions.length > 0);

    res.json({ venues: venuesWithActivePromos });
  } catch (error) {
    console.error('Error fetching featured venues:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
