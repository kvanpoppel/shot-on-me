const Venue = require('../models/Venue');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Check for expiring promotions and send notifications to venue owners
 */
async function checkExpiringPromotions(io) {
  try {
    const now = new Date();
    const venues = await Venue.find({ isActive: true }).populate('owner');

    for (const venue of venues) {
      if (!venue.owner || venue.owner.userType !== 'venue') continue;

      const owner = await User.findById(venue.owner._id);
      if (!owner || !owner.notificationPreferences?.promotionExpiring) continue;

      const warningHours = owner.notificationPreferences?.expirationWarningHours || 24;
      const warningTime = new Date(now.getTime() + warningHours * 60 * 60 * 1000);

      for (const promo of venue.promotions || []) {
        if (!promo.isActive) continue;

        const endTime = new Date(promo.endTime);
        const timeUntilEnd = endTime.getTime() - now.getTime();
        const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);

        // Check if promotion is expiring within warning window
        if (hoursUntilEnd > 0 && hoursUntilEnd <= warningHours && hoursUntilEnd > warningHours - 1) {
          // Check if we've already notified about this promotion expiring
          const existingNotification = await Notification.findOne({
            recipient: venue.owner._id,
            type: 'venue_update',
            'promotion': promo._id,
            content: { $regex: /expiring/i },
            createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } // Within last hour
          });

          if (!existingNotification) {
            const notification = new Notification({
              recipient: venue.owner._id,
              actor: venue.owner._id,
              type: 'venue_update',
              content: `⚠️ "${promo.title}" is expiring in ${Math.floor(hoursUntilEnd)} hour${Math.floor(hoursUntilEnd) !== 1 ? 's' : ''}. Consider extending or creating a new promotion.`,
              relatedVenue: venue._id,
              promotion: promo._id
            });

            await notification.save();

            // Real-time notification via Socket.io
            if (io) {
              io.to(`user-${venue.owner._id.toString()}`).emit('new-notification', {
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
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking expiring promotions:', error);
  }
}

/**
 * Check for promotions about to launch and send notifications
 */
async function checkLaunchingPromotions(io) {
  try {
    const now = new Date();
    const venues = await Venue.find({ isActive: true }).populate('owner');

    for (const venue of venues) {
      if (!venue.owner || venue.owner.userType !== 'venue') continue;

      const owner = await User.findById(venue.owner._id);
      if (!owner || !owner.notificationPreferences?.promotionLaunching) continue;

      const warningHours = owner.notificationPreferences?.launchWarningHours || 1;
      const warningTime = new Date(now.getTime() + warningHours * 60 * 60 * 1000);

      for (const promo of venue.promotions || []) {
        if (!promo.isActive) continue;

        const startTime = new Date(promo.startTime);
        const timeUntilStart = startTime.getTime() - now.getTime();
        const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

        // Check if promotion is launching within warning window
        if (hoursUntilStart > 0 && hoursUntilStart <= warningHours && hoursUntilStart > warningHours - 1) {
          // Check if we've already notified about this promotion launching
          const existingNotification = await Notification.findOne({
            recipient: venue.owner._id,
            type: 'venue_update',
            'promotion': promo._id,
            content: { $regex: /launching|starting/i },
            createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } // Within last hour
          });

          if (!existingNotification) {
            const notification = new Notification({
              recipient: venue.owner._id,
              actor: venue.owner._id,
              type: 'venue_update',
              content: `🚀 "${promo.title}" is launching in ${Math.floor(hoursUntilStart)} hour${Math.floor(hoursUntilStart) !== 1 ? 's' : ''}. Get ready!`,
              relatedVenue: venue._id,
              promotion: promo._id
            });

            await notification.save();

            // Real-time notification via Socket.io
            if (io) {
              io.to(`user-${venue.owner._id.toString()}`).emit('new-notification', {
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
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking launching promotions:', error);
  }
}

/**
 * Check for promotion objectives reached and send notifications
 */
async function checkPromotionObjectives(io) {
  try {
    const venues = await Venue.find({ isActive: true }).populate('owner');

    for (const venue of venues) {
      if (!venue.owner || venue.owner.userType !== 'venue') continue;

      const owner = await User.findById(venue.owner._id);
      if (!owner || !owner.notificationPreferences?.promotionObjectives) continue;

      for (const promo of venue.promotions || []) {
        if (!promo.isActive || !promo.analytics) continue;

        const analytics = promo.analytics;
        const thresholds = {
          views: 100,
          clicks: 50,
          redemptions: 25,
          revenue: 500
        };

        // Check views milestone
        if (analytics.views && analytics.views >= thresholds.views && analytics.views % 100 === 0) {
          await createObjectiveNotification(venue.owner._id, venue._id, promo._id, promo.title, 'views', analytics.views, io);
        }

        // Check clicks milestone
        if (analytics.clicks && analytics.clicks >= thresholds.clicks && analytics.clicks % 50 === 0) {
          await createObjectiveNotification(venue.owner._id, venue._id, promo._id, promo.title, 'clicks', analytics.clicks, io);
        }

        // Check redemptions milestone
        if (analytics.redemptions && analytics.redemptions >= thresholds.redemptions && analytics.redemptions % 25 === 0) {
          await createObjectiveNotification(venue.owner._id, venue._id, promo._id, promo.title, 'redemptions', analytics.redemptions, io);
        }

        // Check revenue milestone
        if (analytics.revenue && analytics.revenue >= thresholds.revenue && analytics.revenue % 500 === 0) {
          await createObjectiveNotification(venue.owner._id, venue._id, promo._id, promo.title, 'revenue', analytics.revenue, io);
        }
      }
    }
  } catch (error) {
    console.error('Error checking promotion objectives:', error);
  }
}

async function createObjectiveNotification(ownerId, venueId, promotionId, promotionTitle, metric, value, io) {
  try {
    // Check if we've already notified about this milestone
    const existingNotification = await Notification.findOne({
      recipient: ownerId,
      type: 'venue_update',
      'promotion': promotionId,
      content: { $regex: new RegExp(`${metric}.*${value}`, 'i') },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    });

    if (!existingNotification) {
      const metricLabels = {
        views: 'views',
        clicks: 'clicks',
        redemptions: 'redemptions',
        revenue: 'revenue'
      };

      const notification = new Notification({
        recipient: ownerId,
        actor: ownerId,
        type: 'venue_update',
        content: `🎯 "${promotionTitle}" reached ${value.toLocaleString()} ${metricLabels[metric]}! Great performance!`,
        relatedVenue: venueId,
        promotion: promotionId
      });

      await notification.save();

      if (io) {
        io.to(`user-${ownerId.toString()}`).emit('new-notification', {
          notification: {
            _id: notification._id,
            type: notification.type,
            content: notification.content,
            relatedVenue: {
              _id: venueId
            },
            createdAt: notification.createdAt
          }
        });
      }
    }
  } catch (error) {
    console.error('Error creating objective notification:', error);
  }
}

module.exports = {
  checkExpiringPromotions,
  checkLaunchingPromotions,
  checkPromotionObjectives
};

