const express = require('express');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');
const { handleCheckIn } = require('../utils/gamification');
const analytics = require('../utils/analytics');

const router = express.Router();

// Get user's recent check-ins (GET /api/checkins)
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const checkIns = await CheckIn.find({ user: req.user.userId })
      .populate('venue', 'name address location image')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ checkIns });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check in at a venue
router.post('/', auth, async (req, res) => {
  try {
    const { venueId, latitude, longitude, notes, referralId } = req.body;

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
      notes: notes?.trim() || '',
      // Store referral info if present
      referredBy: referralId || undefined
    });

    await checkIn.save();
    await checkIn.populate('venue', 'name address location');
    await checkIn.populate('user', 'name firstName lastName profilePicture');

    // Update venue loyalty tracking
    const VenueLoyalty = require('../models/VenueLoyalty');
    let venueLoyalty = await VenueLoyalty.findOne({ user: req.user.userId, venue: venueId });
    
    if (!venueLoyalty) {
      venueLoyalty = new VenueLoyalty({
        user: req.user.userId,
        venue: venueId,
        checkInCount: 1,
        firstCheckIn: new Date(),
        lastCheckIn: new Date(),
        tier: 'bronze',
        streak: { current: 1, longest: 1, lastCheckInDate: today }
      });
    } else {
      venueLoyalty.checkInCount += 1;
      venueLoyalty.lastCheckIn = new Date();
      
      // Update streak for this venue
      const lastCheckInDate = venueLoyalty.streak?.lastCheckInDate 
        ? new Date(venueLoyalty.streak.lastCheckInDate)
        : null;
      
      if (lastCheckInDate) {
        lastCheckInDate.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastCheckInDate.getTime() === yesterday.getTime()) {
          venueLoyalty.streak.current = (venueLoyalty.streak.current || 0) + 1;
        } else if (lastCheckInDate.getTime() !== today.getTime()) {
          venueLoyalty.streak.current = 1;
        }
      } else {
        venueLoyalty.streak.current = 1;
      }
      
      venueLoyalty.streak.lastCheckInDate = today;
      if (venueLoyalty.streak.current > (venueLoyalty.streak.longest || 0)) {
        venueLoyalty.streak.longest = venueLoyalty.streak.current;
      }
      
      // Update tier based on check-ins
      if (venueLoyalty.checkInCount >= 20) {
        venueLoyalty.tier = 'vip';
      } else if (venueLoyalty.checkInCount >= 10) {
        venueLoyalty.tier = 'platinum';
      } else if (venueLoyalty.checkInCount >= 5) {
        venueLoyalty.tier = 'gold';
      } else if (venueLoyalty.checkInCount >= 2) {
        venueLoyalty.tier = 'silver';
      }
    }
    
    await venueLoyalty.save();

    // Track check-in
    analytics.trackCheckIn(req.user.userId, venueId, points);

    // Handle gamification (async, don't wait)
    handleCheckIn(req.user.userId, venueId).catch(err => console.error('Gamification error:', err));

    // Process venue referral if this check-in was via referral (async, don't wait)
    // Check if user came from a venue referral link
    const venueReferralModule = require('./venue-referrals');
    if (venueReferralModule.processVenueReferral) {
      venueReferralModule.processVenueReferral(checkIn._id, req.user.userId).catch(err => 
        console.error('Venue referral processing error:', err)
      );
    }

    // Add venue to favorites if not already
    if (!user.favoriteVenues.includes(venueId)) {
      user.favoriteVenues.push(venueId);
      await user.save();
    }

    // Auto-create story for check-in
    try {
      const Story = require('../models/Story');
      const cloudinary = require('cloudinary').v2;
      
      // Configure Cloudinary if available
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });

        // Use venue image if available, otherwise create a default check-in image
        let imageUrl = venue.image || venue.images?.[0];
        
        if (!imageUrl) {
          // Create a simple check-in story image using Cloudinary text overlay
          // This creates a default image with venue name
          const defaultImageUrl = cloudinary.url('sample', {
            transformation: [
              { width: 1080, height: 1920, crop: 'fill', background: 'rgb:1a1a2e' },
              { overlay: { text: venue.name, font_family: 'Arial', font_size: 60, font_weight: 'bold' }, color: '#FFD700', y: -100 },
              { overlay: { text: '📍 Checked In', font_family: 'Arial', font_size: 40 }, color: '#FFFFFF', y: 100 }
            ],
            format: 'jpg'
          });
          imageUrl = defaultImageUrl;
        }

        // Upload venue image or default to Cloudinary if not already there
        let storyMediaUrl = imageUrl;
        let storyPublicId = `shot-on-me/stories/checkin_${checkIn._id}`;
        
        // If image is not from Cloudinary, upload it
        if (!imageUrl.includes('cloudinary.com') && !imageUrl.includes('res.cloudinary.com')) {
          try {
            const uploadResult = await cloudinary.uploader.upload(imageUrl, {
              folder: 'shot-on-me/stories',
              public_id: storyPublicId,
              resource_type: 'image'
            });
            storyMediaUrl = uploadResult.secure_url;
            storyPublicId = uploadResult.public_id;
          } catch (uploadError) {
            console.warn('⚠️ Could not upload venue image, using default:', uploadError);
            // Use a placeholder if upload fails
            storyMediaUrl = 'https://via.placeholder.com/1080x1920/1a1a2e/FFD700?text=' + encodeURIComponent(venue.name + ' Check-In');
          }
        } else {
          // Extract public_id from Cloudinary URL if it's already there
          const urlMatch = imageUrl.match(/\/v\d+\/(.+)\.(jpg|png|jpeg)/);
          if (urlMatch) {
            storyPublicId = urlMatch[1];
          }
        }

        // Create story with 24-hour expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = new Story({
          author: req.user.userId,
          media: {
            url: storyMediaUrl,
            type: 'image',
            publicId: storyPublicId
          },
          caption: `Checked in at ${venue.name} 🍻`,
          expiresAt: expiresAt
        });

        await story.save();
        console.log(`✅ Auto-created story for check-in at ${venue.name}`);
      } else {
        console.warn('⚠️ Cloudinary not configured, skipping story creation');
      }
    } catch (storyError) {
      // Don't fail check-in if story creation fails
      console.error('⚠️ Failed to auto-create story for check-in:', storyError);
    }
    
    // Notify friends about check-in
    if (user.friends && user.friends.length > 0) {
      const Notification = require('../models/Notification');
      const io = req.app.get('io');
      
      const notificationPromises = user.friends.map(async (friendId) => {
        const notification = new Notification({
          recipient: friendId,
          actor: req.user.userId,
          type: 'check_in',
          content: `${user.firstName || user.name} checked in at ${venue.name}`,
          relatedVenue: venueId
        });
        await notification.save();
        
        // Emit real-time notification
        if (io) {
          io.to(friendId.toString()).emit('new-notification', {
            type: 'check_in',
            message: notification.content,
            venueId: venueId
          });
        }
      });
      
      await Promise.all(notificationPromises);
      console.log(`📬 Notified ${user.friends.length} friends about check-in`);
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

