const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Notification = require('../models/Notification');

// Follow a venue
router.post('/:venueId/follow', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const userId = req.user.userId;

    // Check if venue exists
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is already following
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.followedVenues.includes(venueId)) {
      return res.status(400).json({ message: 'Already following this venue' });
    }

    // Add venue to user's followed venues
    user.followedVenues.push(venueId);
    await user.save();

    // Add user to venue's followers and update count
    if (!venue.followers.includes(userId)) {
      venue.followers.push(userId);
      venue.followerCount = venue.followers.length;
      await venue.save();
    }

    res.json({ 
      message: 'Successfully followed venue',
      followerCount: venue.followerCount
    });
  } catch (error) {
    console.error('Error following venue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unfollow a venue
router.delete('/:venueId/follow', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const userId = req.user.userId;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove venue from user's followed venues
    user.followedVenues = user.followedVenues.filter(
      id => id.toString() !== venueId
    );
    await user.save();

    // Remove user from venue's followers and update count
    venue.followers = venue.followers.filter(
      id => id.toString() !== userId
    );
    venue.followerCount = venue.followers.length;
    await venue.save();

    res.json({ 
      message: 'Successfully unfollowed venue',
      followerCount: venue.followerCount
    });
  } catch (error) {
    console.error('Error unfollowing venue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if user is following venue
router.get('/:venueId/follow-status', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = user.followedVenues.some(
      id => id.toString() === venueId
    );

    res.json({ isFollowing });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's followed venues
router.get('/following', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('followedVenues')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followedVenueIds = user.followedVenues || [];
    
    if (followedVenueIds.length === 0) {
      return res.json({ 
        followedVenues: [],
        count: 0
      });
    }

    // Fetch venues with only essential fields for faster query
    const venues = await Venue.find({ 
      _id: { $in: followedVenueIds },
      isActive: true 
    })
      .select('name address location category followerCount rating promotions')
      .lean();

    // Sort venues to match the order in followedVenues array
    const venueMap = new Map(venues.map(v => [v._id.toString(), v]));
    const sortedVenues = followedVenueIds
      .map(id => venueMap.get(id.toString()))
      .filter(Boolean); // Remove any null/undefined venues

    res.json({ 
      followedVenues: sortedVenues,
      count: sortedVenues.length
    });
  } catch (error) {
    console.error('Error fetching followed venues:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get venue followers (venue owners only, privacy-protected)
router.get('/:venueId/followers', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const venue = await Venue.findById(venueId);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Only venue owner can see followers
    if (venue.owner.toString() !== req.user.userId.toString() && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Privacy-protected: Only return aggregated data, not individual user details
    const followers = await User.find({ 
      _id: { $in: venue.followers } 
    }).select('name profilePicture createdAt').limit(100);

    res.json({ 
      followers: followers.map(f => ({
        id: f._id,
        name: f.name,
        profilePicture: f.profilePicture,
        joinedAt: f.createdAt
      })),
      totalCount: venue.followerCount
    });
  } catch (error) {
    console.error('Error fetching venue followers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


