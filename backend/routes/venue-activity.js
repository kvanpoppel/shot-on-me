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
    res.status(500).json({ message: 'Server error', error: error.message });
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
      .slice(0, parseInt(limit));

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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

