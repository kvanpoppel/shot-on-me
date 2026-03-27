/**
 * Viral Moment Detector
 *
 * Scans all active promotions every 15 minutes.
 * A "viral moment" is when a promotion's view/click/share velocity in the last
 * hour is ≥ 3× its 7-day hourly baseline.
 *
 * On detection:
 *  1. Marks the promotion as a flash deal (visible boost in feed)
 *  2. Notifies the venue owner via socket
 *  3. Fires follower notifications if auto-notify is enabled
 *  4. Logs the event in venue.viralEvents
 */

const Venue = require('../models/Venue');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Minimum absolute activity to avoid false positives on tiny venues
const MIN_VIEWS_FOR_SPIKE = 5;
const SPIKE_MULTIPLIER = 3; // 3× baseline = viral

async function detectViralMoments(io) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Only look at venues with active promotions
  const venues = await Venue.find({
    'promotions.isActive': true,
    isActive: true
  }).select('_id name owner promotions aiAutomation viralEvents followers').lean();

  const detected = [];

  for (const venue of venues) {
    for (const promo of venue.promotions || []) {
      if (!promo.isActive || !promo.analytics) continue;

      const viewHistory = promo.analytics.viewHistory || [];

      // Compute last-hour views from viewHistory
      const recentViews = viewHistory
        .filter(h => new Date(h.date) >= oneHourAgo)
        .reduce((sum, h) => sum + (h.count || 0), 0);

      if (recentViews < MIN_VIEWS_FOR_SPIKE) continue;

      // Compute 7-day hourly baseline (total views / 168 hours)
      const historicViews = viewHistory
        .filter(h => new Date(h.date) >= sevenDaysAgo && new Date(h.date) < oneHourAgo)
        .reduce((sum, h) => sum + (h.count || 0), 0);

      const hoursOfHistory = Math.min(
        167,
        viewHistory.filter(h => new Date(h.date) >= sevenDaysAgo && new Date(h.date) < oneHourAgo).length
      );

      const hourlyBaseline = hoursOfHistory > 0 ? historicViews / hoursOfHistory : 0;

      // Spike check
      const isViral = hourlyBaseline === 0
        ? recentViews >= MIN_VIEWS_FOR_SPIKE * 2  // No history → spike if decent absolute activity
        : recentViews >= hourlyBaseline * SPIKE_MULTIPLIER;

      if (!isViral) continue;

      // Avoid re-triggering within 2 hours
      const lastViralAt = promo.analytics?.lastViralAt ? new Date(promo.analytics.lastViralAt) : null;
      if (lastViralAt && (now - lastViralAt) < 2 * 60 * 60 * 1000) continue;

      detected.push({
        venueId: venue._id,
        venueName: venue.name,
        venueOwner: venue.owner,
        promoId: promo._id,
        promoTitle: promo.title,
        recentViews,
        hourlyBaseline: Math.round(hourlyBaseline * 10) / 10,
        multiplier: hourlyBaseline > 0 ? Math.round((recentViews / hourlyBaseline) * 10) / 10 : '∞',
        followerCount: venue.followers?.length || 0,
        autoNotify: venue.aiAutomation?.autoNotifyFollowers ?? true
      });
    }
  }

  if (detected.length === 0) return { detected: 0, events: [] };

  // Process each viral moment
  const results = [];
  for (const event of detected) {
    try {
      // 1. Mark promotion as flash deal + record viral timestamp
      await Venue.updateOne(
        { _id: event.venueId, 'promotions._id': event.promoId },
        {
          $set: {
            'promotions.$.isFlashDeal': true,
            'promotions.$.flashDealEndsAt': new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2-hour boost
            'promotions.$.analytics.lastViralAt': now
          },
          $push: {
            viralEvents: {
              promotionId: event.promoId,
              promotionTitle: event.promoTitle,
              detectedAt: now,
              recentViews: event.recentViews,
              multiplier: event.multiplier
            }
          }
        }
      );

      // 2. Notify venue owner via socket
      if (io) {
        io.to(`user_${event.venueOwner}`).emit('viral:moment_detected', {
          venueId: event.venueId,
          venueName: event.venueName,
          promotionId: event.promoId,
          promotionTitle: event.promoTitle,
          recentViews: event.recentViews,
          multiplier: event.multiplier,
          message: `"${event.promoTitle}" is going viral! ${event.recentViews} views in the last hour (${event.multiplier}× normal).`
        });
      }

      // 3. Create in-app notification for venue owner
      try {
        const ownerNotif = new Notification({
          recipient: event.venueOwner,
          type: 'viral_moment',
          title: 'Viral Moment Detected!',
          message: `"${event.promoTitle}" at ${event.venueName} is getting ${event.multiplier}× normal traffic. Auto-boosted for 2 hours.`,
          data: {
            venueId: event.venueId.toString(),
            promotionId: event.promoId.toString()
          }
        });
        await ownerNotif.save();
      } catch { /* non-critical */ }

      // 4. Notify followers if auto-notify enabled
      if (event.autoNotify && event.followerCount > 0) {
        const venue = await Venue.findById(event.venueId).select('followers').lean();
        const followerIds = (venue?.followers || []).slice(0, 500); // cap at 500 for performance

        const followerNotifs = followerIds.map(followerId => ({
          recipient: followerId,
          type: 'promotion_viral',
          title: `Hot deal at ${event.venueName}!`,
          message: `"${event.promoTitle}" is trending right now — limited time boost active.`,
          data: {
            venueId: event.venueId.toString(),
            promotionId: event.promoId.toString()
          }
        }));

        if (followerNotifs.length > 0) {
          await Notification.insertMany(followerNotifs, { ordered: false });
          // Push via socket
          if (io) {
            followerIds.forEach(fid => {
              io.to(`user_${fid}`).emit('notification', {
                type: 'promotion_viral',
                title: `Hot deal at ${event.venueName}!`,
                message: `"${event.promoTitle}" is trending right now.`
              });
            });
          }
        }
      }

      results.push({ ...event, boosted: true });
      console.log(`[ViralDetector] ${event.venueName} — "${event.promoTitle}" viral (${event.multiplier}×, ${event.recentViews} views/hr)`);
    } catch (err) {
      console.error(`[ViralDetector] Error processing viral event for venue ${event.venueId}:`, err.message);
    }
  }

  return { detected: results.length, events: results };
}

module.exports = { detectViralMoments };
