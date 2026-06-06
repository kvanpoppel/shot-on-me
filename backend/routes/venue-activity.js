const express = require('express');
const CheckIn = require('../models/CheckIn');
const FeedPost = require('../models/FeedPost');
const Venue = require('../models/Venue');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get venue activity metrics
router.get('/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { period = '24h' } = req.query; // 24h, 7d, 30d

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setHours(now.getHours() - 24);
    }

    // Get check-ins
    const checkIns = await CheckIn.find({
      venue: venueId,
      createdAt: { $gte: startDate }
    })
      .populate('user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get posts tagged at venue
    const posts = await FeedPost.find({
      $or: [
        { 'checkIn.venue': venueId },
        { 'location.venue': venueId }
      ],
      createdAt: { $gte: startDate }
    })
      .populate('author', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get active users (users who checked in within last 2 hours)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const activeCheckIns = await CheckIn.find({
      venue: venueId,
      createdAt: { $gte: twoHoursAgo }
    }).distinct('user');

    const activeUsers = await User.find({
      _id: { $in: activeCheckIns }
    }).select('firstName lastName profilePicture');

    // Calculate metrics
    const totalCheckIns = await CheckIn.countDocuments({
      venue: venueId,
      createdAt: { $gte: startDate }
    });

    const totalPosts = await FeedPost.countDocuments({
      $or: [
        { 'checkIn.venue': venueId },
        { 'location.venue': venueId }
      ],
      createdAt: { $gte: startDate }
    });

    res.json({
      venueId,
      period,
      metrics: {
        checkIns: totalCheckIns,
        posts: totalPosts,
        activeUsers: activeUsers.length,
        totalActivity: totalCheckIns + totalPosts
      },
      recentCheckIns: checkIns,
      recentPosts: posts,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching venue activity:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Get trending venues (by activity)
router.get('/trending/list', auth, async (req, res) => {
  try {
    const { limit = 10, period = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setHours(now.getHours() - 24);
    }

    // Aggregate venue activity
    const checkInActivity = await CheckIn.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$venue',
          checkIns: { $sum: 1 },
          lastCheckIn: { $max: '$createdAt' }
        }
      }
    ]);

    const postActivity = await FeedPost.aggregate([
      {
        $match: {
          $or: [
            { 'checkIn.venue': { $exists: true } },
            { 'location.venue': { $exists: true } }
          ],
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$checkIn.venue', '$location.venue'] },
          posts: { $sum: 1 },
          lastPost: { $max: '$createdAt' }
        }
      }
    ]);

    // Combine activities
    const activityMap = new Map();
    
    checkInActivity.forEach(item => {
      if (!activityMap.has(item._id.toString())) {
        activityMap.set(item._id.toString(), {
          venueId: item._id,
          checkIns: 0,
          posts: 0,
          totalActivity: 0,
          lastActivity: item.lastCheckIn
        });
      }
      const venue = activityMap.get(item._id.toString());
      venue.checkIns = item.checkIns;
      venue.totalActivity += item.checkIns;
      if (new Date(item.lastCheckIn) > new Date(venue.lastActivity || 0)) {
        venue.lastActivity = item.lastCheckIn;
      }
    });

    postActivity.forEach(item => {
      if (!item._id) return;
      if (!activityMap.has(item._id.toString())) {
        activityMap.set(item._id.toString(), {
          venueId: item._id,
          checkIns: 0,
          posts: 0,
          totalActivity: 0,
          lastActivity: item.lastPost
        });
      }
      const venue = activityMap.get(item._id.toString());
      venue.posts = item.posts;
      venue.totalActivity += item.posts;
      if (new Date(item.lastPost) > new Date(venue.lastActivity || 0)) {
        venue.lastActivity = item.lastPost;
      }
    });

    // Sort by total activity
    const trendingVenues = Array.from(activityMap.values())
      .sort((a, b) => {
        // Primary sort: total activity
        if (b.totalActivity !== a.totalActivity) {
          return b.totalActivity - a.totalActivity;
        }
        // Secondary sort: most recent activity
        return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
      })
      .slice(0, Math.min(100, Math.max(1, parseInt(limit) || 20)));

    // Populate venue details
    const venueIds = trendingVenues.map(v => v.venueId);
    const venues = await Venue.find({ _id: { $in: venueIds }, isActive: true })
      .select('name address location category promotions');

    // Combine with activity data
    const venuesWithActivity = venues.map(venue => {
      const activity = activityMap.get(venue._id.toString()) || {
        checkIns: 0,
        posts: 0,
        totalActivity: 0,
        lastActivity: null
      };
      return {
        ...venue.toObject(),
        activity: {
          checkIns: activity.checkIns,
          posts: activity.posts,
          totalActivity: activity.totalActivity,
          lastActivity: activity.lastActivity
        }
      };
    });

    // Re-sort after populating (in case some venues weren't found)
    venuesWithActivity.sort((a, b) => 
      (b.activity?.totalActivity || 0) - (a.activity?.totalActivity || 0)
    );

    res.json({
      venues: venuesWithActivity,
      period,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error fetching trending venues:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Get trending venues based on friend activity (aggregated from user connections)
router.get('/trending/friends', auth, async (req, res) => {
  try {
    const { limit = 10, period = '24h' } = req.query;
    const User = require('../models/User');
    const currentUser = await User.findById(req.user.userId).select('friends');
    const friendIds = currentUser?.friends || [];

    if (friendIds.length === 0) {
      return res.json({ venues: [], period, message: 'No friends to aggregate activity from' });
    }

    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setHours(now.getHours() - 24);
    }

    // Aggregate check-ins from friends
    const friendCheckIns = await CheckIn.aggregate([
      {
        $match: {
          user: { $in: friendIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$venue',
          checkIns: { $sum: 1 },
          uniqueFriends: { $addToSet: '$user' },
          lastCheckIn: { $max: '$createdAt' }
        }
      }
    ]);

    // Aggregate posts from friends at venues
    const friendPosts = await FeedPost.aggregate([
      {
        $match: {
          author: { $in: friendIds },
          $or: [
            { 'checkIn.venue': { $exists: true } },
            { 'location.venue': { $exists: true } }
          ],
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$checkIn.venue', '$location.venue'] },
          posts: { $sum: 1 },
          uniqueFriends: { $addToSet: '$author' },
          lastPost: { $max: '$createdAt' }
        }
      }
    ]);

    // Combine friend activities
    const activityMap = new Map();
    
    friendCheckIns.forEach(item => {
      if (!activityMap.has(item._id.toString())) {
        activityMap.set(item._id.toString(), {
          venueId: item._id,
          checkIns: 0,
          posts: 0,
          totalActivity: 0,
          friendCount: 0,
          lastActivity: item.lastCheckIn
        });
      }
      const venue = activityMap.get(item._id.toString());
      venue.checkIns = item.checkIns;
      venue.totalActivity += item.checkIns;
      venue.friendCount = Math.max(venue.friendCount, item.uniqueFriends.length);
      if (new Date(item.lastCheckIn) > new Date(venue.lastActivity || 0)) {
        venue.lastActivity = item.lastCheckIn;
      }
    });

    friendPosts.forEach(item => {
      if (!item._id) return;
      if (!activityMap.has(item._id.toString())) {
        activityMap.set(item._id.toString(), {
          venueId: item._id,
          checkIns: 0,
          posts: 0,
          totalActivity: 0,
          friendCount: 0,
          lastActivity: item.lastPost
        });
      }
      const venue = activityMap.get(item._id.toString());
      venue.posts = item.posts;
      venue.totalActivity += item.posts;
      venue.friendCount = Math.max(venue.friendCount, item.uniqueFriends.length);
      if (new Date(item.lastPost) > new Date(venue.lastActivity || 0)) {
        venue.lastActivity = item.lastPost;
      }
    });

    // Sort by friend engagement (friend count first, then total activity)
    const trendingVenues = Array.from(activityMap.values())
      .sort((a, b) => {
        // Primary sort: number of unique friends
        if (b.friendCount !== a.friendCount) {
          return b.friendCount - a.friendCount;
        }
        // Secondary sort: total activity
        if (b.totalActivity !== a.totalActivity) {
          return b.totalActivity - a.totalActivity;
        }
        // Tertiary sort: most recent activity
        return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
      })
      .slice(0, Math.min(100, Math.max(1, parseInt(limit) || 20)));

    // Populate venue details
    const venueIds = trendingVenues.map(v => v.venueId);
    const venues = await Venue.find({ _id: { $in: venueIds }, isActive: true })
      .select('name address location category promotions');

    // Combine with activity data
    const venuesWithActivity = venues.map(venue => {
      const activity = activityMap.get(venue._id.toString()) || {
        checkIns: 0,
        posts: 0,
        totalActivity: 0,
        friendCount: 0,
        lastActivity: null
      };
      return {
        ...venue.toObject(),
        activity: {
          checkIns: activity.checkIns,
          posts: activity.posts,
          totalActivity: activity.totalActivity,
          friendCount: activity.friendCount,
          lastActivity: activity.lastActivity
        }
      };
    });

    // Re-sort after populating
    venuesWithActivity.sort((a, b) => {
      if ((b.activity?.friendCount || 0) !== (a.activity?.friendCount || 0)) {
        return (b.activity?.friendCount || 0) - (a.activity?.friendCount || 0);
      }
      return (b.activity?.totalActivity || 0) - (a.activity?.totalActivity || 0);
    });

    res.json({
      venues: venuesWithActivity,
      period,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error fetching friend-based trending venues:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Get venue-specific events and ongoing activities
router.get('/venue-events/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const Venue = require('../models/Venue');
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Get venue details
    const venue = await Venue.findById(venueId).select('name address promotions');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Get active promotions (ongoing events)
    const activePromotions = (venue.promotions || []).filter(promo => {
      const startTime = new Date(promo.startTime);
      const endTime = new Date(promo.endTime);
      return promo.isActive && now >= startTime && now <= endTime;
    });

    // Get recent check-ins (last 2 hours - active users)
    const recentCheckIns = await CheckIn.find({
      venue: venueId,
      createdAt: { $gte: twoHoursAgo }
    })
      .populate('user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent posts at venue (last 2 hours)
    const recentPosts = await FeedPost.find({
      $or: [
        { 'checkIn.venue': venueId },
        { 'location.venue': venueId }
      ],
      createdAt: { $gte: twoHoursAgo }
    })
      .populate('author', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get active users count
    const activeUserIds = new Set();
    recentCheckIns.forEach(ci => activeUserIds.add(ci.user._id.toString()));
    recentPosts.forEach(p => activeUserIds.add(p.author._id.toString()));

    res.json({
      venue: {
        _id: venue._id,
        name: venue.name,
        address: venue.address
      },
      ongoingEvents: activePromotions.map(promo => ({
        title: promo.title,
        description: promo.description,
        type: promo.type,
        startTime: promo.startTime,
        endTime: promo.endTime,
        timeRemaining: Math.max(0, new Date(promo.endTime).getTime() - now.getTime())
      })),
      activeUsers: activeUserIds.size,
      recentCheckIns: recentCheckIns.map(ci => ({
        user: ci.user,
        timestamp: ci.createdAt
      })),
      recentPosts: recentPosts.map(p => ({
        author: p.author,
        content: p.content,
        timestamp: p.createdAt
      })),
      generatedAt: now
    });
  } catch (error) {
    console.error('Error fetching venue events:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// ─── AI Vibes: personalized vibe ranking for home page ───
// GET /api/venue-activity/vibes — returns vibes ranked by user behavior + friend activity
const Payment = require('../models/Payment');

const VIBE_KEYS = [
  'happyHour', 'trivia', 'liveMusic', 'karaoke',
  'sportsTv', 'danceFloor', 'poolTables', 'outdoorSeating'
];

const VIBE_META = {
  happyHour:      { emoji: '🍻', label: 'Happy Hr' },
  trivia:         { emoji: '🧠', label: 'Trivia' },
  liveMusic:      { emoji: '🎸', label: 'Live Music' },
  karaoke:        { emoji: '🎤', label: 'Karaoke' },
  sportsTv:       { emoji: '🏈', label: 'Sports' },
  danceFloor:     { emoji: '🕺', label: 'Dancing' },
  poolTables:     { emoji: '🎱', label: 'Pool' },
  outdoorSeating: { emoji: '🌅', label: 'Outdoor' },
};

router.get('/vibes', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const scores = {};
    VIBE_KEYS.forEach(k => { scores[k] = { score: 0, friendsNow: 0, reason: null } });

    // 1. User explicit preferences (+5 per pref)
    const user = await User.findById(userId).select('venuePreferences friends').lean();
    const prefs = user?.venuePreferences || {};
    VIBE_KEYS.forEach(k => {
      if (prefs[k]) scores[k].score += 5;
    });

    // 2. Check-in history — which amenities has the user actually visited? (+2 per check-in, max 20)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCheckIns = await CheckIn.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).select('venue').lean();

    if (recentCheckIns.length > 0) {
      const checkedVenueIds = [...new Set(recentCheckIns.map(c => c.venue.toString()))];
      const checkedVenues = await Venue.find({ _id: { $in: checkedVenueIds } }).select('amenities').lean();
      checkedVenues.forEach(v => {
        const am = v.amenities || {};
        VIBE_KEYS.forEach(k => {
          if (am[k]) scores[k].score += 2;
        });
      });
    }

    // 3. Payment history — where has the user spent money? (+3 per payment venue, max 15)
    const recentPayments = await Payment.find({
      senderId: userId,
      venueId: { $exists: true, $ne: null },
      status: 'succeeded',
      source: { $ne: 'revig' },
      createdAt: { $gte: thirtyDaysAgo }
    }).select('venueId').lean();

    if (recentPayments.length > 0) {
      const paidVenueIds = [...new Set(recentPayments.map(p => p.venueId.toString()))];
      const paidVenues = await Venue.find({ _id: { $in: paidVenueIds } }).select('amenities').lean();
      paidVenues.forEach(v => {
        const am = v.amenities || {};
        VIBE_KEYS.forEach(k => {
          if (am[k]) scores[k].score += 3;
        });
      });
    }

    // 4. Friends tonight — which vibes are friends at right now? (+8 per friend, show count)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const friendIds = user?.friends || [];
    if (friendIds.length > 0) {
      const friendCheckIns = await CheckIn.find({
        user: { $in: friendIds },
        createdAt: { $gte: threeHoursAgo }
      }).select('venue').lean();

      const friendPayments = await Payment.find({
        senderId: { $in: friendIds },
        venueId: { $exists: true, $ne: null },
        status: 'succeeded',
        createdAt: { $gte: threeHoursAgo }
      }).select('venueId').lean();

      const friendVenueIds = [
        ...new Set([
          ...friendCheckIns.map(c => c.venue.toString()),
          ...friendPayments.map(p => p.venueId.toString())
        ])
      ];

      if (friendVenueIds.length > 0) {
        const friendVenues = await Venue.find({ _id: { $in: friendVenueIds } }).select('amenities').lean();
        friendVenues.forEach(v => {
          const am = v.amenities || {};
          VIBE_KEYS.forEach(k => {
            if (am[k]) {
              scores[k].score += 8;
              scores[k].friendsNow += 1;
            }
          });
        });
      }
    }

    // 5. Trending tonight — which vibes have the most activity citywide? (+1 per active venue)
    const activeVenues = await Venue.find({
      isActive: true,
      'promotions.isActive': true
    }).select('amenities').lean();

    activeVenues.forEach(v => {
      const am = v.amenities || {};
      VIBE_KEYS.forEach(k => {
        if (am[k]) scores[k].score += 1;
      });
    });

    // Build response — sorted by score, add reasons
    const vibes = VIBE_KEYS.map(k => {
      const s = scores[k];
      let reason = null;
      if (s.friendsNow > 0) {
        reason = s.friendsNow === 1 ? '1 friend here now' : `${s.friendsNow} friends here now`;
      } else if (s.score >= 10 && prefs[k]) {
        reason = 'Your vibe';
      } else if (s.score >= 8) {
        reason = 'Based on your history';
      }

      return {
        key: k,
        ...VIBE_META[k],
        score: s.score,
        friendsNow: s.friendsNow,
        reason,
      };
    }).sort((a, b) => b.score - a.score);

    res.json({ vibes });
  } catch (error) {
    console.error('Error fetching vibes:', error);
    // Fallback: return default order
    const vibes = VIBE_KEYS.map(k => ({ key: k, ...VIBE_META[k], score: 0, friendsNow: 0, reason: null }));
    res.json({ vibes });
  }
});

module.exports = router;

