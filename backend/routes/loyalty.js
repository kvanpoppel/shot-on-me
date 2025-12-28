const express = require('express');
const VenueLoyalty = require('../models/VenueLoyalty');
const User = require('../models/User');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user's loyalty stats for a venue
router.get('/venue/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const loyalty = await VenueLoyalty.findOne({
      user: req.user.userId,
      venue: venueId
    }).populate('venue', 'name');

    if (!loyalty) {
      return res.json({
        checkInCount: 0,
        tier: 'bronze',
        streak: { current: 0, longest: 0 },
        badges: []
      });
    }

    res.json(loyalty);
  } catch (error) {
    console.error('Error fetching venue loyalty:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's loyalty stats across all venues
router.get('/user', auth, async (req, res) => {
  try {
    const loyalties = await VenueLoyalty.find({ user: req.user.userId })
      .populate('venue', 'name')
      .sort({ checkInCount: -1 });

    const stats = {
      totalCheckIns: loyalties.reduce((sum, l) => sum + l.checkInCount, 0),
      uniqueVenues: loyalties.length,
      totalSpent: loyalties.reduce((sum, l) => sum + (l.totalSpent || 0), 0),
      topVenues: loyalties.slice(0, 5).map(l => ({
        venue: l.venue,
        checkInCount: l.checkInCount,
        tier: l.tier
      })),
      badges: []
    };

    // Collect all badges
    loyalties.forEach(l => {
      if (l.badges && l.badges.length > 0) {
        stats.badges.push(...l.badges);
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user loyalty stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get venue leaderboard
router.get('/venue/:venueId/leaderboard', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { limit = 20 } = req.query;

    const loyalties = await VenueLoyalty.find({ venue: venueId })
      .populate('user', 'firstName lastName profilePicture')
      .sort({ checkInCount: -1 })
      .limit(parseInt(limit));

    const leaderboard = loyalties.map((loyalty, index) => ({
      rank: index + 1,
      user: {
        _id: loyalty.user._id,
        firstName: loyalty.user.firstName,
        lastName: loyalty.user.lastName,
        profilePicture: loyalty.user.profilePicture
      },
      checkInCount: loyalty.checkInCount,
      tier: loyalty.tier,
      streak: loyalty.streak
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

