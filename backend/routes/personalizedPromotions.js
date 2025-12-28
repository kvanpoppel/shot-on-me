const express = require('express');
const auth = require('../middleware/auth');
const userTracking = require('../services/userTracking');
const Venue = require('../models/Venue');
const Notification = require('../models/Notification');

const router = express.Router();

/**
 * POST /api/personalized-promotions/target-users
 * Get users to target for a specific promotion
 */
router.post('/target-users', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { promotionType, timeframe, minVisits, activeOnly } = req.body;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const criteria = {
      promotionType,
      timeframe,
      minVisits,
      activeOnly: activeOnly !== false
    };

    const targetUsers = await userTracking.getTargetUsers(venue._id, criteria);

    res.json({
      success: true,
      targetUsers,
      totalFollowers: venue.followers?.length || 0,
      matchedUsers: targetUsers.length
    });
  } catch (error) {
    console.error('Error getting target users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get target users',
      error: error.message 
    });
  }
});

/**
 * POST /api/personalized-promotions/send-exclusive
 * Send exclusive promotion to targeted users
 */
router.post('/send-exclusive', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { promotionId, targetUserIds, message } = req.body;

    const venue = await Venue.findOne({ owner: userId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const promotion = venue.promotions.id(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    // Create notifications for target users
    const notifications = targetUserIds.map(targetUserId => ({
      user: targetUserId,
      type: 'exclusive_promotion',
      title: `Exclusive Offer from ${venue.name}`,
      message: message || `You've been selected for an exclusive promotion: ${promotion.title}`,
      data: {
        venueId: venue._id,
        venueName: venue.name,
        promotionId: promotion._id,
        promotionTitle: promotion.title,
        promotionDescription: promotion.description,
        discount: promotion.discount
      },
      isRead: false
    }));

    await Notification.insertMany(notifications);

    // Track the exclusive promotion send
    for (const targetUserId of targetUserIds) {
      await userTracking.trackUserInteraction(
        targetUserId,
        venue._id,
        'exclusive_invitation',
        { promotionId, timestamp: new Date() }
      );
    }

    res.json({
      success: true,
      message: `Exclusive promotion sent to ${targetUserIds.length} users`,
      notificationsSent: notifications.length
    });
  } catch (error) {
    console.error('Error sending exclusive promotion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send exclusive promotion',
      error: error.message 
    });
  }
});

/**
 * GET /api/personalized-promotions/user-preferences/:userId
 * Get user preferences for this venue
 */
router.get('/user-preferences/:userId', auth, async (req, res) => {
  try {
    const venueOwnerId = req.user.userId;
    const { userId } = req.params;

    const venue = await Venue.findOne({ owner: venueOwnerId });
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const preferences = await userTracking.getUserPreferences(userId, venue._id);

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user preferences',
      error: error.message 
    });
  }
});

/**
 * POST /api/personalized-promotions/track-interaction
 * Track user interaction with venue/promotion
 */
router.post('/track-interaction', auth, async (req, res) => {
  try {
    const { venueId, interactionType, metadata } = req.body;
    const userId = req.user.userId;

    await userTracking.trackUserInteraction(userId, venueId, interactionType, metadata);

    res.json({
      success: true,
      message: 'Interaction tracked'
    });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track interaction',
      error: error.message 
    });
  }
});

module.exports = router;

