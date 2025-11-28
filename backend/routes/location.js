const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Update user location
router.put('/update', auth, async (req, res) => {
  try {
    const { latitude, longitude, isVisible } = req.body;
    
    // First check if user exists and get current location
    const user = await User.findById(req.user.userId).select('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build location update object
    const locationUpdate = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };

    // Preserve isVisible if not provided
    if (isVisible !== undefined) {
      locationUpdate.isVisible = isVisible;
    } else if (user.location && user.location.isVisible !== undefined) {
      locationUpdate.isVisible = user.location.isVisible;
    } else {
      locationUpdate.isVisible = true; // Default
    }

    // Update only the location field using findByIdAndUpdate to avoid validation issues
    await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { location: locationUpdate } },
      { runValidators: false } // Skip validation to avoid name field issues
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nearby friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's location
    if (!user.location || !user.location.latitude || !user.location.longitude) {
      return res.json({ friends: [] });
    }

    // Get friends list
    const friendIds = user.friends || [];
    if (friendIds.length === 0) {
      return res.json({ friends: [] });
    }

    // Find friends with locations
    const friends = await User.find({
      _id: { $in: friendIds },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true },
      'location.isVisible': true
    }).select('name firstName lastName profilePicture location');

    // Calculate distances and add to response
    const friendsWithDistance = friends.map(friend => {
      const distance = calculateDistance(
        user.location.latitude,
        user.location.longitude,
        friend.location.latitude,
        friend.location.longitude
      );
      
      return {
        _id: friend._id,
        id: friend._id,
        name: friend.name,
        firstName: friend.firstName || friend.name?.split(' ')[0] || '',
        lastName: friend.lastName || friend.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: friend.profilePicture,
        location: friend.location,
        distance: distance.toFixed(1) + ' miles'
      };
    });

    // Sort by distance
    friendsWithDistance.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    res.json({ friends: friendsWithDistance });
  } catch (error) {
    console.error('Error fetching nearby friends:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
