const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const CheckIn = require('../models/CheckIn');
const FeedPost = require('../models/FeedPost');

// Get "Tonight" feed - who's out, trending venues, active promotions
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's location or use provided coordinates
    const userLat = latitude || user.location?.latitude;
    const userLng = longitude || user.location?.longitude;

    // 1. Friends who are out tonight (checked in today)
    const friendsOut = await CheckIn.find({
      user: { $in: user.friends || [] },
      createdAt: { $gte: today }
    })
      .populate('user', 'name profilePicture')
      .populate('venue', 'name address location')
      .sort({ createdAt: -1 })
      .limit(20);

    // 2. Trending venues (most check-ins today)
    let trendingVenuesQuery = { isActive: true };
    if (userLat && userLng) {
      trendingVenuesQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(userLng), parseFloat(userLat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const trendingVenues = await CheckIn.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$venue',
          checkInCount: { $sum: 1 }
        }
      },
      {
        $sort: { checkInCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const venueIds = trendingVenues.map(v => v._id);
    const venues = await Venue.find({
      _id: { $in: venueIds },
      isActive: true
    }).populate('owner', 'name');

    const trendingVenuesWithDetails = venues.map(venue => {
      const stats = trendingVenues.find(v => v._id.toString() === venue._id.toString());
      return {
        ...venue.toObject(),
        checkInsToday: stats?.checkInCount || 0
      };
    }).sort((a, b) => b.checkInsToday - a.checkInsToday);

    // 3. Active promotions/flash deals tonight
    const venuesWithPromotions = await Venue.find({
      isActive: true,
      'promotions.isActive': true,
      'promotions.validUntil': { $gte: now }
    }).limit(20);

    const activePromotions = [];
    venuesWithPromotions.forEach(venue => {
      venue.promotions.forEach(promo => {
        if (promo.isActive && (!promo.validUntil || promo.validUntil >= now)) {
          // Check if it's active right now (for time-based promotions)
          const isActiveNow = !promo.startTime || (promo.startTime <= now && (!promo.endTime || promo.endTime >= now));
          if (isActiveNow) {
            activePromotions.push({
              ...promo.toObject(),
              venue: {
                id: venue._id,
                name: venue.name,
                address: venue.address,
                location: venue.location
              }
            });
          }
        }
      });
    });

    // Sort by flash deals first, then by points reward
    activePromotions.sort((a, b) => {
      if (a.isFlashDeal && !b.isFlashDeal) return -1;
      if (!a.isFlashDeal && b.isFlashDeal) return 1;
      return (b.pointsReward || 0) - (a.pointsReward || 0);
    });

    // 4. Events happening tonight
    const eventsTonight = await Event.find({
      isActive: true,
      startTime: { $lte: tomorrow },
      endTime: { $gte: now }
    })
      .populate('venue', 'name address location')
      .sort({ startTime: 1 })
      .limit(10);

    // 5. Recent posts from friends
    const recentPosts = await FeedPost.find({
      author: { $in: user.friends || [] },
      createdAt: { $gte: today }
    })
      .populate('author', 'name profilePicture')
      .populate('location')
      .sort({ createdAt: -1 })
      .limit(10);

    // 6. Who's going out (users who checked in today)
    const usersOutCheckIns = await CheckIn.find({
      createdAt: { $gte: today },
      user: { $ne: user._id }
    })
      .populate('user', 'name profilePicture')
      .populate('venue', 'name')
      .limit(20);
    
    // Get unique users
    const uniqueUserIds = [...new Set(usersOutCheckIns.map(c => c.user._id.toString()))];
    const usersOut = usersOutCheckIns.filter((c, index, self) => 
      uniqueUserIds.indexOf(c.user._id.toString()) === index
    ).map(c => c.user);

    res.json({
      friendsOut: friendsOut.map(c => ({
        user: c.user,
        venue: c.venue,
        checkedInAt: c.createdAt
      })),
      trendingVenues: trendingVenuesWithDetails,
      activePromotions: activePromotions.slice(0, 15),
      eventsTonight,
      recentPosts,
      usersOut: usersOut.length,
      timestamp: now
    });
  } catch (error) {
    console.error('Error fetching tonight feed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get who's at a specific venue
router.get('/venue/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIns = await CheckIn.find({
      venue: venueId,
      createdAt: { $gte: today }
    })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 });

    const user = await User.findById(req.user.userId);
    const friendsAtVenue = checkIns.filter(c => 
      user.friends?.some(f => f.toString() === c.user._id.toString())
    );

    res.json({
      totalCheckIns: checkIns.length,
      friendsAtVenue: friendsAtVenue.map(c => ({
        user: c.user,
        checkedInAt: c.createdAt
      })),
      allCheckIns: checkIns.map(c => ({
        user: c.user,
        checkedInAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching venue attendees:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

