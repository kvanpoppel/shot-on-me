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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Apply referral code (when new user signs up)
router.post('/apply', async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ message: 'Referral code and user ID are required' });
    }

    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    if (referrer._id.toString() === userId) {
      return res.status(400).json({ message: 'Cannot use your own referral code' });
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referrer: referrer._id,
      referred: userId
    });

    if (existingReferral) {
      return res.status(400).json({ message: 'Referral code already applied' });
    }

    // Create referral
    const referral = new Referral({
      referrer: referrer._id,
      referred: userId,
      referralCode: code,
      status: 'pending',
      rewards: {
        referrerReward: 5, // $5 or 5 points
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
      message: 'Referral code applied successfully',
      referral: {
        id: referral._id,
        code: referral.referralCode,
        rewards: referral.rewards
      }
    });
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get referral history
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
        completedActions: r.completedActions,
        rewards: r.rewards,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      // Award additional rewards
      const referrer = await User.findById(referral.referrer);
      referrer.points = (referrer.points || 0) + 10; // Additional 10 points
      await referrer.save();

      referral.rewards.referrerRewarded = true;
      referral.status = 'completed';
      await referral.save();
    }

    await referral.save();
  } catch (error) {
    console.error('Error checking referral completion:', error);
  }
};

module.exports = router;
module.exports.checkReferralCompletion = checkReferralCompletion;

