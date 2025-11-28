const express = require('express');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// Check in at a venue
router.post('/', auth, async (req, res) => {
  try {
    const { venueId, latitude, longitude, notes } = req.body;

    if (!venueId) {
      return res.status(400).json({ message: 'Venue ID is required' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user already checked in within the last hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentCheckIn = await CheckIn.findOne({
      user: req.user.userId,
      venue: venueId,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentCheckIn) {
      return res.status(400).json({ 
        message: 'You already checked in at this venue recently. Please wait before checking in again.',
        lastCheckIn: recentCheckIn
      });
    }

    // Calculate points (base 10, bonus for streaks)
    const user = await User.findById(req.user.userId);
    let points = 10;
    let reward = '';
    
    // Check for streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckInDate = user.checkInStreak?.lastCheckInDate 
      ? new Date(user.checkInStreak.lastCheckInDate)
      : null;
    
    if (lastCheckInDate) {
      lastCheckInDate.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastCheckInDate.getTime() === yesterday.getTime()) {
        // Continuing streak
        const newStreak = (user.checkInStreak?.current || 0) + 1;
        points += Math.min(newStreak * 2, 50); // Bonus points for streak, max 50
        reward = `Streak bonus! ${newStreak} day streak!`;
      } else if (lastCheckInDate.getTime() === today.getTime()) {
        // Already checked in today
        return res.status(400).json({ message: 'You already checked in today' });
      } else {
        // Streak broken
        user.checkInStreak.current = 1;
      }
    } else {
      // First check-in
      user.checkInStreak.current = 1;
    }

    // Update streak
    user.checkInStreak.lastCheckInDate = today;
    if ((user.checkInStreak.current || 1) > (user.checkInStreak.longest || 0)) {
      user.checkInStreak.longest = user.checkInStreak.current;
    }

    // Add points
    user.points = (user.points || 0) + points;
    await user.save();

    // Create check-in
    const checkIn = new CheckIn({
      user: req.user.userId,
      venue: venueId,
      points: points,
      reward: reward,
      location: latitude && longitude ? { latitude, longitude } : undefined,
      notes: notes?.trim() || ''
    });

    await checkIn.save();
    await checkIn.populate('venue', 'name address location');
    await checkIn.populate('user', 'name firstName lastName profilePicture');

    // Add venue to favorites if not already
    if (!user.favoriteVenues.includes(venueId)) {
      user.favoriteVenues.push(venueId);
      await user.save();
    }

    res.status(201).json({
      message: 'Checked in successfully!',
      checkIn,
      pointsEarned: points,
      totalPoints: user.points,
      streak: user.checkInStreak.current,
      reward: reward || undefined
    });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's check-in history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const checkIns = await CheckIn.find({ user: req.user.userId })
      .populate('venue', 'name address location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ checkIns });
  } catch (error) {
    console.error('Error fetching check-in history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get check-in leaderboard for a venue
router.get('/leaderboard/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { limit = 20 } = req.query;

    // Get top check-in users for this venue
    const checkIns = await CheckIn.aggregate([
      { $match: { venue: require('mongoose').Types.ObjectId(venueId) } },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          lastCheckIn: { $max: '$createdAt' },
          totalPoints: { $sum: '$points' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Populate user info
    const userIds = checkIns.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name firstName lastName profilePicture points');

    const leaderboard = checkIns.map((checkIn, index) => {
      const user = users.find(u => u._id.toString() === checkIn._id.toString());
      return {
        rank: index + 1,
        user: {
          _id: user?._id,
          firstName: user?.firstName || user?.name?.split(' ')[0] || '',
          lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
          profilePicture: user?.profilePicture
        },
        checkInCount: checkIn.count,
        totalPoints: checkIn.totalPoints,
        lastCheckIn: checkIn.lastCheckIn
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalCheckIns = await CheckIn.countDocuments({ user: req.user.userId });
    const uniqueVenues = await CheckIn.distinct('venue', { user: req.user.userId });
    const totalPoints = await CheckIn.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId(req.user.userId) } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    res.json({
      totalCheckIns,
      uniqueVenues: uniqueVenues.length,
      totalPoints: totalPoints[0]?.total || 0,
      currentPoints: user.points || 0,
      streak: {
        current: user.checkInStreak?.current || 0,
        longest: user.checkInStreak?.longest || 0
      },
      favoriteVenues: user.favoriteVenues?.length || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

