const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Referral = require('../models/Referral');
const Payment = require('../models/Payment');
const CheckIn = require('../models/CheckIn');
const crypto = require('crypto');

// Generate unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Get user's referral code (create if doesn't exist)
router.get('/code', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user.referralCode) {
      let code = generateReferralCode();
      // Ensure uniqueness
      while (await User.findOne({ referralCode: code })) {
        code = generateReferralCode();
      }
      user.referralCode = code;
      await user.save();
    }

    // Get referral stats
    const referrals = await Referral.find({ referrer: user._id });
    const completed = referrals.filter(r => r.status === 'completed').length;
    const pending = referrals.filter(r => r.status === 'pending').length;

    res.json({
      code: user.referralCode,
      totalReferrals: referrals.length,
      completed,
      pending,
      rewards: {
        totalEarned: referrals.reduce((sum, r) => sum + (r.rewards.referrerReward || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Apply referral (when new user signs up via invite link)
// Uses referrerId (user ID) only – no visible referral code. Tied to user ID on backend.
router.post('/apply', auth, async (req, res) => {
  try {
    const { referrerId, userId } = req.body;

    if (!referrerId || !userId) {
      return res.status(400).json({ message: 'Referrer ID and user ID are required' });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(referrerId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid referrer or user ID' });
    }

    // Ensure the authenticated user is the one being referred
    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: userId does not match authenticated user' });
    }

    const referrer = await User.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referrer' });
    }

    if (referrer._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot refer yourself' });
    }

    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: userId
    });

    if (existingReferral) {
      return res.status(400).json({ message: 'Referral already applied' });
    }

    const internalCode = `ref-${referrerId}-${userId}`;
    const referral = new Referral({
      referrer: referrer._id,
      referred: userId,
      referralCode: internalCode,
      status: 'pending',
      rewards: {
        referrerReward: 5,
        referredReward: 5
      }
    });

    await referral.save();

    // Award initial reward to both users
    const referredUser = await User.findById(userId);
    referredUser.points = (referredUser.points || 0) + 5;
    await referredUser.save();

    referrer.points = (referrer.points || 0) + 5;
    await referrer.save();

    // Update stats
    if (!referrer.stats) referrer.stats = {};
    referrer.stats.referralsCount = (referrer.stats.referralsCount || 0) + 1;
    await referrer.save();

    res.json({
      message: 'Referral applied successfully',
      referral: {
        id: referral._id,
        rewards: referral.rewards
      }
    });
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Referral tier thresholds
const TIERS = [
  { name: 'Bronze', min: 0, max: 4, revenueSharePct: 0.03, l2SharePct: 0.01 },
  { name: 'Silver', min: 5, max: 9, revenueSharePct: 0.05, l2SharePct: 0.02 },
  { name: 'Gold',   min: 10, max: Infinity, revenueSharePct: 0.05, l2SharePct: 0.02 }
];

const getTier = (completedCount) =>
  TIERS.find(t => completedCount >= t.min && completedCount <= t.max) || TIERS[0];

// GET /api/referrals/stats — tier + earnings summary
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('referralCode stats');

    const referrals = await Referral.find({ referrer: req.user.userId });
    const completedCount = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const pendingCount = referrals.filter(r => r.status === 'pending').length;
    const totalRevenueShare = referrals.reduce((sum, r) => sum + (r.rewards.revenueShareEarned || 0), 0);
    const totalPointsEarned = referrals.reduce((sum, r) => sum + (r.rewards.referrerReward || 0), 0);

    const tier = getTier(completedCount);
    const nextTier = TIERS[TIERS.indexOf(tier) + 1] || null;
    const toNextTier = nextTier ? nextTier.min - completedCount : 0;

    // Gold milestone: unlock exclusive deal (triggered at 10 completed)
    const goldUnlocked = completedCount >= 10;

    res.json({
      referralCode: user?.referralCode,
      tier: {
        name: tier.name,
        revenueSharePct: tier.revenueSharePct,
        l2SharePct: tier.l2SharePct,
        nextTierName: nextTier?.name || null,
        referralsToNextTier: toNextTier
      },
      stats: {
        total: referrals.length,
        completed: completedCount,
        pending: pendingCount,
        totalPointsEarned,
        totalRevenueShareEarned: Math.round(totalRevenueShare * 100) / 100,
        goldUnlocked
      }
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/referrals/history
router.get('/history', auth, async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user.userId })
      .populate('referred', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      referrals: referrals.map(r => ({
        id: r._id,
        referred: r.referred,
        status: r.status,
        level: r.level || 1,
        completedActions: r.completedActions,
        rewards: r.rewards,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Check referral completion (called when referred user completes actions)
const checkReferralCompletion = async (referredUserId, actionType) => {
  try {
    const referral = await Referral.findOne({ referred: referredUserId, status: 'pending' });
    if (!referral) return;

    // Update completed actions
    switch (actionType) {
      case 'signed_up':
        referral.completedActions.signedUp = true;
        break;
      case 'first_payment':
        referral.completedActions.firstPayment = true;
        break;
      case 'first_checkin':
        referral.completedActions.firstCheckIn = true;
        break;
    }

    // Check if all actions completed
    const allCompleted = 
      referral.completedActions.signedUp &&
      referral.completedActions.firstPayment &&
      referral.completedActions.firstCheckIn;

    if (allCompleted && !referral.rewards.referrerRewarded) {
      const referrer = await User.findById(referral.referrer);

      // Determine tier bonus based on completed count
      const completedSoFar = await Referral.countDocuments({
        referrer: referral.referrer,
        status: { $in: ['completed', 'rewarded'] }
      });
      const tier = getTier(completedSoFar);

      // Completion bonus: 10 pts base + tier multiplier
      const tierBonus = tier.name === 'Gold' ? 25 : tier.name === 'Silver' ? 15 : 10;
      referrer.points = (referrer.points || 0) + tierBonus;

      // Set up 12-month revenue share window
      const revenueShareExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      referral.rewards.revenueShareExpiresAt = revenueShareExpiry;
      referral.rewards.referrerReward = (referral.rewards.referrerReward || 0) + tierBonus;
      referral.rewards.referrerRewarded = true;
      referral.status = 'completed';
      await referral.save();
      await referrer.save();

      // Gold milestone: update stats for unlock tracking
      if (completedSoFar + 1 >= 10) {
        referrer.stats = referrer.stats || {};
        // Flag can be read by frontend to show Gold unlock celebration
        if (!referrer.goldReferralUnlockedAt) {
          referrer.goldReferralUnlockedAt = new Date();
          await referrer.save();
        }
      }
    } else {
      await referral.save();
    }
  } catch (error) {
    console.error('Error checking referral completion:', error);
  }
};

module.exports = router;
module.exports.checkReferralCompletion = checkReferralCompletion;

