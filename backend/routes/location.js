const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Update user location
router.put('/update', auth, async (req, res) => {
  try {
    const { latitude, longitude, isVisible, venueId } = req.body;
    
    // First check if user exists and get current location
    const user = await User.findById(req.user.userId).select('location locationHistory');
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

    // Add to location history (keep last 100 entries)
    const locationHistoryEntry = {
      latitude,
      longitude,
      timestamp: new Date(),
      venueId: venueId || null
    };

    // Update location and history
    const updateData = {
      $set: { location: locationUpdate },
      $push: {
        locationHistory: {
          $each: [locationHistoryEntry],
          $slice: -100 // Keep only last 100 entries
        }
      }
    };

    await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { runValidators: false } // Skip validation to avoid name field issues
    );

    // Check for nearby friends and promotions
    const io = req.app.get('io');
    if (io) {
      // Check for nearby friends (within 0.5 miles)
      const friends = await User.find({
        _id: { $in: user.friends || [] },
        'location.latitude': { $exists: true },
        'location.longitude': { $exists: true },
        'location.isVisible': true
      }).select('name firstName lastName profilePicture location');

      friends.forEach(friend => {
        const distance = calculateDistance(
          latitude,
          longitude,
          friend.location.latitude,
          friend.location.longitude
        );

        // Notify if friend is within 3 miles
        if (distance <= 3) {
          io.to(req.user.userId.toString()).emit('friend-nearby', {
            friend: {
              _id: friend._id,
              firstName: friend.firstName || friend.name?.split(' ')[0] || '',
              lastName: friend.lastName || friend.name?.split(' ').slice(1).join(' ') || '',
              profilePicture: friend.profilePicture,
              distance: distance.toFixed(2)
            }
          });
        }
      });

      // Check for nearby venues with promotions
      const Venue = require('../models/Venue');
      const venues = await Venue.find({ isActive: true });
      const now = new Date();

      venues.forEach(venue => {
        if (venue.location && venue.location.coordinates) {
          const [venueLon, venueLat] = venue.location.coordinates;
          const distance = calculateDistance(latitude, longitude, venueLat, venueLon);

          // Check if venue has active promotions
          const activePromos = venue.promotions?.filter(promo => {
            const startTime = new Date(promo.startTime);
            const endTime = new Date(promo.endTime);
            return promo.isActive && now >= startTime && now <= endTime;
          }) || [];

          // Notify if venue with promotion is within 5 miles
          if (activePromos.length > 0 && distance <= 5) {
            io.to(req.user.userId.toString()).emit('promotion-nearby', {
              venue: {
                _id: venue._id,
                name: venue.name,
                address: venue.address
              },
              promotion: activePromos[0],
              distance: distance.toFixed(2)
            });
          }
        }
      });
    }

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check proximity to venues
router.get('/check-proximity', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 2 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusMiles = parseFloat(radius);

    // Get all active venues
    const Venue = require('../models/Venue');
    const venues = await Venue.find({ isActive: true });

    // Check which venues are within radius
    const nearbyVenues = venues.filter(venue => {
      if (!venue.location || !venue.location.latitude || !venue.location.longitude) {
        return false;
      }
      
      const distance = calculateDistance(
        userLat,
        userLon,
        venue.location.latitude,
        venue.location.longitude
      );
      
      return distance <= radiusMiles;
    });

    res.json({
      isNearVenue: nearbyVenues.length > 0,
      nearbyVenues: nearbyVenues.map(v => ({
        _id: v._id,
        name: v.name,
        location: v.location
      })),
      radius: radiusMiles
    });
  } catch (error) {
    console.error('Error checking proximity:', error);
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
      
      // Calculate time since last update
      const lastUpdated = friend.location?.lastUpdated ? new Date(friend.location.lastUpdated) : new Date()
      const timeSinceUpdate = Date.now() - lastUpdated.getTime()
      const minutesAgo = Math.floor(timeSinceUpdate / 60000)
      const hoursAgo = Math.floor(minutesAgo / 60)
      
      let timeLabel = 'now'
      if (minutesAgo < 1) {
        timeLabel = 'now'
      } else if (minutesAgo < 60) {
        timeLabel = `${minutesAgo}m`
      } else if (hoursAgo < 24) {
        timeLabel = `${hoursAgo}h`
      } else {
        const daysAgo = Math.floor(hoursAgo / 24)
        timeLabel = `${daysAgo}d`
      }
      
      return {
        _id: friend._id,
        id: friend._id,
        name: friend.name,
        firstName: friend.firstName || friend.name?.split(' ')[0] || '',
        lastName: friend.lastName || friend.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: friend.profilePicture,
        location: friend.location,
        distance: distance.toFixed(1) + ' miles',
        lastUpdated: friend.location?.lastUpdated || lastUpdated,
        timeLabel: timeLabel
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
