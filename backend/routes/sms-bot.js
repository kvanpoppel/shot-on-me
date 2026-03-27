/**
 * SMS / WhatsApp Command Bot for venue owners
 *
 * Twilio webhook: POST /api/sms-bot/inbound
 * Configure your Twilio number's "A MESSAGE COMES IN" webhook to this URL.
 * For WhatsApp: use whatsapp:+1xxxxxxxxxx as the from number in .env (TWILIO_WHATSAPP_NUMBER).
 *
 * Supported commands (case-insensitive):
 *   stats / today              → today's check-ins, active promos, follower count
 *   promo 20% off drinks       → creates a flash deal active now for 3 hours
 *   happy hour 5pm-7pm         → creates a happy hour promo today
 *   pause ai / stop ai         → disable AI automation
 *   resume ai / start ai       → enable AI automation
 *   leaderboard                → top 5 promo performances this week
 *   help                       → list commands
 */
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const User = require('../models/User');
const Venue = require('../models/Venue');
const CheckIn = require('../models/CheckIn');

// ─── Helpers ────────────────────────────────────────────────────────────────────
function twimlReply(res, message) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  res.type('text/xml').send(twiml.toString());
}

function parseTime(str) {
  // Parses "5pm", "17:00", "5:30pm" → { hour, minute }
  const m = str.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const minute = parseInt(m[2] || '0');
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

function formatHour(h) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}${ampm}`;
}

// ─── Main inbound webhook ────────────────────────────────────────────────────────
router.post('/inbound', express.urlencoded({ extended: false }), async (req, res) => {
  // Optional: validate Twilio signature
  const sig = req.headers['x-twilio-signature'];
  const webhookSecret = process.env.TWILIO_AUTH_TOKEN;
  if (webhookSecret && sig) {
    const url = `${process.env.BACKEND_URL || `https://${req.hostname}`}/api/sms-bot/inbound`;
    const isValid = twilio.validateRequest(webhookSecret, sig, url, req.body);
    if (!isValid) {
      return res.status(403).send('<Response></Response>');
    }
  }

  const fromRaw = req.body.From || '';
  const body = (req.body.Body || '').trim();

  // Strip WhatsApp prefix
  const fromPhone = fromRaw.replace(/^whatsapp:/, '');

  if (!body || !fromPhone) {
    return twimlReply(res, 'Could not process your message. Please try again.');
  }

  // Look up user by phone number
  const user = await User.findOne({ phoneNumber: fromPhone })
    .select('_id name isOwner role');

  if (!user || (!user.isOwner && user.role !== 'admin')) {
    return twimlReply(res,
      'This number is not registered as a venue owner in Shot On Me. ' +
      'Log in to the app and ensure your phone number is set.'
    );
  }

  const venue = await Venue.findOne({ owner: user._id })
    .select('_id name promotions followers aiAutomation');

  if (!venue) {
    return twimlReply(res, 'No venue found for your account. Set up your venue in the app first.');
  }

  const cmd = body.toLowerCase();

  // ─── HELP ──────────────────────────────────────────────────────────────────
  if (cmd === 'help' || cmd === '?') {
    return twimlReply(res, [
      `🍸 Shot On Me — ${venue.name}`,
      '',
      'Commands:',
      '  stats          → today\'s activity',
      '  promo 20% off drinks → flash deal (3h)',
      '  happy hour 5pm-7pm  → happy hour today',
      '  pause ai / resume ai',
      '  leaderboard    → top promos this week',
      '  help           → this list'
    ].join('\n'));
  }

  // ─── STATS ─────────────────────────────────────────────────────────────────
  if (cmd === 'stats' || cmd === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [checkIns, activePromos] = await Promise.all([
      CheckIn.countDocuments({ venue: venue._id, createdAt: { $gte: startOfDay } }),
      Promise.resolve((venue.promotions || []).filter(p => p.isActive).length)
    ]);

    const followerCount = venue.followers?.length || 0;
    const aiStatus = venue.aiAutomation?.enabled ? 'ON' : 'OFF';

    return twimlReply(res, [
      `📊 ${venue.name} — Today`,
      `Check-ins: ${checkIns}`,
      `Active promos: ${activePromos}`,
      `Followers: ${followerCount}`,
      `AI Auto: ${aiStatus}`
    ].join('\n'));
  }

  // ─── PAUSE / RESUME AI ─────────────────────────────────────────────────────
  if (cmd.includes('pause ai') || cmd.includes('stop ai')) {
    venue.aiAutomation = venue.aiAutomation || {};
    venue.aiAutomation.enabled = false;
    await venue.save();
    return twimlReply(res, `⏸️ AI automation paused for ${venue.name}.`);
  }

  if (cmd.includes('resume ai') || cmd.includes('start ai')) {
    venue.aiAutomation = venue.aiAutomation || {};
    venue.aiAutomation.enabled = true;
    await venue.save();
    return twimlReply(res, `▶️ AI automation resumed for ${venue.name}.`);
  }

  // ─── LEADERBOARD ───────────────────────────────────────────────────────────
  if (cmd === 'leaderboard') {
    const promos = (venue.promotions || [])
      .filter(p => p.analytics?.redemptions > 0)
      .sort((a, b) => (b.analytics?.redemptions || 0) - (a.analytics?.redemptions || 0))
      .slice(0, 5);

    if (promos.length === 0) {
      return twimlReply(res, 'No promotion redemptions yet this period.');
    }

    const lines = [`🏆 Top promos at ${venue.name}:`];
    promos.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.title} — ${p.analytics?.redemptions} redemptions, ${p.analytics?.views} views`);
    });
    return twimlReply(res, lines.join('\n'));
  }

  // ─── HAPPY HOUR [time]-[time] ──────────────────────────────────────────────
  const happyHourMatch = cmd.match(/happy\s*hour\s+(\S+)\s*[-–to]+\s*(\S+)/);
  if (happyHourMatch) {
    const start = parseTime(happyHourMatch[1]);
    const end = parseTime(happyHourMatch[2]);

    if (!start || !end) {
      return twimlReply(res, 'Could not parse times. Example: happy hour 5pm-7pm');
    }

    const now = new Date();
    const promoStart = new Date(now);
    promoStart.setHours(start.hour, start.minute, 0, 0);
    const promoEnd = new Date(now);
    promoEnd.setHours(end.hour, end.minute, 0, 0);

    venue.promotions = venue.promotions || [];
    venue.promotions.push({
      title: `Happy Hour: ${formatHour(start.hour)}-${formatHour(end.hour)}`,
      description: `Happy hour special created via SMS`,
      discount: 20,
      type: 'happy-hour',
      isActive: true,
      startTime: promoStart,
      endTime: promoEnd,
      analytics: { views: 0, clicks: 0, shares: 0, redemptions: 0, revenue: 0 }
    });
    await venue.save();

    return twimlReply(res,
      `🍻 Happy hour created at ${venue.name}!\n` +
      `${formatHour(start.hour)} – ${formatHour(end.hour)} today.\n` +
      `Open the app to notify followers.`
    );
  }

  // ─── PROMO [discount]% [description] ──────────────────────────────────────
  const promoMatch = cmd.match(/promo\s+(\d{1,3})%\s+(.+)/);
  if (promoMatch) {
    const discount = Math.min(100, Math.max(1, parseInt(promoMatch[1])));
    const description = promoMatch[2].trim();
    const flashEndsAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    venue.promotions = venue.promotions || [];
    venue.promotions.push({
      title: `${discount}% Off — ${description}`,
      description: `Flash deal created via SMS`,
      discount,
      type: 'flash-deal',
      isActive: true,
      isFlashDeal: true,
      flashDealEndsAt: flashEndsAt,
      startTime: new Date(),
      endTime: flashEndsAt,
      analytics: { views: 0, clicks: 0, shares: 0, redemptions: 0, revenue: 0 }
    });
    await venue.save();

    return twimlReply(res,
      `⚡ Flash deal live at ${venue.name}!\n` +
      `${discount}% off ${description}\n` +
      `Active for 3 hours. Followers notified automatically if AI auto is ON.`
    );
  }

  // ─── UNKNOWN ───────────────────────────────────────────────────────────────
  return twimlReply(res, `Unknown command. Text HELP for a list of commands.\n\n— Shot On Me Bot`);
});

module.exports = router;
