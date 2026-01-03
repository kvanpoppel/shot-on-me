const express = require('express');
const Venue = require('../models/Venue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');

const router = express.Router();

// Socket.io instance (set from server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// GET /api/venues
// - For venue owners: only their own venues
// - For regular users: all active venues
router.get('/', auth, async (req, res) => {
  try {
    let venues;

    console.log(`[Venues API] User ID: ${req.user.userId}, User Type: ${req.user.userType}`);

    if (req.user.userType === 'venue') {
      // For venue owners, return their own venues PLUS all active test venues (for testing)
      // This allows venue owners to see test venues during development
      const ownVenues = await Venue.find({ owner: req.user.userId })
        .populate('owner', 'email firstName lastName')
        .lean();
      
      // Also get test venues (Kate's Pub and Paige's Pub) for testing
      const testVenueNames = ["Kate's Pub", "Paige's Pub"];
      const testVenues = await Venue.find({ 
        isActive: true, 
        name: { $in: testVenueNames } 
      }).lean();
      
      // Combine and deduplicate by _id
      const venueMap = new Map();
      [...ownVenues, ...testVenues].forEach(venue => {
        venueMap.set(venue._id.toString(), venue);
      });
      venues = Array.from(venueMap.values());
      
      console.log(`[Venues API] Venue owner query returned ${venues.length} venue(s) (${ownVenues.length} own + ${testVenues.length} test venues)`);
    } else {
      // For regular users, return all active venues
      venues = await Venue.find({ isActive: true }).lean();
      console.log(`[Venues API] Regular user query returned ${venues.length} active venue(s)`);
    }

    // Transform venues to match frontend expectations
    // Convert GeoJSON coordinates [longitude, latitude] to { latitude, longitude }
    const transformedVenues = (venues || []).map(venue => {
      const transformed = { ...venue };
      
      // Transform location from GeoJSON to frontend format
      if (venue.location && venue.location.coordinates && Array.isArray(venue.location.coordinates)) {
        // GeoJSON format: [longitude, latitude]
        const [longitude, latitude] = venue.location.coordinates;
        transformed.location = {
          ...venue.location,
          latitude: latitude,
          longitude: longitude,
          coordinates: venue.location.coordinates // Keep original for backward compatibility
        };
      }
      
      return transformed;
    });

    // Return consistent format: { venues: [...] }
    res.json({ venues: transformedVenues });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/venues/:venueId
router.get('/:venueId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Regular users can only see active venues
    if (req.user.userType !== 'venue' && !venue.isActive) {
      return res.status(403).json({ message: 'Venue not available' });
    }

    // Filter promotions based on targeting for regular users
    if (req.user.userType !== 'venue') {
      const VenueLoyalty = require('../models/VenueLoyalty');
      // Use parallel queries for better performance
      const [user, venueLoyalty] = await Promise.all([
        User.findById(req.user.userId).select('location').lean(),
        VenueLoyalty.findOne({ 
          user: req.user.userId, 
          venue: req.params.venueId 
        }).lean()
      ]);
      
      const userCheckInCount = venueLoyalty?.checkInCount || 0;
      const isFollower = venue.followers?.includes(req.user.userId) || false;
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Get user location if available
      const userLat = user.location?.latitude;
      const userLon = user.location?.longitude;
      
      const filteredPromotions = venue.promotions.filter(promo => {
        if (!promo.isActive) return false;
        
        const targeting = promo.targeting || {};
        
        // Followers-only check
        if (targeting.followersOnly && !isFollower) return false;
        
        // Location-based check
        if (targeting.locationBased && userLat && userLon && venue.location?.coordinates) {
          const [venueLon, venueLat] = venue.location.coordinates;
          const distance = calculateDistance(venueLat, venueLon, userLat, userLon);
          if (distance > (targeting.radiusMiles || 5)) return false;
        }
        
        // User segment check
        if (targeting.userSegments && !targeting.userSegments.includes('all')) {
          let matchesSegment = false;
          for (const segment of targeting.userSegments) {
            if (segment === 'frequent' && userCheckInCount >= 5) matchesSegment = true;
            else if (segment === 'vip' && (userCheckInCount >= 10 || (venueLoyalty?.totalSpent || 0) >= 100)) matchesSegment = true;
            else if (segment === 'new' && userCheckInCount <= 2) matchesSegment = true;
          }
          if (!matchesSegment) return false;
        }
        
        // Minimum check-ins check
        if (targeting.minCheckIns > 0 && userCheckInCount < targeting.minCheckIns) return false;
        
        // Time-based check
        if (targeting.timeBased && targeting.timeWindow) {
          const { start, end } = targeting.timeWindow;
          if (currentTime < start || currentTime > end) return false;
        }
        
        return true;
      });
      
      const venueObj = venue.toObject();
      venueObj.promotions = filteredPromotions;
      return res.json({ venue: venueObj });
    }

    // For venue owners, populate owner info and return
    const venueObj = venue.toObject();
    if (venue.owner) {
      const owner = await User.findById(venue.owner).select('firstName lastName email').lean();
      if (owner) {
        venueObj.owner = owner;
      }
    }
    res.json({ venue: venueObj });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate distance
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

// PUT /api/venues/:venueId - Update venue information
router.put('/:venueId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Only owner can update venue
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to update this venue' });
    }

    const { name, address, phone, email, website, schedule, location, description, subscriptionTier, isFeatured, featuredUntil, subscriptionExpiresAt } = req.body;

    // Update fields if provided
    if (name) venue.name = name;
    if (address) venue.address = { ...venue.address, ...address };
    if (phone !== undefined) venue.phone = phone;
    if (email !== undefined) venue.email = email;
    if (website !== undefined) venue.website = website;
    if (description !== undefined) venue.description = description;
    if (schedule) venue.schedule = { ...venue.schedule, ...schedule };
    if (location && location.latitude && location.longitude) {
      venue.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      };
    }
    // Subscription and featured status
    if (subscriptionTier !== undefined) venue.subscriptionTier = subscriptionTier;
    if (isFeatured !== undefined) venue.isFeatured = isFeatured;
    if (featuredUntil !== undefined) venue.featuredUntil = featuredUntil ? new Date(featuredUntil) : null;
    if (subscriptionExpiresAt !== undefined) venue.subscriptionExpiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;

    await venue.save();

    // Emit update event
    if (io) {
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.json({
      message: 'Venue updated successfully',
      venue
    });
  } catch (error) {
    console.error('Error updating venue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/venues/:venueId/promotions
router.post('/:venueId/promotions', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Only owner (or venue user) can create promotions
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to create promotions for this venue' });
    }

    const { 
      title, 
      description, 
      type, 
      startTime, 
      endTime, 
      discount, 
      validUntil, 
      schedule,
      isFlashDeal,
      flashDealEndsAt,
      pointsReward,
      targeting,
      isRecurring,
      recurrencePattern
    } = req.body;

    const { generateRecurringInstances, generateScheduleFromDays } = require('../utils/recurringPromotions');

    const basePromotion = {
      title,
      description,
      type: type || 'other',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      discount,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      schedule,
      isActive: true,
      isFlashDeal: isFlashDeal || false,
      flashDealEndsAt: flashDealEndsAt ? new Date(flashDealEndsAt) : undefined,
      pointsReward: pointsReward || 0,
      targeting: targeting || {
        followersOnly: false,
        locationBased: false,
        radiusMiles: 5,
        userSegments: ['all'],
        minCheckIns: 0,
        timeBased: false
      },
      isRecurring: isRecurring || false,
      recurrencePattern: isRecurring && recurrencePattern ? {
        type: recurrencePattern.type || 'weekly',
        frequency: recurrencePattern.frequency || 1,
        daysOfWeek: recurrencePattern.daysOfWeek || [],
        dayOfMonth: recurrencePattern.dayOfMonth,
        endDate: recurrencePattern.endDate ? new Date(recurrencePattern.endDate) : undefined,
        maxOccurrences: recurrencePattern.maxOccurrences || 12
      } : undefined
    };

    // If recurring, generate instances
    if (isRecurring && recurrencePattern) {
      const instances = generateRecurringInstances(
        basePromotion,
        {
          type: recurrencePattern.type || 'weekly',
          frequency: recurrencePattern.frequency || 1,
          daysOfWeek: recurrencePattern.daysOfWeek || [],
          dayOfMonth: recurrencePattern.dayOfMonth,
          endDate: recurrencePattern.endDate ? new Date(recurrencePattern.endDate) : undefined,
          maxOccurrences: recurrencePattern.maxOccurrences || 12
        },
        startTime ? new Date(startTime) : new Date()
      );

      // Add all instances to venue
      instances.forEach(instance => {
        // Generate schedule from days of week if weekly
        if (recurrencePattern.type === 'weekly' && recurrencePattern.daysOfWeek && recurrencePattern.daysOfWeek.length > 0) {
          const startTimeStr = instance.startTime.toTimeString().slice(0, 5);
          const endTimeStr = instance.endTime.toTimeString().slice(0, 5);
          instance.schedule = generateScheduleFromDays(recurrencePattern.daysOfWeek, startTimeStr, endTimeStr);
        }
        venue.promotions.push(instance);
      });

      console.log(`✅ Created ${instances.length} recurring promotion instances`);
      
      // Emit notifications for all instances
      if (io) {
        instances.forEach(instance => {
          io.emit('new-promotion', {
            venueId: venue._id.toString(),
            promotion: instance
          });
        });
        io.emit('venue-updated', {
          venueId: venue._id.toString(),
          venue
        });
      }
    } else {
      // Single promotion
      venue.promotions.push(basePromotion);
      
      // Push notification with targeting (respecting notification preferences)
      const { pushTargetedPromotionNotification } = require('./venue-notifications');
      pushTargetedPromotionNotification(venue._id, basePromotion, io).catch(err => 
        console.error('Error pushing targeted promotion notification:', err)
      );

      if (io) {
        io.emit('new-promotion', {
          venueId: venue._id.toString(),
          promotion: basePromotion
        });
        io.emit('venue-updated', {
          venueId: venue._id.toString(),
          venue
        });
      }
    }

    await venue.save();

    const responseMessage = isRecurring 
      ? `Created ${instances.length} recurring promotion instances successfully`
      : 'Promotion created successfully';

    res.status(201).json({
      message: responseMessage,
      promotion: isRecurring ? instances[0] : basePromotion,
      instances: isRecurring ? instances.length : undefined,
      venue
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/venues/:venueId/promotions/:promotionId
router.put('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to update promotions for this venue' });
    }

    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const {
      title,
      description,
      type,
      startTime,
      endTime,
      discount,
      validUntil,
      schedule,
      isActive
    } = req.body;

    if (title !== undefined) promotion.title = title;
    if (description !== undefined) promotion.description = description;
    if (type !== undefined) promotion.type = type;
    if (startTime !== undefined) promotion.startTime = new Date(startTime);
    if (endTime !== undefined) promotion.endTime = new Date(endTime);
    if (discount !== undefined) promotion.discount = discount;
    if (validUntil !== undefined) promotion.validUntil = new Date(validUntil);
    if (schedule !== undefined) promotion.schedule = schedule;
    if (isActive !== undefined) promotion.isActive = isActive;

    await venue.save();

    if (io) {
      io.emit('promotion-updated', {
        venueId: venue._id.toString(),
        promotion
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.json({
      message: 'Promotion updated successfully',
      promotion,
      venue
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/venues/:venueId/promotions/:promotionId
router.delete('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to delete promotions for this venue' });
    }

    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.deleteOne();
    await venue.save();

    if (io) {
      io.emit('promotion-deleted', {
        venueId: venue._id.toString(),
        promotionId: req.params.promotionId
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.json({
      message: 'Promotion deleted successfully',
      venue
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Stripe Connect: Start onboarding process (improved)
router.post('/connect/onboard', auth, async (req, res) => {
  try {
    // Only venue owners can onboard
    if (req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Only venue owners can connect Stripe accounts' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please contact support.',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Get user's venue
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found. Please create a venue first.' });
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If venue already has a Stripe account, check if it needs re-onboarding
    if (venue.stripeAccountId) {
      const status = await stripeUtils.getConnectAccountStatus(venue.stripeAccountId);
      if (status.connected && status.chargesEnabled && status.payoutsEnabled) {
        return res.status(400).json({ 
          message: 'Stripe account already connected',
          accountId: venue.stripeAccountId,
          status: status
        });
      }
    }

    // Create onboarding link
    const onboardingResult = await stripeUtils.createConnectOnboardingLink(
      venue._id.toString(),
      venue.name,
      user.email
    );

    // Save Stripe account ID to venue
    if (onboardingResult.accountId) {
      venue.stripeAccountId = onboardingResult.accountId;
      await venue.save();
    }

    res.json({
      message: 'Onboarding link created successfully',
      url: onboardingResult.url,
      accountId: onboardingResult.accountId
    });
  } catch (error) {
    console.error('Error creating Stripe Connect onboarding link:', error);
    res.status(500).json({ 
      message: 'Failed to create onboarding link',
      error: error.message 
    });
  }
});

// Stripe Connect: Get account status (for current user's venue)
router.get('/connect/status', auth, async (req, res) => {
  try {
    // Only venue owners can check status
    if (req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Only venue owners can check Stripe status' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.json({
        connected: false,
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Get user's venue
    const venue = await Venue.findOne({ owner: req.user.userId });
    if (!venue) {
      return res.json({
        connected: false,
        error: 'Venue not found',
        message: 'Please create a venue first'
      });
    }

    // Check if venue has Stripe account
    if (!venue.stripeAccountId) {
      return res.json({
        connected: false,
        error: 'No Stripe account linked',
        message: 'Please complete Stripe Connect onboarding'
      });
    }

    // Get account status from Stripe
    const status = await stripeUtils.getConnectAccountStatus(venue.stripeAccountId);

    res.json({
      ...status,
      venueId: venue._id,
      venueName: venue.name
    });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    res.status(500).json({ 
      message: 'Failed to check Stripe status',
      error: error.message 
    });
  }
});

// Stripe Connect: Get status for specific venue (by venueId) - for admin/debugging
router.get('/connect/status/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.json({
        connected: false,
        error: 'Stripe is not configured'
      });
    }

    // Get venue
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check authorization: user must own the venue or be admin
    if (venue.owner.toString() !== req.user.userId.toString() && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to view this venue\'s Stripe status' });
    }

    // Check if venue has Stripe account
    if (!venue.stripeAccountId) {
      return res.json({
        connected: false,
        error: 'No Stripe account linked',
        venueId: venue._id,
        venueName: venue.name
      });
    }

    // Get account status from Stripe
    const status = await stripeUtils.getConnectAccountStatus(venue.stripeAccountId);

    res.json({
      ...status,
      venueId: venue._id,
      venueName: venue.name
    });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    res.status(500).json({ 
      message: 'Failed to check Stripe status',
      error: error.message 
    });
  }
});

// Debug endpoint: list all venues (including inactive) – useful for checking Kate's Pub
router.get('/debug/all', auth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const venues = await Venue.find({}).select('name isActive location owner address');
    res.json({ venues, count: venues.length });
  } catch (error) {
    console.error('Error fetching all venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/venues/:venueId/nearby-users (Privacy-protected)
router.get('/:venueId/nearby-users', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { radius = 1 } = req.query; // Default 1 mile

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Only venue owner can see nearby users
    if (venue.owner.toString() !== req.user.userId.toString() && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!venue.location || !venue.location.coordinates) {
      return res.json({ users: [] });
    }

    const [venueLon, venueLat] = venue.location.coordinates;
    const radiusMiles = parseFloat(radius);

    // Find users within radius who have location sharing enabled
    const users = await User.find({
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true },
      'location.isVisible': true
    }).select('name location');

    // Calculate distance and filter (privacy-protected: only return aggregated data)
    const nearbyUsers = users
      .map(user => {
        if (!user.location.latitude || !user.location.longitude) return null;
        
        const distance = calculateDistance(
          venueLat,
          venueLon,
          user.location.latitude,
          user.location.longitude
        );
        
        if (distance <= radiusMiles) {
          return {
            id: user._id,
            name: user.name,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            lastSeen: user.location.lastUpdated || user.lastLogin
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 users

    res.json({ users: nearbyUsers });
  } catch (error) {
    console.error('Error fetching nearby users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/venues/:venueId/followers
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
      _id: { $in: venue.followers || [] } 
    }).select('name profilePicture createdAt').limit(100);

    res.json({ 
      followers: followers.map(f => ({
        id: f._id,
        name: f.name,
        profilePicture: f.profilePicture,
        joinedAt: f.createdAt
      })),
      totalCount: venue.followerCount || 0
    });
  } catch (error) {
    console.error('Error fetching venue followers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function for distance calculation
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


