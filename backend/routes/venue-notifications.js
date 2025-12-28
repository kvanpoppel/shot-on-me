const User = require('../models/User');
const Venue = require('../models/Venue');
const Notification = require('../models/Notification');

/**
 * Push promotion notification to venue followers
 * Respects user notification preferences
 */
async function pushPromotionNotification(venueId, promotion, io) {
  try {
    const venue = await Venue.findById(venueId).populate('followers');
    if (!venue || !venue.followers || venue.followers.length === 0) {
      return { sent: 0, skipped: 0 };
    }

    let sent = 0;
    let skipped = 0;

    // Get all followers with their notification preferences
    const followers = await User.find({
      _id: { $in: venue.followers },
      'notificationPreferences.promotionNotifications': true,
      'notificationPreferences.pushEnabled': true
    });

    // Create notifications for followers who have notifications enabled
    const notificationPromises = followers.map(async (follower) => {
      try {
        const notification = new Notification({
          recipient: follower._id,
          actor: venue.owner, // Venue owner as actor
          type: 'venue_update',
          content: `${venue.name} has a new promotion: ${promotion.title}`,
          relatedVenue: venueId
        });

        await notification.save();
        sent++;

        // Real-time push via Socket.io if user is online
        if (io) {
          io.to(`user-${follower._id.toString()}`).emit('new-notification', {
            notification: {
              _id: notification._id,
              type: notification.type,
              content: notification.content,
              relatedVenue: {
                _id: venue._id,
                name: venue.name
              },
              createdAt: notification.createdAt
            }
          });
        }
      } catch (error) {
        console.error(`Error creating notification for user ${follower._id}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    // Count skipped (followers with notifications disabled)
    skipped = venue.followers.length - followers.length;

    console.log(`✅ Promotion notification: ${sent} sent, ${skipped} skipped (notifications disabled)`);

    return { sent, skipped };
  } catch (error) {
    console.error('Error pushing promotion notifications:', error);
    throw error;
  }
}

/**
 * Push notification to nearby users (location-based)
 */
async function pushLocationBasedNotification(venueId, promotion, radiusMiles = 5, io) {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue || !venue.location || !venue.location.coordinates) {
      return { sent: 0, skipped: 0 };
    }

    const [venueLon, venueLat] = venue.location.coordinates;

    // Find users within radius who have location sharing enabled
    const nearbyUsers = await User.find({
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true },
      'location.isVisible': true,
      'notificationPreferences.promotionNotifications': true,
      'notificationPreferences.pushEnabled': true,
      followedVenues: { $ne: venueId } // Don't notify if already following
    });

    // Calculate distance and filter
    const usersInRadius = nearbyUsers.filter(user => {
      if (!user.location.latitude || !user.location.longitude) return false;
      
      const distance = calculateDistance(
        venueLat,
        venueLon,
        user.location.latitude,
        user.location.longitude
      );
      
      return distance <= radiusMiles;
    });

    let sent = 0;
    const notificationPromises = usersInRadius.map(async (user) => {
      try {
        const notification = new Notification({
          recipient: user._id,
          actor: venue.owner,
          type: 'venue_update',
          content: `New promotion nearby: ${venue.name} - ${promotion.title}`,
          relatedVenue: venueId
        });

        await notification.save();
        sent++;

        if (io) {
          io.to(`user-${user._id.toString()}`).emit('new-notification', {
            notification: {
              _id: notification._id,
              type: notification.type,
              content: notification.content,
              relatedVenue: {
                _id: venue._id,
                name: venue.name
              },
              createdAt: notification.createdAt
            }
          });
        }
      } catch (error) {
        console.error(`Error creating location-based notification:`, error);
      }
    });

    await Promise.all(notificationPromises);

    return { sent, skipped: usersInRadius.length - sent };
  } catch (error) {
    console.error('Error pushing location-based notifications:', error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
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

/**
 * Push targeted promotion notification based on targeting options
 */
async function pushTargetedPromotionNotification(venueId, promotion, io) {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return { sent: 0, skipped: 0 };
    }

    const targeting = promotion.targeting || {};
    let targetUsers = [];

    // 1. Followers-only targeting
    if (targeting.followersOnly) {
      const followers = await User.find({
        _id: { $in: venue.followers || [] },
        'notificationPreferences.promotionNotifications': true,
        'notificationPreferences.pushEnabled': true
      });
      targetUsers = followers.map(f => f._id.toString());
    } else {
      // Get all users with notifications enabled
      targetUsers = await User.find({
        'notificationPreferences.promotionNotifications': true,
        'notificationPreferences.pushEnabled': true
      }).select('_id');
      targetUsers = targetUsers.map(u => u._id.toString());
    }

    // 2. Location-based filtering
    if (targeting.locationBased && venue.location && venue.location.coordinates) {
      const [venueLon, venueLat] = venue.location.coordinates;
      const radiusMiles = targeting.radiusMiles || 5;
      
      const usersWithLocation = await User.find({
        _id: { $in: targetUsers },
        'location.latitude': { $exists: true },
        'location.longitude': { $exists: true },
        'location.isVisible': true
      });

      const usersInRadius = usersWithLocation.filter(user => {
        const distance = calculateDistance(
          venueLat,
          venueLon,
          user.location.latitude,
          user.location.longitude
        );
        return distance <= radiusMiles;
      });

      targetUsers = usersInRadius.map(u => u._id.toString());
    }

    // 3. User segment filtering
    if (targeting.userSegments && !targeting.userSegments.includes('all')) {
      const VenueLoyalty = require('../models/VenueLoyalty');
      const segmentUsers = [];

      for (const segment of targeting.userSegments) {
        if (segment === 'frequent') {
          // Users with 5+ check-ins
          const loyalties = await VenueLoyalty.find({
            venue: venueId,
            checkInCount: { $gte: 5 }
          }).select('user');
          segmentUsers.push(...loyalties.map(l => l.user.toString()));
        } else if (segment === 'vip') {
          // Users with 10+ check-ins or high spending
          const loyalties = await VenueLoyalty.find({
            venue: venueId,
            $or: [
              { checkInCount: { $gte: 10 } },
              { totalSpent: { $gte: 100 } }
            ]
          }).select('user');
          segmentUsers.push(...loyalties.map(l => l.user.toString()));
        } else if (segment === 'new') {
          // Users with 0-2 check-ins
          const loyalties = await VenueLoyalty.find({
            venue: venueId,
            checkInCount: { $lte: 2 }
          }).select('user');
          segmentUsers.push(...loyalties.map(l => l.user.toString()));
        }
      }

      if (segmentUsers.length > 0) {
        targetUsers = targetUsers.filter(id => segmentUsers.includes(id));
      }
    }

    // 4. Minimum check-ins filter
    if (targeting.minCheckIns > 0) {
      const VenueLoyalty = require('../models/VenueLoyalty');
      const loyalties = await VenueLoyalty.find({
        venue: venueId,
        checkInCount: { $gte: targeting.minCheckIns }
      }).select('user');
      const qualifiedUsers = loyalties.map(l => l.user.toString());
      targetUsers = targetUsers.filter(id => qualifiedUsers.includes(id));
    }

    // 5. Time-based filtering (check if current time is within window)
    if (targeting.timeBased && targeting.timeWindow) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = targeting.timeWindow;
      
      if (currentTime < start || currentTime > end) {
        // Outside time window, don't send notifications
        return { sent: 0, skipped: targetUsers.length, reason: 'outside_time_window' };
      }
    }

    // Get final user list
    const finalUsers = await User.find({
      _id: { $in: targetUsers },
      'notificationPreferences.promotionNotifications': true,
      'notificationPreferences.pushEnabled': true
    });

    let sent = 0;
    const notificationPromises = finalUsers.map(async (user) => {
      try {
        const notification = new Notification({
          recipient: user._id,
          actor: venue.owner,
          type: promotion.isFlashDeal ? 'venue_update' : 'venue_update',
          content: promotion.isFlashDeal
            ? `⚡ Flash Deal: ${venue.name} - ${promotion.title}`
            : `${venue.name} has a new promotion: ${promotion.title}`,
          relatedVenue: venueId
        });

        await notification.save();
        sent++;

        if (io) {
          io.to(`user-${user._id.toString()}`).emit('new-notification', {
            notification: {
              _id: notification._id,
              type: notification.type,
              content: notification.content,
              relatedVenue: {
                _id: venue._id,
                name: venue.name
              },
              createdAt: notification.createdAt
            }
          });
        }
      } catch (error) {
        console.error(`Error creating targeted notification:`, error);
      }
    });

    await Promise.all(notificationPromises);

    console.log(`✅ Targeted promotion notification: ${sent} sent to ${finalUsers.length} users`);

    return { sent, skipped: targetUsers.length - sent };
  } catch (error) {
    console.error('Error pushing targeted promotion notifications:', error);
    throw error;
  }
}

module.exports = {
  pushPromotionNotification,
  pushLocationBasedNotification,
  pushTargetedPromotionNotification
};


