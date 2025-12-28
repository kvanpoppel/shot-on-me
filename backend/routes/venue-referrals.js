const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Venue = require('../models/Venue');
const VenueReferral = require('../models/VenueReferral');
const CheckIn = require('../models/CheckIn');

/**
 * Create a venue check-in referral invite
 * POST /api/venue-referrals/invite
 * Body: { venueId, recipientIds?: [] }
 */
router.post('/invite', auth, async (req, res) => {
  try {
    const { venueId, recipientIds } = req.body;
    const referrerId = req.user.userId;

    if (!venueId) {
      return res.status(400).json({ message: 'Venue ID is required' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.referralRewards?.enabled) {
      return res.status(400).json({ message: 'Referrals are not enabled for this venue' });
    }

    const referrer = await User.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate invite link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const inviteLink = `${baseUrl}/venue/${venueId}/checkin?ref=${referrerId}`;

    // If specific recipients provided, create individual referrals
    if (recipientIds && recipientIds.length > 0) {
      const referrals = [];
      for (const recipientId of recipientIds) {
        // Check if referral already exists
        const existing = await VenueReferral.findOne({
          referrer: referrerId,
          recipient: recipientId,
          venue: venueId,
          status: 'pending'
        });

        if (!existing) {
          const referral = new VenueReferral({
            referrer: referrerId,
            recipient: recipientId,
            venue: venueId,
            inviteLink: inviteLink,
            status: 'pending'
          });
          await referral.save();
          referrals.push(referral);
        }
      }

      return res.json({
        message: 'Invites sent successfully',
        referrals: referrals.map(r => ({
          id: r._id,
          recipient: r.recipient,
          inviteLink: r.inviteLink
        })),
        inviteLink: inviteLink
      });
    }

    // No specific recipients - just return the invite link
    res.json({
      message: 'Invite link generated',
      inviteLink: inviteLink,
      venue: {
        id: venue._id,
        name: venue.name
      }
    });
  } catch (error) {
    console.error('Error creating venue referral:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get venue referral stats for a user
 * GET /api/venue-referrals/stats?venueId=xxx
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const { venueId } = req.query;
    const userId = req.user.userId;

    const query = { referrer: userId };
    if (venueId) {
      query.venue = venueId;
    }

    const referrals = await VenueReferral.find(query)
      .populate('venue', 'name')
      .populate('recipient', 'name firstName lastName profilePicture');

    const stats = {
      total: referrals.length,
      completed: referrals.filter(r => r.status === 'completed').length,
      pending: referrals.filter(r => r.status === 'pending').length,
      totalPointsEarned: referrals.reduce((sum, r) => sum + (r.pointsAwarded.referrer || 0), 0),
      byVenue: {}
    };

    // Group by venue
    referrals.forEach(ref => {
      const venueId = ref.venue._id.toString();
      if (!stats.byVenue[venueId]) {
        stats.byVenue[venueId] = {
          venue: {
            id: ref.venue._id,
            name: ref.venue.name
          },
          total: 0,
          completed: 0,
          points: 0
        };
      }
      stats.byVenue[venueId].total++;
      if (ref.status === 'completed') {
        stats.byVenue[venueId].completed++;
      }
      stats.byVenue[venueId].points += ref.pointsAwarded.referrer || 0;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching venue referral stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get pending venue referrals for a user (invites they've received)
 * GET /api/venue-referrals/pending
 */
router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const referrals = await VenueReferral.find({
      recipient: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('referrer', 'name firstName lastName profilePicture')
      .populate('venue', 'name address image')
      .sort({ createdAt: -1 });

    res.json({
      referrals: referrals.map(r => ({
        id: r._id,
        referrer: r.referrer,
        venue: r.venue,
        inviteLink: r.inviteLink,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching pending referrals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Process venue referral when recipient checks in
 * This is called automatically by the check-in endpoint
 * Internal function - can be called without auth from check-in route
 */
const processVenueReferral = async (checkInId, userId) => {
  try {
    if (!checkInId || !userId) {
      throw new Error('Check-in ID and user ID are required');
    }

    const checkIn = await CheckIn.findById(checkInId)
      .populate('venue');
    
    if (!checkIn) {
      throw new Error('Check-in not found');
    }

    // Find pending venue referral for this user and venue
    // First try to find by referrer ID if checkIn has referredBy
    let referral = null;
    if (checkIn.referredBy) {
      referral = await VenueReferral.findOne({
        referrer: checkIn.referredBy,
        recipient: userId,
        venue: checkIn.venue._id,
        status: 'pending'
      }).populate('referrer').populate('venue');
    }
    
    // If not found, try general search
    if (!referral) {
      referral = await VenueReferral.findOne({
        recipient: userId,
        venue: checkIn.venue._id,
        status: 'pending'
      }).populate('referrer').populate('venue');
    }

    if (!referral) {
      return { processed: false, message: 'No venue referral found' };
    }

    // Check if referral has expired
    if (referral.expiresAt && referral.expiresAt < new Date()) {
      referral.status = 'expired';
      await referral.save();
      return { processed: false, message: 'Referral has expired' };
    }

    // Get venue referral reward configuration
    const venue = referral.venue;
    const baseReward = venue.referralRewards?.baseCheckIn || 10;
    const recipientBonus = venue.referralRewards?.recipientBonus || 5;

    // Check daily/weekly limits for referrer
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayReferrals = await VenueReferral.countDocuments({
      referrer: referral.referrer._id,
      venue: venue._id,
      status: 'completed',
      'pointsAwarded.referrerAwarded': true,
      updatedAt: { $gte: today }
    });

    const weekReferrals = await VenueReferral.countDocuments({
      referrer: referral.referrer._id,
      venue: venue._id,
      status: 'completed',
      'pointsAwarded.referrerAwarded': true,
      updatedAt: { $gte: weekAgo }
    });

    const maxPerDay = venue.referralRewards?.maxPerDay || 10;
    const maxPerWeek = venue.referralRewards?.maxPerWeek || 50;

    // Award points to referrer (if within limits)
    let referrerPoints = 0;
    if (todayReferrals < maxPerDay && weekReferrals < maxPerWeek) {
      referrerPoints = baseReward;
      
      const referrer = await User.findById(referral.referrer._id);
      referrer.points = (referrer.points || 0) + referrerPoints;
      await referrer.save();

      referral.pointsAwarded.referrer = referrerPoints;
      referral.pointsAwarded.referrerAwarded = true;
    }

    // Award bonus points to recipient
    const recipient = await User.findById(userId);
    const recipientPoints = recipientBonus;
    recipient.points = (recipient.points || 0) + recipientPoints;
    await recipient.save();

    referral.pointsAwarded.recipient = recipientPoints;
    referral.pointsAwarded.recipientAwarded = true;
    referral.status = 'completed';
    referral.checkIn = checkInId;
    await referral.save();

    // Update check-in with referral info
    checkIn.referredBy = referral.referrer._id;
    checkIn.referralType = 'venue';
    checkIn.venueReferralId = referral._id;
    checkIn.referralPoints = recipientPoints;
    await checkIn.save();

    return {
      processed: true,
      pointsAwarded: {
        referrer: referrerPoints,
        recipient: recipientPoints
      },
      referral: {
        id: referral._id,
        referrer: referral.referrer,
        venue: venue.name
      }
    };
  } catch (error) {
    console.error('Error processing venue referral:', error);
    throw error;
  }
};

// Also expose as route for manual processing (if needed)
router.post('/process', auth, async (req, res) => {
  try {
    const { checkInId, userId } = req.body;
    const result = await processVenueReferral(checkInId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error processing venue referral:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export the function for use in check-in route
// Also expose as route for manual processing (if needed)
router.post('/process', auth, async (req, res) => {
  try {
    const { checkInId, userId } = req.body;
    const result = await processVenueReferral(checkInId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error processing venue referral:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export router and function
module.exports = router;
module.exports.processVenueReferral = processVenueReferral;

