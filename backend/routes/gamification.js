const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Payment = require('../models/Payment');
const CheckIn = require('../models/CheckIn');
const FeedPost = require('../models/FeedPost');

// Get user's badges and achievements
router.get('/badges', auth, async (req, res) => {
  try {
    const userBadges = await UserBadge.find({ user: req.user.userId })
      .populate('badge')
      .sort({ unlockedAt: -1 });

    // Get all available badges to show progress
    const allBadges = await Badge.find({ isActive: true }).sort({ category: 1, pointsReward: -1 });

    // Calculate progress for badges user doesn't have yet
    const user = await User.findById(req.user.userId);
    const badgesWithProgress = await Promise.all(
      allBadges.map(async (badge) => {
        const userBadge = userBadges.find(ub => ub.badge._id.toString() === badge._id.toString());
        if (userBadge) {
          return { ...badge.toObject(), unlocked: true, unlockedAt: userBadge.unlockedAt };
        }

        // Calculate progress
        let currentValue = 0;
        switch (badge.criteria.type) {
          case 'total_sent':
            currentValue = user.totalSent || 0;
            break;
          case 'total_received':
            currentValue = user.totalReceived || 0;
            break;
          case 'check_ins':
            currentValue = user.totalCheckIns || 0;
            break;
          case 'friends':
            currentValue = user.friends?.length || 0;
            break;
          case 'posts':
            currentValue = user.stats?.postsCount || 0;
            break;
          case 'streak':
            currentValue = user.checkInStreak?.current || 0;
            break;
          case 'venue_visits':
            currentValue = user.stats?.venuesVisited || 0;
            break;
          case 'referrals':
            currentValue = user.stats?.referralsCount || 0;
            break;
          case 'points':
            currentValue = user.points || 0;
            break;
        }

        const progress = Math.min(100, (currentValue / badge.criteria.value) * 100);
        return { ...badge.toObject(), unlocked: false, progress, currentValue };
      })
    );

    res.json({
      badges: badgesWithProgress,
      unlockedCount: userBadges.length,
      totalCount: allBadges.length
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's points and stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('points totalSent totalReceived totalCheckIns checkInStreak loginStreak stats friends');

    const userBadges = await UserBadge.countDocuments({ user: req.user.userId });

    res.json({
      points: user.points || 0,
      totalSent: user.totalSent || 0,
      totalReceived: user.totalReceived || 0,
      totalCheckIns: user.totalCheckIns || 0,
      checkInStreak: user.checkInStreak || { current: 0, longest: 0 },
      loginStreak: user.loginStreak || { current: 0, longest: 0 },
      badgesUnlocked: userBadges,
      friendsCount: user.friends?.length || 0,
      postsCount: user.stats?.postsCount || 0,
      venuesVisited: user.stats?.venuesVisited || 0,
      referralsCount: user.stats?.referralsCount || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check and award badges (called after user actions)
router.post('/check-badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const newlyUnlocked = [];

    // Get all active badges
    const badges = await Badge.find({ isActive: true });

    for (const badge of badges) {
      // Check if user already has this badge
      const existingBadge = await UserBadge.findOne({ user: user._id, badge: badge._id });
      if (existingBadge) continue;

      // Check if user meets criteria
      let meetsCriteria = false;
      let currentValue = 0;

      switch (badge.criteria.type) {
        case 'total_sent':
          currentValue = user.totalSent || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'total_received':
          currentValue = user.totalReceived || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'check_ins':
          currentValue = user.totalCheckIns || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'friends':
          currentValue = user.friends?.length || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'posts':
          currentValue = user.stats?.postsCount || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'streak':
          currentValue = user.checkInStreak?.current || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'venue_visits':
          currentValue = user.stats?.venuesVisited || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'referrals':
          currentValue = user.stats?.referralsCount || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
        case 'points':
          currentValue = user.points || 0;
          meetsCriteria = currentValue >= badge.criteria.value;
          break;
      }

      if (meetsCriteria) {
        // Award badge
        const userBadge = new UserBadge({
          user: user._id,
          badge: badge._id,
          progress: 100
        });
        await userBadge.save();

        // Award points if badge has point reward
        if (badge.pointsReward > 0) {
          user.points = (user.points || 0) + badge.pointsReward;
          await user.save();
        }

        newlyUnlocked.push(badge);
      }
    }

    res.json({
      newlyUnlocked: newlyUnlocked.length,
      badges: newlyUnlocked
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get leaderboards
router.get('/leaderboards', auth, async (req, res) => {
  try {
    const { type = 'generous', limit = 50 } = req.query;

    let leaderboard = [];

    switch (type) {
      case 'generous': // Most money sent
        leaderboard = await User.find({ userType: 'user' })
          .select('name profilePicture totalSent points')
          .sort({ totalSent: -1 })
          .limit(parseInt(limit));
        break;

      case 'active': // Most check-ins
        leaderboard = await User.find({ userType: 'user' })
          .select('name profilePicture totalCheckIns points')
          .sort({ totalCheckIns: -1 })
          .limit(parseInt(limit));
        break;

      case 'social': // Most friends
        leaderboard = await User.find({ userType: 'user' })
          .select('name profilePicture friends points')
          .sort({ 'friends': -1 })
          .limit(parseInt(limit))
          .lean();
        leaderboard = leaderboard.map(u => ({
          ...u,
          friendsCount: u.friends?.length || 0
        })).sort((a, b) => b.friendsCount - a.friendsCount);
        break;

      case 'points': // Most points
        leaderboard = await User.find({ userType: 'user' })
          .select('name profilePicture points')
          .sort({ points: -1 })
          .limit(parseInt(limit));
        break;

      case 'streak': // Longest check-in streak
        leaderboard = await User.find({ userType: 'user' })
          .select('name profilePicture checkInStreak')
          .sort({ 'checkInStreak.longest': -1 })
          .limit(parseInt(limit));
        break;
    }

    // Add user's rank
    const user = await User.findById(req.user.userId);
    let userRank = null;
    
    if (type === 'generous') {
      const rank = await User.countDocuments({ totalSent: { $gt: user.totalSent || 0 } });
      userRank = rank + 1;
    } else if (type === 'active') {
      const rank = await User.countDocuments({ totalCheckIns: { $gt: user.totalCheckIns || 0 } });
      userRank = rank + 1;
    } else if (type === 'points') {
      const rank = await User.countDocuments({ points: { $gt: user.points || 0 } });
      userRank = rank + 1;
    }

    res.json({
      leaderboard,
      userRank,
      type
    });
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

