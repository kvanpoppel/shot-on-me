const User = require('../models/User');
const UserBadge = require('../models/UserBadge');
const Badge = require('../models/Badge');
const { checkReferralCompletion } = require('../routes/referrals');

// Award points to user
const awardPoints = async (userId, points, reason = '') => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.points = (user.points || 0) + points;
    await user.save();

    // Check for badge unlocks
    await checkBadges(userId);

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

        // Award points if badge has point reward
        if (badge.pointsReward > 0) {
          user.points = (user.points || 0) + badge.pointsReward;
          await user.save();
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

    // Award points (10 points per check-in)
    await awardPoints(userId, 10, 'check_in');

    // Update venues visited
    const venuesVisited = new Set(user.locationHistory?.map(l => l.venueId?.toString()).filter(Boolean) || []);
    if (venueId && !venuesVisited.has(venueId.toString())) {
      await updateUserStats(userId, { venuesVisited: 1 });
    }

    // Check badges
    await checkBadges(userId);
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
  handleCheckIn
};

