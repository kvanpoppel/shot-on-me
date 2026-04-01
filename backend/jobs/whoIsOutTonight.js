/**
 * Who's Out Tonight — daily 8pm job
 *
 * Runs once per day at 8pm Central time (UTC-6, which is 2am UTC next day).
 * Finds users whose friends checked in at a venue today, then:
 *   1. Creates an in-app Notification for each recipient
 *   2. Sends an SMS (via Twilio) if the user has a phone number
 *
 * server.js schedules this by polling every minute after boot.
 */

const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Notification = require('../models/Notification');
const { sendSMS } = require('../utils/sms');

// Track the last date this ran so we fire at most once per day
let lastRunDate = null;

/**
 * Returns true if it's currently 8pm Central (UTC-6) or 8pm Eastern (UTC-5),
 * checking both zones because venues span IN/IL/KY/TN/MI/OH.
 * We fire if the current UTC hour is 1 (8pm Central) or 0 (8pm Eastern).
 */
function isEveningTime() {
  const nowUtc = new Date();
  const utcHour = nowUtc.getUTCHours();
  // 8pm Central = UTC 2:00  |  8pm Eastern = UTC 0:00
  return utcHour === 2 || utcHour === 0;
}

async function runWhoIsOutTonight() {
  try {
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10); // "2026-03-30"

    // Don't run twice on the same calendar day
    if (lastRunDate === dateKey) return;
    if (!isEveningTime()) return;

    lastRunDate = dateKey;
    console.log('[WhoIsOutTonight] Running evening notification job');

    // Find all check-ins that happened today
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todayCheckIns = await CheckIn.find({
      createdAt: { $gte: startOfDay },
    })
      .populate('user', '_id name firstName lastName')
      .populate('venue', 'name')
      .lean();

    if (todayCheckIns.length === 0) {
      console.log('[WhoIsOutTonight] No check-ins today, skipping');
      return;
    }

    // Map { userId -> [{ userName, venueName }] }
    const checkInsByUser = new Map();
    for (const ci of todayCheckIns) {
      if (!ci.user?._id) continue;
      const uid = ci.user._id.toString();
      if (!checkInsByUser.has(uid)) checkInsByUser.set(uid, []);
      checkInsByUser.get(uid).push({
        userName: ci.user.firstName || ci.user.name?.split(' ')[0] || 'Someone',
        venueName: ci.venue?.name || 'a venue',
      });
    }

    // For each user who has friends that checked in, notify them
    const checkedInUserIds = [...checkInsByUser.keys()];

    // Find all users whose friends array intersects with checkedInUserIds
    const usersToNotify = await User.find({
      friends: { $in: checkedInUserIds },
    })
      .select('_id name firstName phoneNumber friends')
      .lean();

    let notified = 0;

    for (const recipient of usersToNotify) {
      // Which of their friends checked in today?
      const friendIdsSet = new Set((recipient.friends || []).map(f => f.toString()));
      const outFriends = checkedInUserIds
        .filter(uid => friendIdsSet.has(uid))
        .flatMap(uid => checkInsByUser.get(uid));

      if (outFriends.length === 0) continue;

      // Build a friendly message
      const names = [...new Set(outFriends.map(f => f.userName))].slice(0, 3);
      const nameStr = names.length === 1
        ? names[0]
        : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
      const venueName = outFriends[0].venueName;
      const more = outFriends.length > 1 ? ` (+${outFriends.length - 1} more stops)` : '';

      const message = `🍺 ${nameStr} ${outFriends.length === 1 ? 'is' : 'are'} out tonight at ${venueName}${more}! Open Shot On Me to join them.`;
      const shortMsg = `${nameStr} ${outFriends.length === 1 ? 'is' : 'are'} out tonight 🍺`;

      // In-app notification
      try {
        await Notification.create({
          recipient: recipient._id,
          type: 'system',
          content: shortMsg,
        });
      } catch (e) {
        console.error('[WhoIsOutTonight] Failed to create notification:', e.message);
      }

      // SMS (fire and forget)
      if (recipient.phoneNumber) {
        sendSMS(recipient.phoneNumber, message).catch(() => {});
      }

      notified++;
    }

    console.log(`[WhoIsOutTonight] Done — notified ${notified} users`);
  } catch (err) {
    console.error('[WhoIsOutTonight] Job error:', err.message);
  }
}

module.exports = { runWhoIsOutTonight };
