const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const Badge = require('../models/Badge');
const Referral = require('../models/Referral');
const { checkReferralCompletion } = require('../routes/referrals');

// Daily points cap (max 15 points per user per day, including badge rewards)
const DAILY_POINTS_CAP = 15;

// Get how many points a user has earned today (all sources including badge rewards)
// source: 'revig' uses revigDailyPointsToday, anything else uses dailyPointsToday
const getDailyPointsEarned = async (userId, source = 'som') => {
  const DailyVenuePoints = require('../models/DailyVenuePoints');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Sum all DailyVenuePoints for today across all venues (SOM only — Revig doesn't use venue-based points)
  let venuePoints = 0;
  if (source !== 'revig') {
    const result = await DailyVenuePoints.aggregate([
      { $match: { user: new (require('mongoose').Types.ObjectId)(userId), date: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$totalPoints' } } }
    ]);
    venuePoints = result.length > 0 ? result[0].total : 0;
  }

  // Also check user's daily field as a fallback tracker
  const dailyField = source === 'revig' ? 'revigDailyPointsToday' : 'dailyPointsToday';
  const dateField = source === 'revig' ? 'revigDailyPointsDate' : 'dailyPointsDate';
  const user = await User.findById(userId).select(`${dailyField} ${dateField}`);
  const userDailyDate = user?.[dateField] ? new Date(user[dateField]) : null;
  const isToday = userDailyDate && userDailyDate.setHours(0,0,0,0) === startOfDay.getTime();
  const trackedPoints = isToday ? (user?.[dailyField] || 0) : 0;

  return Math.max(venuePoints, trackedPoints);
};

// Award points to user (with daily cap of 15)
// source: 'revig' awards to revigPoints fields, anything else awards to SOM points fields
const awardPoints = async (userId, points, reason = '', source = 'som') => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const isRevig = source === 'revig';
    const pointsField       = isRevig ? 'revigPoints'          : 'points';
    const dailyField        = isRevig ? 'revigDailyPointsToday' : 'dailyPointsToday';
    const dateField         = isRevig ? 'revigDailyPointsDate'  : 'dailyPointsDate';

    // Check daily cap (independent per app)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const userDailyDate = user[dateField] ? new Date(user[dateField]) : null;
    const isToday = userDailyDate && new Date(userDailyDate).setHours(0,0,0,0) === startOfDay.getTime();
    const earnedToday = isToday ? (user[dailyField] || 0) : 0;

    if (earnedToday >= DAILY_POINTS_CAP) {
      console.log(`⚠️ User ${userId} already at daily cap (${earnedToday}/${DAILY_POINTS_CAP}) for ${source}, no points awarded for: ${reason}`);
      return user[pointsField];
    }

    // Cap the points to not exceed daily limit
    const allowable = Math.min(points, DAILY_POINTS_CAP - earnedToday);
    if (allowable <= 0) return user[pointsField];

    user[pointsField] = (user[pointsField] || 0) + allowable;

    // Track lifetime total earned
    const totalEarnedField = isRevig ? 'revigTotalPointsEarned' : 'totalPointsEarned';
    user[totalEarnedField] = (user[totalEarnedField] || 0) + allowable;

    // Track daily earned points
    if (!isToday) {
      user[dailyField] = allowable;
      user[dateField] = startOfDay;
    } else {
      user[dailyField] = earnedToday + allowable;
    }

    await user.save();

    if (allowable < points) {
      console.log(`⚠️ Capped points for user ${userId} (${source}): requested ${points}, awarded ${allowable} (daily total: ${user[dailyField]}/${DAILY_POINTS_CAP})`);
    }

    // Check for badge unlocks (skip if this was a badge reward to avoid deep recursion)
    if (!reason.startsWith('badge_reward_')) {
      await checkBadges(userId, source);
    }

    return user[pointsField];
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};

// Update user stats
const updateUserStats = async (userId, updates) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.stats) {
      user.stats = {
        postsCount: 0,
        friendsCount: 0,
        venuesVisited: 0,
        referralsCount: 0
      };
    }

    Object.keys(updates).forEach(key => {
      if (user.stats[key] !== undefined) {
        user.stats[key] = (user.stats[key] || 0) + (updates[key] || 0);
      }
    });

    await user.save();
    await checkBadges(userId);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

// Update login streak
const updateLoginStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.loginStreak) {
      user.loginStreak = {
        current: 1,
        longest: 1,
        lastLoginDate: today
      };
    } else {
      const lastLogin = user.loginStreak.lastLoginDate 
        ? new Date(user.loginStreak.lastLoginDate)
        : null;
      
      if (lastLogin) {
        lastLogin.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          user.loginStreak.current = (user.loginStreak.current || 0) + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          user.loginStreak.current = 1;
        }
        // If daysDiff === 0, same day, don't update
      } else {
        user.loginStreak.current = 1;
      }

      user.loginStreak.lastLoginDate = today;
      if (user.loginStreak.current > (user.loginStreak.longest || 0)) {
        user.loginStreak.longest = user.loginStreak.current;
      }
    }

    await user.save();
    await checkBadges(userId);
  } catch (error) {
    console.error('Error updating login streak:', error);
  }
};

// Update check-in streak
const updateCheckInStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.checkInStreak) {
      user.checkInStreak = {
        current: 1,
        longest: 1,
        lastCheckInDate: today
      };
    } else {
      const lastCheckIn = user.checkInStreak.lastCheckInDate 
        ? new Date(user.checkInStreak.lastCheckInDate)
        : null;
      
      if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - lastCheckIn) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          user.checkInStreak.current = (user.checkInStreak.current || 0) + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          user.checkInStreak.current = 1;
        }
      } else {
        user.checkInStreak.current = 1;
      }

      user.checkInStreak.lastCheckInDate = today;
      if (user.checkInStreak.current > (user.checkInStreak.longest || 0)) {
        user.checkInStreak.longest = user.checkInStreak.current;
      }
    }

    await user.save();
    await checkBadges(userId);
  } catch (error) {
    console.error('Error updating check-in streak:', error);
  }
};

// Check and award badges
// source: passed through so badge point rewards go to the correct pool
const checkBadges = async (userId, source = 'som') => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const badges = await Badge.find({ isActive: true });
    const newlyUnlocked = [];

    for (const badge of badges) {
      // Check if user already has this badge
      const existingBadge = await UserBadge.findOne({ user: user._id, badge: badge._id });
      if (existingBadge) continue;

      // Check if user meets criteria
      let meetsCriteria = false;

      switch (badge.criteria.type) {
        case 'total_sent':
          meetsCriteria = (user.totalSent || 0) >= badge.criteria.value;
          break;
        case 'total_received':
          meetsCriteria = (user.totalReceived || 0) >= badge.criteria.value;
          break;
        case 'check_ins':
          meetsCriteria = (user.totalCheckIns || 0) >= badge.criteria.value;
          break;
        case 'friends':
          meetsCriteria = (user.friends?.length || 0) >= badge.criteria.value;
          break;
        case 'posts':
          meetsCriteria = (user.stats?.postsCount || 0) >= badge.criteria.value;
          break;
        case 'streak':
          meetsCriteria = (user.checkInStreak?.current || 0) >= badge.criteria.value;
          break;
        case 'venue_visits':
          meetsCriteria = (user.stats?.venuesVisited || 0) >= badge.criteria.value;
          break;
        case 'referrals':
          meetsCriteria = (user.stats?.referralsCount || 0) >= badge.criteria.value;
          break;
        case 'points':
          meetsCriteria = (user.points || 0) >= badge.criteria.value;
          break;
      }

      if (meetsCriteria) {
        // Award badge
        const userBadge = new UserBadge({
          user: user._id,
          badge: badge._id,
          progress: 100
        });
        await userBadge.save();

        // Award points if badge has point reward (subject to daily cap)
        // Points go to whichever app triggered the badge check
        if (badge.pointsReward > 0) {
          await awardPoints(user._id, badge.pointsReward, `badge_reward_${badge._id}`, source);
          // Re-fetch user to get updated points
          const pointsField = source === 'revig' ? 'revigPoints' : 'points';
          const refreshed = await User.findById(user._id).select(pointsField);
          if (refreshed) user[pointsField] = refreshed[pointsField];
        }

        newlyUnlocked.push(badge);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};

// Handle payment sent - award points and update stats
const handlePaymentSent = async (senderId, amount, source = 'som') => {
  try {
    const user = await User.findById(senderId);
    if (!user) return;

    // Update total sent
    user.totalSent = (user.totalSent || 0) + amount;
    await user.save();

    // Award points (1 point per dollar sent)
    await awardPoints(senderId, Math.floor(amount), 'payment_sent', source);

    // Check badges
    await checkBadges(senderId, source);
  } catch (error) {
    console.error('Error handling payment sent:', error);
  }
};

// Award tiered revenue share to referrers when a payment is made
const awardReferralRevenueShare = async (payerId, amountDollars) => {
  try {
    const now = new Date();
    // L1: find who referred the payer
    const l1Referral = await Referral.findOne({
      referred: payerId,
      status: { $in: ['completed', 'rewarded'] },
      'rewards.revenueShareExpiresAt': { $gt: now }
    });

    if (l1Referral) {
      // L1 share: 5% of payment as points (min 1 pt)
      const l1Points = Math.max(1, Math.round(amountDollars * 0.05));
      await User.findByIdAndUpdate(l1Referral.referrer, {
        $inc: { points: l1Points }
      });
      await Referral.findByIdAndUpdate(l1Referral._id, {
        $inc: { 'rewards.revenueShareEarned': l1Points }
      });

      // L2 share: 2% to whoever referred the L1 referrer
      const l2Referral = await Referral.findOne({
        referred: l1Referral.referrer,
        status: { $in: ['completed', 'rewarded'] },
        'rewards.revenueShareExpiresAt': { $gt: now }
      });

      if (l2Referral) {
        const l2Points = Math.max(1, Math.round(amountDollars * 0.02));
        await User.findByIdAndUpdate(l2Referral.referrer, {
          $inc: { points: l2Points }
        });
        await Referral.findByIdAndUpdate(l2Referral._id, {
          $inc: { 'rewards.revenueShareEarned': l2Points }
        });
      }
    }
  } catch (err) {
    console.error('Referral revenue share error:', err.message);
  }
};

// Handle payment received - award points and update stats
const handlePaymentReceived = async (recipientId, amount, source = 'som') => {
  try {
    const user = await User.findById(recipientId);
    if (!user) return;

    // Update total received
    user.totalReceived = (user.totalReceived || 0) + amount;
    await user.save();

    // Award points (0.5 points per dollar received)
    await awardPoints(recipientId, Math.floor(amount * 0.5), 'payment_received', source);

    // Check for referral completion
    await checkReferralCompletion(recipientId, 'first_payment');

    // Award revenue share to whoever referred the recipient
    awardReferralRevenueShare(recipientId, amount).catch(err =>
      console.error('Revenue share async error:', err.message)
    );

    // Check badges
    await checkBadges(recipientId, source);
  } catch (error) {
    console.error('Error handling payment received:', error);
  }
};

// Handle check-in - award points and update stats
const handleCheckIn = async (userId, venueId, source = 'som') => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Update check-in count
    user.totalCheckIns = (user.totalCheckIns || 0) + 1;
    await user.save();

    // Update check-in streak
    await updateCheckInStreak(userId);

    // Award check-in points only once per day total (not per venue)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckInPointsDate = user.lastCheckInPointsDate
      ? new Date(user.lastCheckInPointsDate)
      : null;
    const alreadyEarnedCheckInToday = lastCheckInPointsDate &&
      new Date(lastCheckInPointsDate).setHours(0, 0, 0, 0) === today.getTime();

    if (!alreadyEarnedCheckInToday) {
      await awardPoints(userId, 10, 'check_in', source);
      // Mark that check-in points were earned today
      await User.findByIdAndUpdate(userId, { lastCheckInPointsDate: today });
    } else {
      console.log(`ℹ️ User ${userId} already earned check-in points today, skipping`);
    }

    // Update venues visited
    const venuesVisited = new Set(user.locationHistory?.map(l => l.venueId?.toString()).filter(Boolean) || []);
    if (venueId && !venuesVisited.has(venueId.toString())) {
      await updateUserStats(userId, { venuesVisited: 1 });
    }

    // Check badges
    await checkBadges(userId, source);

    // Trigger referral completion for first check-in (async, don't block)
    if ((user.totalCheckIns || 0) === 1) {
      checkReferralCompletion(userId, 'first_checkin').catch(err =>
        console.error('Referral first_checkin error:', err)
      );
    }
  } catch (error) {
    console.error('Error handling check-in:', error);
  }
};

module.exports = {
  awardPoints,
  updateUserStats,
  updateLoginStreak,
  updateCheckInStreak,
  checkBadges,
  handlePaymentSent,
  handlePaymentReceived,
  handleCheckIn,
  awardReferralRevenueShare
};

