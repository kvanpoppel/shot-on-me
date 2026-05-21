const express = require('express');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const { sendVenueWeeklyDigest } = require('../utils/emailService');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Build digest data for a venue
 */
async function buildDigest(venue) {
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // SOM payments this week
  const payments = await Payment.find({
    venueId: venue._id,
    status: { $in: ['succeeded', 'redeemed'] },
    createdAt: { $gte: weekAgo }
  }).lean();

  const somRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalRedemptions = payments.filter(p => p.type === 'shot_redeemed' || p.type === 'tap_and_pay').length;

  // Follower change (approximate — compare current count to a week ago is hard without snapshots)
  // We'll just report current count and note recent follower additions if tracked
  const followerCount = venue.followerCount || 0;

  // Best deal — find promotion with most revenue this week
  const activePromos = (venue.promotions || []).filter(p => {
    const start = p.startTime ? new Date(p.startTime) : null;
    const end = p.endTime ? new Date(p.endTime) : null;
    return start && start >= weekAgo;
  });

  let bestDeal = null;
  if (activePromos.length > 0 && payments.length > 0) {
    const promoRevenue = activePromos.map(p => {
      const start = new Date(p.startTime);
      const end = p.endTime ? new Date(p.endTime) : now;
      const during = payments.filter(pay => {
        const t = new Date(pay.createdAt);
        return t >= start && t <= end;
      });
      return { title: p.title, revenue: during.reduce((s, pay) => s + (pay.amount || 0), 0) };
    }).filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    if (promoRevenue.length > 0) bestDeal = promoRevenue[0];
  }

  const weekStart = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    venueName: venue.name,
    followerCount,
    followersGained: 0, // Would need weekly snapshots to track
    somRevenue,
    totalRedemptions,
    bestDeal,
    weekStart,
    weekEnd,
  };
}

// POST /api/weekly-digest/send — manually trigger digest for your venue (for testing)
router.post('/send', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    }).populate('owner');
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    const digest = await buildDigest(venue);
    const result = await sendVenueWeeklyDigest(venue.owner.email, digest);
    res.json({ message: 'Digest sent', ...result, preview: digest });
  } catch (err) {
    console.error('Manual digest error:', err);
    res.status(500).json({ error: 'Failed to send digest' });
  }
});

// POST /api/weekly-digest/send-all — send digest to ALL active venues (cron trigger)
router.post('/send-all', async (req, res) => {
  // Simple API key auth for cron triggers
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.CRON_API_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const venues = await Venue.find({ isActive: true }).populate('owner');
    let sent = 0, failed = 0;

    for (const venue of venues) {
      if (!venue.owner?.email) { failed++; continue; }
      try {
        const digest = await buildDigest(venue);
        // Only send if there's any activity to report
        if (digest.somRevenue > 0 || digest.totalRedemptions > 0 || digest.followerCount > 0) {
          await sendVenueWeeklyDigest(venue.owner.email, digest);
          sent++;
        }
      } catch { failed++; }
    }

    res.json({ message: `Digests sent: ${sent}, failed: ${failed}` });
  } catch (err) {
    console.error('Bulk digest error:', err);
    res.status(500).json({ error: 'Failed to send digests' });
  }
});

module.exports = router;
