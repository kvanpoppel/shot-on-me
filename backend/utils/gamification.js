const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const Badge = require('../models/Badge');
const Referral = require('../models/Referral');
const { checkReferralCompletion } = require('../routes/referrals');

// Daily points cap (max 15 points per user per day, including badge rewards)
const DAILY_POINTS_CAP = 15;

// Get how many points a user has earned today (all sources including badge rewards)
const getDailyPointsEarned = async (userId) => {
  const DailyVenuePoints = require('../models/DailyVenuePoints');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Sum all DailyVenuePoints for today across all venues
  const result = await DailyVenuePoints.aggregate([
    { $match: { user: new (require('mongoose').Types.ObjectId)(userId), date: { $gte: startOfDay } } },
    { $group: { _id: null, total: { $sum: '$totalPoints' } } }
  ]);

  // Also check user's dailyPointsToday field as a fallback tracker
  const venuePoints = result.length > 0 ? result[0].total : 0;
  const user = await User.findById(userId).select('dailyPointsToday dailyPointsDate');
  const userDailyDate = user?.dailyPointsDate ? new Date(user.dailyPointsDate) : null;
  const isToday = userDailyDate && userDailyDate.setHours(0,0,0,0) === startOfDay.getTime();
  const trackedPoints = isToday ? (user?.dailyPointsToday || 0) : 0;

  return Math.max(venuePoints, trackedPoints);
};

// Award points to user (with daily cap of 15)
const awardPoints = async (userId, points, reason = '') => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Check daily cap
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const userDailyDate = user.dailyPointsDate ? new Date(user.dailyPointsDate) : null;
    const isToday = userDailyDate && new Date(userDailyDate).setHours(0,0,0,0) === startOfDay.getTime();
    const earnedToday = isToday ? (user.dailyPointsToday || 0) : 0;

    if (earnedToday >= DAILY_POINTS_CAP) {
      console.log(`⚠️ User ${userId} already at daily cap (${earnedToday}/${DAILY_POINTS_CAP}), no points awarded for: ${reason}`);
      return user.points;
    }

    // Cap the points to not exceed daily limit
    const allowable = Math.min(points, DAILY_POINTS_CAP - earnedToday);
    if (allowable <= 0) return user.points;

    user.points = (user.points || 0) + allowable;

    // Track daily earned points
    if (!isToday) {
      user.dailyPointsToday = allowable;
      user.dailyPointsDate = startOfDay;
    } else {
      user.dailyPointsToday = earnedToday + allowable;
    }

    await user.save();

    if (allowable < points) {
      console.log(`⚠️ Capped points for user ${userId}: requested ${points}, awarded ${allowable} (daily total: ${user.dailyPointsToday}/${DAILY_POINTS_CAP})`);
    }

    // Check for badge unlocks (skip if this was a badge reward to avoid deep recursion)
    if (!reason.startsWith('badge_reward_')) {
      await checkBadges(userId);
    }

    return user.points;
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
const checkBadges = async (userId) => {
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
        if (badge.pointsReward > 0) {
          await awardPoints(user._id, badge.pointsReward, `badge_reward_${badge._id}`);
          // Re-fetch user to get updated points
          const refreshed = await User.findById(user._id).select('points');
          if (refreshed) user.points = refreshed.points;
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
const handlePaymentSent = async (senderId, amount) => {
  try {
    const user = await User.findById(senderId);
    if (!user) return;

    // Update total sent
    user.totalSent = (user.totalSent || 0) + amount;
    await user.save();

    // Award points (1 point per dollar sent)
    await awardPoints(senderId, Math.floor(amount), 'payment_sent');

    // Check badges
    await checkBadges(senderId);
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
const handlePaymentReceived = async (recipientId, amount) => {
  try {
    const user = await User.findById(recipientId);
    if (!user) return;

    // Update total received
    user.totalReceived = (user.totalReceived || 0) + amount;
    await user.save();

    // Award points (0.5 points per dollar received)
    await awardPoints(recipientId, Math.floor(amount * 0.5), 'payment_received');

    // Check for referral completion
    await checkReferralCompletion(recipientId, 'first_payment');

    // Award revenue share to whoever referred the recipient
    awardReferralRevenueShare(recipientId, amount).catch(err =>
      console.error('Revenue share async error:', err.message)
    );

    // Check badges
    await checkBadges(recipientId);
  } catch (error) {
    console.error('Error handling payment received:', error);
  }
};

// Handle check-in - award points and update stats
const handleCheckIn = async (userId, venueId) => {
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
      await awardPoints(userId, 10, 'check_in');
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
    await checkBadges(userId);

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

