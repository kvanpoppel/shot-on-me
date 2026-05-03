const express = require('express');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Payment = require('../models/Payment');
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

    // Add to location history — prune entries older than 30 days AND cap at 100
    // Uses aggregation pipeline update so filter + slice happen atomically
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const locationHistoryEntry = {
      latitude,
      longitude,
      timestamp: new Date(),
      venueId: venueId || null
    };

    await User.findByIdAndUpdate(
      req.user.userId,
      [
        {
          $set: {
            location: locationUpdate,
            locationHistory: {
              $slice: [
                {
                  $filter: {
                    input: { $concatArrays: [{ $ifNull: ['$locationHistory', []] }, [locationHistoryEntry]] },
                    as: 'entry',
                    cond: { $gte: ['$$entry.timestamp', thirtyDaysAgo] }
                  }
                },
                -100
              ]
            }
          }
        }
      ],
      { runValidators: false }
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
          io.to(`user-${req.user.userId.toString()}`).emit('friend-nearby', {
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
            io.to(`user-${req.user.userId.toString()}`).emit('promotion-nearby', {
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
    res.status(500).json({ message: 'Server error'});
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
    res.status(500).json({ message: 'Server error'});
  }
});

// Get friends out tonight — based on check-ins and transactions, not live location
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendIds = user.friends || [];
    if (friendIds.length === 0) {
      return res.json({ friends: [] });
    }

    // Only show activity from the last 3 hours
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // Fetch recent check-ins and venue transactions in parallel
    const [recentCheckIns, recentPayments] = await Promise.all([
      CheckIn.find({
        user: { $in: friendIds },
        createdAt: { $gte: cutoff }
      }).populate('venue', 'name address').sort({ createdAt: -1 }),
      Payment.find({
        senderId: { $in: friendIds },
        venueId: { $exists: true, $ne: null },
        status: 'succeeded',
        createdAt: { $gte: cutoff }
      }).populate('venueId', 'name address').sort({ createdAt: -1 })
    ]);

    // Build a map of friend -> most recent venue activity
    const friendActivity = new Map();

    // Check-ins take priority
    for (const ci of recentCheckIns) {
      const fid = ci.user.toString();
      if (!friendActivity.has(fid)) {
        friendActivity.set(fid, {
          venueId: ci.venue?._id,
          venueName: ci.venue?.name,
          activityTime: ci.createdAt,
          source: 'checkin'
        });
      }
    }

    // Fill in from transactions if no check-in
    for (const pay of recentPayments) {
      const fid = pay.senderId.toString();
      if (!friendActivity.has(fid)) {
        friendActivity.set(fid, {
          venueId: pay.venueId?._id,
          venueName: pay.venueId?.name,
          activityTime: pay.createdAt,
          source: 'transaction'
        });
      }
    }

    if (friendActivity.size === 0) {
      return res.json({ friends: [] });
    }

    // Fetch friend profiles
    const activeFriendIds = Array.from(friendActivity.keys());
    const friends = await User.find({
      _id: { $in: activeFriendIds }
    }).select('name firstName lastName profilePicture');

    const result = friends.map(friend => {
      const activity = friendActivity.get(friend._id.toString());
      const minutesAgo = Math.floor((Date.now() - activity.activityTime.getTime()) / 60000);
      let timeLabel = 'now';
      if (minutesAgo >= 60) {
        timeLabel = `${Math.floor(minutesAgo / 60)}h ago`;
      } else if (minutesAgo >= 1) {
        timeLabel = `${minutesAgo}m ago`;
      }

      return {
        _id: friend._id,
        id: friend._id,
        name: friend.name,
        firstName: friend.firstName || friend.name?.split(' ')[0] || '',
        lastName: friend.lastName || friend.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: friend.profilePicture,
        currentVenueName: activity.venueName,
        currentVenueId: activity.venueId,
        activityTime: activity.activityTime,
        timeLabel
      };
    });

    // Sort by most recent activity first
    result.sort((a, b) => b.activityTime - a.activityTime);

    res.json({ friends: result });
  } catch (error) {
    console.error('Error fetching friends out tonight:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear location history — GDPR / user privacy control
router.delete('/history', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { locationHistory: [] } },
      { runValidators: false }
    );
    res.json({ message: 'Location history cleared' });
  } catch (error) {
    console.error('Error clearing location history:', error);
    res.status(500).json({ message: 'Server error'});
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
