import express from 'express';
import Venue from '../models/Venue.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { isStripeConfigured } from '../utils/stripe.js';
import { checkVenueAccess, getUserVenues } from '../utils/venueAccess.js';

const router = express.Router();

// Get all active venues (or user's venues if authenticated)
router.get('/', async (req, res) => {
  try {
    // Try to get authenticated user (optional)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const User = (await import('../models/User.js')).default;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        user = await User.findById(decoded.userId).select('-password');
      } catch (error) {
        // Invalid token, continue as public
      }
    }
    
    // If user is authenticated, check if they're a venue owner or regular app user
    if (user) {
      const userVenues = await getUserVenues(user);
      
      // If user owns/manages venues, return only their venues (for venue portal)
      if (userVenues.length > 0) {
        const venues = userVenues.map(v => {
          const venueObj = v.venue.toObject();
          venueObj.userRole = v.role;
          venueObj.followerCount = v.venue.followers ? v.venue.followers.length : 0;
          return venueObj;
        });
        console.log(`Returning ${venues.length} venue(s) for venue owner ${user._id} (${user.email})`);
        return res.json({ venues });
      }
      
      // Regular app user - return all active venues (for Shot On Me app)
      console.log(`Returning all active venues for app user ${user._id} (${user.email})`);
    }
    
    // Return all active venues (for app users or public access)
    const venues = await Venue.find({ isActive: true })
      .populate('owner', 'firstName lastName email')
      .populate('staff.user', 'firstName lastName email');
      // Note: We include promotions for app users to see specials
    
    // Add follower count to each venue
    const venuesWithFollowers = venues.map(venue => {
      const venueObj = venue.toObject();
      venueObj.followerCount = venue.followers ? venue.followers.length : 0;
      return venueObj;
    });
    
    console.log(`Returning ${venuesWithFollowers.length} active venue(s)`);
    res.json({ venues: venuesWithFollowers });
  } catch (error) {
    console.error('Venues error:', error);
    res.status(500).json({ error: 'Server error fetching venues' });
  }
});

// Stripe Connect - Create account link for bank connection (venue owners only)
// IMPORTANT: This must be defined BEFORE /:id route to prevent route conflicts
router.post('/connect/onboard', authenticate, async (req, res) => {
  try {
    // Get user's venue to check ownership
    const userVenues = await getUserVenues(req.user);
    const ownedVenue = userVenues.find(v => v.role === 'owner');
    
    if (!ownedVenue && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only venue owners can connect bank accounts' });
    }

    if (!isStripeConfigured()) {
      return res.status(400).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in backend/.env' 
      });
    }

    const getStripeClient = (await import('../utils/stripe.js')).default;
    const stripe = getStripeClient();

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe client not initialized' });
    }

    let connectAccountId = req.user.stripeConnectAccountId;

    // Create Stripe Connect account if it doesn't exist
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: req.user.email,
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: req.user._id.toString(),
          userType: 'venue'
        }
      });

      connectAccountId = account.id;
      req.user.stripeConnectAccountId = connectAccountId;
      await req.user.save();
    }

    // Create account link for onboarding
    const frontendUrl = process.env.FRONTEND_URL || 'http://venueportal:3000';
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${frontendUrl}/dashboard/settings?refresh=true`,
      return_url: `${frontendUrl}/dashboard/settings?success=true`,
      type: 'account_onboarding',
    });

    res.json({
      url: accountLink.url,
      accountId: connectAccountId
    });
  } catch (error) {
    console.error('Stripe Connect onboard error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error creating bank connection',
      details: error.type || undefined
    });
  }
});

// Check Stripe Connect account status
router.get('/connect/status', authenticate, async (req, res) => {
  try {
    // Get user's venue to check ownership
    const userVenues = await getUserVenues(req.user);
    const ownedVenue = userVenues.find(v => v.role === 'owner');
    
    if (!ownedVenue && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only venue owners can check bank connection status' });
    }

    if (!isStripeConfigured()) {
      return res.status(400).json({ 
        error: 'Stripe is not configured' 
      });
    }

    if (!req.user.stripeConnectAccountId) {
      return res.json({
        connected: false,
        message: 'Bank account not connected'
      });
    }

    const getStripeClient = (await import('../utils/stripe.js')).default;
    const stripe = getStripeClient();

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe client not initialized' });
    }

    const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);

    res.json({
      connected: account.details_submitted && account.charges_enabled,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      email: account.email,
      country: account.country
    });
  } catch (error) {
    console.error('Stripe Connect status error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error checking bank connection status',
      details: error.type || undefined
    });
  }
});

// Get venue by ID
router.get('/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id)
      .populate('owner', 'firstName lastName email');
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    
    // Add follower count to response
    const venueObj = venue.toObject();
    venueObj.followerCount = venue.followers ? venue.followers.length : 0;
    
    res.json({ venue: venueObj });
  } catch (error) {
    console.error('Venue error:', error);
    res.status(500).json({ error: 'Server error fetching venue' });
  }
});

// Create venue (venue owners only)
router.post('/', authenticate, [
  body('name').trim().notEmpty(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat()
], async (req, res) => {
  try {
    if (req.user.userType !== 'venue' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only venue owners can create venues' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const venue = new Venue({
      ...req.body,
      owner: req.user._id
    });

    await venue.save();
    res.status(201).json({ venue });
  } catch (error) {
    console.error('Create venue error:', error);
    res.status(500).json({ error: 'Server error creating venue' });
  }
});

// Update venue
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { hasAccess, role } = await checkVenueAccess(req.user, req.params.id, 'manager');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    Object.assign(venue, req.body);
    venue.updatedAt = new Date();
    await venue.save();

    // Emit real-time update via Socket.io
    if (req.io) {
      req.io.emit('venue-updated', {
        venueId: venue._id,
        venue: venue.toObject()
      });
      req.io.to('promotions').emit('venue-updated', {
        venueId: venue._id,
        venue: venue.toObject()
      });
    }

    res.json({ venue });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ error: 'Server error updating venue' });
  }
});

// Add/Update promotion
router.post('/:id/promotions', authenticate, [
  body('title').trim().notEmpty(),
  body('type').isIn(['happy-hour', 'event', 'special', 'birthday', 'anniversary']),
  body('startTime').isISO8601(),
  body('endTime').isISO8601()
], async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id, 'manager');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    venue.promotions.push(req.body);
    await venue.save();

    // Emit real-time update via Socket.io
    const io = req.io;
    if (io) {
      const newPromotion = venue.promotions[venue.promotions.length - 1];
      io.emit('new-promotion', {
        venue: venue.name,
        venueId: venue._id,
        promotion: newPromotion
      });
      io.emit('promotion-updated', {
        venueId: venue._id,
        promotion: newPromotion
      });
      io.to('promotions').emit('promotion-updated', {
        venueId: venue._id,
        promotion: newPromotion
      });
    }

    res.status(201).json({ promotion: venue.promotions[venue.promotions.length - 1] });
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ error: 'Server error creating promotion' });
  }
});

// Update promotion
router.put('/:id/promotions/:promoId', authenticate, async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id, 'manager');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const promoIndex = venue.promotions.findIndex(
      (p) => p._id.toString() === req.params.promoId
    );

    if (promoIndex === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    Object.assign(venue.promotions[promoIndex], req.body);
    venue.markModified('promotions');
    await venue.save();

    // Emit real-time update
    const io = req.io;
    if (io) {
      io.emit('promotion-updated', {
        venueId: venue._id,
        promotion: venue.promotions[promoIndex]
      });
      io.to('promotions').emit('promotion-updated', {
        venueId: venue._id,
        promotion: venue.promotions[promoIndex]
      });
    }

    res.json({ promotion: venue.promotions[promoIndex] });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Server error updating promotion' });
  }
});

// Delete promotion
router.delete('/:id/promotions/:promoId', authenticate, async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id, 'manager');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const promoIndex = venue.promotions.findIndex(
      (p) => p._id.toString() === req.params.promoId
    );

    if (promoIndex === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    venue.promotions.splice(promoIndex, 1);
    await venue.save();

    // Emit real-time update
    const io = req.io;
    if (io) {
      io.emit('promotion-deleted', {
        venueId: venue._id,
        promotionId: req.params.promoId
      });
      io.to('promotions').emit('promotion-deleted', {
        venueId: venue._id,
        promotionId: req.params.promoId
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Server error deleting promotion' });
  }
});

// Update schedule
router.put('/:id/schedule', authenticate, async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id, 'manager');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    venue.schedule = { ...venue.schedule, ...req.body };
    venue.updatedAt = new Date();
    await venue.save();

    res.json({ schedule: venue.schedule });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: 'Server error updating schedule' });
  }
});

// ========== STAFF MANAGEMENT ENDPOINTS ==========

// Get venue staff
router.get('/:id/staff', authenticate, async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id)
      .populate('staff.user', 'firstName lastName email userType')
      .populate('staff.addedBy', 'firstName lastName')
      .select('staff owner createdAt');

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Include owner in staff list
    const owner = await User.findById(venue.owner).select('firstName lastName email userType');
    const staffList = [
      {
        user: owner,
        role: 'owner',
        addedAt: venue.createdAt,
        addedBy: null,
        _id: venue.owner
      },
      ...venue.staff.map(s => ({
        user: s.user,
        role: s.role,
        addedAt: s.addedAt,
        addedBy: s.addedBy,
        _id: s._id
      }))
    ];

    res.json({ staff: staffList });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Server error fetching staff' });
  }
});

// Add staff member
router.post('/:id/staff', authenticate, [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['manager', 'staff']).optional()
], async (req, res) => {
  try {
    const { hasAccess, role: userRole } = await checkVenueAccess(req.user, req.params.id, 'owner');
    
    if (!hasAccess || userRole !== 'owner') {
      return res.status(403).json({ error: 'Only venue owners can add staff members' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role = 'staff' } = req.body;

    // Find user by email
    const staffUser = await User.findOne({ email: email.toLowerCase() });
    if (!staffUser) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    // Check if user is already staff
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Check if already owner
    if (venue.owner.toString() === staffUser._id.toString()) {
      return res.status(400).json({ error: 'User is already the venue owner' });
    }

    // Check if already staff
    const existingStaff = venue.staff.find(
      s => s.user.toString() === staffUser._id.toString()
    );
    if (existingStaff) {
      return res.status(400).json({ error: 'User is already a staff member' });
    }

    // Add staff member
    venue.staff.push({
      user: staffUser._id,
      role: role,
      addedBy: req.user._id
    });

    await venue.save();

    const updatedVenue = await Venue.findById(req.params.id)
      .populate('staff.user', 'firstName lastName email userType')
      .populate('staff.addedBy', 'firstName lastName');

    res.json({ 
      message: 'Staff member added successfully',
      staff: updatedVenue.staff 
    });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ error: 'Server error adding staff member' });
  }
});

// Update staff role
router.put('/:id/staff/:staffId', authenticate, [
  body('role').isIn(['manager', 'staff']).optional()
], async (req, res) => {
  try {
    const { hasAccess, role: userRole } = await checkVenueAccess(req.user, req.params.id, 'owner');
    
    if (!hasAccess || userRole !== 'owner') {
      return res.status(403).json({ error: 'Only venue owners can update staff roles' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const staffIndex = venue.staff.findIndex(
      s => s._id.toString() === req.params.staffId
    );

    if (staffIndex === -1) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (req.body.role) {
      venue.staff[staffIndex].role = req.body.role;
    }

    await venue.save();

    const updatedVenue = await Venue.findById(req.params.id)
      .populate('staff.user', 'firstName lastName email userType');

    res.json({ 
      message: 'Staff member updated successfully',
      staff: updatedVenue.staff 
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Server error updating staff member' });
  }
});

// Remove staff member
router.delete('/:id/staff/:staffId', authenticate, async (req, res) => {
  try {
    const { hasAccess, role: userRole } = await checkVenueAccess(req.user, req.params.id, 'owner');
    
    if (!hasAccess || userRole !== 'owner') {
      return res.status(403).json({ error: 'Only venue owners can remove staff members' });
    }

    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const staffIndex = venue.staff.findIndex(
      s => s._id.toString() === req.params.staffId
    );

    if (staffIndex === -1) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    venue.staff.splice(staffIndex, 1);
    await venue.save();

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Remove staff error:', error);
    res.status(500).json({ error: 'Server error removing staff member' });
  }
});

// ========== FOLLOW/UNFOLLOW ENDPOINTS ==========

// Follow a venue
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    if (req.user.userType !== 'user') {
      return res.status(403).json({ error: 'Only regular users can follow venues' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Check if already following
    if (venue.followers.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already following this venue' });
    }

    // Add to venue followers
    venue.followers.push(req.user._id);
    await venue.save();

    // Add to user's followed venues
    if (!req.user.followedVenues.includes(venue._id)) {
      req.user.followedVenues.push(venue._id);
      await req.user.save();
    }

    // Emit real-time update
    const io = req.io;
    if (io) {
      io.emit('venue-followers-updated', {
        venueId: venue._id,
        followerCount: venue.followers.length
      });
    }

    res.json({ 
      success: true, 
      followerCount: venue.followers.length,
      message: 'Successfully followed venue'
    });
  } catch (error) {
    console.error('Follow venue error:', error);
    res.status(500).json({ error: 'Server error following venue' });
  }
});

// Unfollow a venue
router.post('/:id/unfollow', authenticate, async (req, res) => {
  try {
    if (req.user.userType !== 'user') {
      return res.status(403).json({ error: 'Only regular users can unfollow venues' });
    }

    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Remove from venue followers
    venue.followers = venue.followers.filter(
      followerId => followerId.toString() !== req.user._id.toString()
    );
    await venue.save();

    // Remove from user's followed venues
    req.user.followedVenues = req.user.followedVenues.filter(
      venueId => venueId.toString() !== venue._id.toString()
    );
    await req.user.save();

    // Emit real-time update
    const io = req.io;
    if (io) {
      io.emit('venue-followers-updated', {
        venueId: venue._id,
        followerCount: venue.followers.length
      });
    }

    res.json({ 
      success: true, 
      followerCount: venue.followers.length,
      message: 'Successfully unfollowed venue'
    });
  } catch (error) {
    console.error('Unfollow venue error:', error);
    res.status(500).json({ error: 'Server error unfollowing venue' });
  }
});

// Get venue follower count (for venue owners)
router.get('/:id/followers', authenticate, async (req, res) => {
  try {
    const { hasAccess } = await checkVenueAccess(req.user, req.params.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venue = await Venue.findById(req.params.id)
      .populate('followers', 'firstName lastName profilePicture')
      .select('followers');

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({ 
      followerCount: venue.followers.length,
      followers: venue.followers 
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Server error fetching followers' });
  }
});

export default router;

