const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/venues/featured - Get featured/promoted venues
router.get('/featured', auth, async (req, res) => {
  try {
    const now = new Date();
    const getTierWeight = (tier) => {
      switch (tier) {
        case 'enterprise': return 4;
        case 'premium': return 3;
        case 'basic': return 1;
        default: return 0;
      }
    };
    const rotateByWindow = (items, windowSeed) => {
      if (!Array.isArray(items) || items.length <= 1) return items || [];
      const offset = windowSeed % items.length;
      return [...items.slice(offset), ...items.slice(0, offset)];
    };
    const uniquePush = (target, item, seen) => {
      if (!item || !item._id) return;
      const id = item._id.toString();
      if (seen.has(id)) return;
      seen.add(id);
      target.push(item);
    };
    
    // Get venues that are featured or have premium/enterprise subscriptions
    const featuredVenues = await Venue.find({
      isActive: true,
      $or: [
        { isFeatured: true, $or: [{ featuredUntil: { $exists: false } }, { featuredUntil: { $gte: now } }] },
        { subscriptionTier: { $in: ['premium', 'enterprise'] }, $or: [{ subscriptionExpiresAt: { $exists: false } }, { subscriptionExpiresAt: { $gte: now } }] }
      ]
    })
      .select('name address description category promotions subscriptionTier isFeatured followerCount')
      .populate('owner', 'firstName lastName')
      .lean();
    
    // Filter to only show venues with active promotions
    const venuesWithActivePromos = featuredVenues.map(venue => {
      const activePromotions = (venue.promotions || []).filter((promo) => {
        if (!promo || !promo.isActive) return false;
        const startTime = promo.startTime ? new Date(promo.startTime) : null;
        const endTime = promo.endTime ? new Date(promo.endTime) : null;
        if (startTime && startTime > now) return false;
        if (endTime && endTime < now) return false;
        return true;
      });
      const spotlightScore = (
        (venue.isFeatured ? 50 : 0) +
        (getTierWeight(venue.subscriptionTier) * 20) +
        Math.min((venue.followerCount || 0), 100) +
        (activePromotions.length * 15)
      );
      return { ...venue, promotions: activePromotions, spotlightScore };
    }).filter(venue => venue.promotions && venue.promotions.length > 0);
    
    // Base ranking by weighted score
    const ranked = [...venuesWithActivePromos].sort((a, b) => b.spotlightScore - a.spotlightScore);
    
    // Placement guarantees with 6-hour rotation window
    const limit = 10;
    const windowSeed = Math.floor(now.getTime() / (1000 * 60 * 60 * 6));
    const enterprise = rotateByWindow(
      ranked.filter(v => v.subscriptionTier === 'enterprise'),
      windowSeed
    );
    const premiumOrHigher = rotateByWindow(
      ranked.filter(v => v.subscriptionTier === 'premium' || v.subscriptionTier === 'enterprise'),
      windowSeed + 1
    );
    
    const guaranteedEnterpriseSlots = Math.min(1, enterprise.length); // at least 1 enterprise if available
    const guaranteedPremiumSlots = Math.min(3, premiumOrHigher.length); // at least 3 premium+enterprise if available
    
    const selected = [];
    const seen = new Set();
    
    // Guarantee enterprise presence near the top
    for (let i = 0; i < guaranteedEnterpriseSlots; i += 1) {
      uniquePush(selected, enterprise[i], seen);
    }
    
    // Guarantee premium/enterprise visibility
    for (let i = 0; i < guaranteedPremiumSlots; i += 1) {
      uniquePush(selected, premiumOrHigher[i], seen);
    }
    
    // Fill remaining slots by overall weighted rank
    for (let i = 0; i < ranked.length && selected.length < limit; i += 1) {
      uniquePush(selected, ranked[i], seen);
    }

    res.json({
      venues: selected.slice(0, limit),
      placement: {
        windowHours: 6,
        guaranteedEnterpriseSlots,
        guaranteedPremiumOrHigherSlots: guaranteedPremiumSlots
      }
    });
  } catch (error) {
    console.error('Error fetching featured venues:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

module.exports = router;
