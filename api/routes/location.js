import express from 'express';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Helper function to check for nearby venues with active promotions
async function checkNearbyVenuesWithPromotions(userLat, userLon, userId, radiusKm = 2) {
  try {
    const venues = await Venue.find({
      isActive: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).populate('promotions');

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const nearbyVenues = venues
      .map(venue => {
        if (!venue.location || !venue.location.latitude) return null;

        const lat2 = venue.location.latitude;
        const lon2 = venue.location.longitude;

        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - userLat) * Math.PI / 180;
        const dLon = (lon2 - userLon) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        if (distance > radiusKm) return null;

        // Check for active promotions
        const activePromotions = (venue.promotions || []).filter((promo) => {
          if (!promo.isActive) return false;
          
          // Check if promotion is currently active based on time
          const startTime = new Date(promo.startTime);
          const endTime = new Date(promo.endTime);
          
          if (now < startTime || now > endTime) return false;
          
          // Check days of week if specified
          if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
            if (!promo.daysOfWeek.includes(dayOfWeek)) return false;
          }
          
          return true;
        });

        if (activePromotions.length === 0) return null;

        return {
          venue: {
            _id: venue._id,
            name: venue.name,
            address: venue.address,
            location: venue.location
          },
          distance: distance.toFixed(2),
          promotions: activePromotions.map(p => ({
            title: p.title,
            description: p.description,
            type: p.type
          }))
        };
      })
      .filter(v => v !== null)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    return nearbyVenues;
  } catch (error) {
    console.error('Error checking nearby venues:', error);
    return [];
  }
}

// Update user location
router.put('/update', authenticate, [
  body('latitude').isFloat(),
  body('longitude').isFloat()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, isVisible } = req.body;

    req.user.location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      lastUpdated: new Date(),
      isVisible: isVisible !== undefined ? isVisible : req.user.location?.isVisible ?? true
    };

    await req.user.save();

    // Check for nearby venues with active promotions
    const nearbyVenuesWithPromos = await checkNearbyVenuesWithPromotions(
      parseFloat(latitude),
      parseFloat(longitude),
      req.user._id
    );

    // Emit location update to friends
    const io = req.io;
    req.user.friends.forEach(friendId => {
      io.to(`user_${friendId}`).emit('friend-location-update', {
        userId: req.user._id,
        location: req.user.location
      });
    });

    // Emit proximity notification if venues found
    if (nearbyVenuesWithPromos.length > 0) {
      // Try both room formats for compatibility
      const userId = req.user._id.toString();
      io.to(`user-${userId}`).emit('proximity-notification', {
        venues: nearbyVenuesWithPromos,
        userLocation: { latitude, longitude }
      });
      io.to(`user_${userId}`).emit('proximity-notification', {
        venues: nearbyVenuesWithPromos,
        userLocation: { latitude, longitude }
      });
    }

    res.json({ 
      location: req.user.location,
      nearbyVenues: nearbyVenuesWithPromos 
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Server error updating location' });
  }
});

// Get nearby friends
router.get('/friends', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends');
    
    if (!user.location || !user.location.latitude) {
      return res.json({ friends: [] });
    }

    const friends = await User.find({
      _id: { $in: user.friends },
      'location.isVisible': true,
      'location.latitude': { $exists: true }
    }).select('firstName lastName profilePicture location username');

    // Calculate distances (simple haversine approximation)
    const friendsWithDistance = friends.map(friend => {
      if (!friend.location || !friend.location.latitude) return null;
      
      const lat1 = user.location.latitude;
      const lon1 = user.location.longitude;
      const lat2 = friend.location.latitude;
      const lon2 = friend.location.longitude;

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        ...friend.toObject(),
        distance: distance.toFixed(2)
      };
    }).filter(f => f !== null).sort((a, b) => a.distance - b.distance);

    res.json({ friends: friendsWithDistance });
  } catch (error) {
    console.error('Friends location error:', error);
    res.status(500).json({ error: 'Server error fetching friends locations' });
  }
});

// Get nearby venues
router.get('/venues', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query; // radius in km

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius);

    // Simple bounding box search (for production, use geospatial queries)
    const venues = await Venue.find({ 
      isActive: true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });

    const nearbyVenues = venues
      .map(venue => {
        const lat2 = venue.location.latitude;
        const lon2 = venue.location.longitude;

        const R = 6371;
        const dLat = (lat2 - lat) * Math.PI / 180;
        const dLon = (lon2 - lon) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return { venue, distance };
      })
      .filter(({ distance }) => distance <= rad)
      .sort((a, b) => a.distance - b.distance)
      .map(({ venue, distance }) => ({
        ...venue.toObject(),
        distance: distance.toFixed(2)
      }));

    res.json({ venues: nearbyVenues });
  } catch (error) {
    console.error('Venues location error:', error);
    res.status(500).json({ error: 'Server error fetching nearby venues' });
  }
});

// Check for nearby venues with active promotions (for proximity notifications)
router.get('/check-proximity', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, radius = 2 } = req.query; // radius in km

    if (!latitude || !longitude) {
      // Try to use user's stored location
      const user = await User.findById(req.user._id);
      if (!user.location || !user.location.latitude) {
        return res.status(400).json({ error: 'Location required' });
      }
      const venues = await checkNearbyVenuesWithPromotions(
        user.location.latitude,
        user.location.longitude,
        req.user._id,
        parseFloat(radius)
      );
      return res.json({ venues });
    }

    const venues = await checkNearbyVenuesWithPromotions(
      parseFloat(latitude),
      parseFloat(longitude),
      req.user._id,
      parseFloat(radius)
    );

    res.json({ venues });
  } catch (error) {
    console.error('Proximity check error:', error);
    res.status(500).json({ error: 'Server error checking proximity' });
  }
});

export default router;

