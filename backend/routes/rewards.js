const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Reward = require('../models/Reward');
const RewardRedemption = require('../models/RewardRedemption');
const crypto = require('crypto');

// Get available rewards
router.get('/', auth, async (req, res) => {
  try {
    const { venueId, category } = req.query;
    const query = { isActive: true };

    if (venueId) {
      query.$or = [
        { venue: venueId },
        { venue: null } // Platform-wide rewards
      ];
    } else {
      query.venue = null; // Only platform-wide if no venue specified
    }

    if (category) {
      query.category = category;
    }

    // Check validity dates
    const now = new Date();
    query.$or = [
      { validUntil: { $gte: now } },
      { validUntil: null }
    ];

    const rewards = await Reward.find(query)
      .populate('venue', 'name address')
      .sort({ pointsCost: 1 });

    // Check user's redemption count for each reward
    const user = await User.findById(req.user.userId);
    const rewardsWithAvailability = await Promise.all(
      rewards.map(async (reward) => {
        const redemptionCount = await RewardRedemption.countDocuments({
          user: user._id,
          reward: reward._id,
          status: { $in: ['active', 'used'] }
        });

        const available = 
          (!reward.maxPerUser || redemptionCount < reward.maxPerUser) &&
          (!reward.stock || reward.redeemedCount < reward.stock) &&
          (user.points >= reward.pointsCost);

        return {
          ...reward.toObject(),
          available,
          userRedemptions: redemptionCount,
          canAfford: user.points >= reward.pointsCost
        };
      })
    );

    res.json({
      rewards: rewardsWithAvailability,
      userPoints: user.points || 0
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Redeem a reward
router.post('/redeem', auth, async (req, res) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({ message: 'Reward ID is required' });
    }

    const user = await User.findById(req.user.userId);
    const reward = await Reward.findById(rewardId);

    if (!reward || !reward.isActive) {
      return res.status(404).json({ message: 'Reward not found or inactive' });
    }

    // Check if reward is still valid
    if (reward.validUntil && new Date() > reward.validUntil) {
      return res.status(400).json({ message: 'Reward has expired' });
    }

    // Check stock
    if (reward.stock && reward.redeemedCount >= reward.stock) {
      return res.status(400).json({ message: 'Reward is out of stock' });
    }

    // Check user has enough points
    if (user.points < reward.pointsCost) {
      return res.status(400).json({ message: 'Insufficient points' });
    }

    // Check max per user
    const userRedemptions = await RewardRedemption.countDocuments({
      user: user._id,
      reward: reward._id,
      status: { $in: ['active', 'used'] }
    });

    if (reward.maxPerUser && userRedemptions >= reward.maxPerUser) {
      return res.status(400).json({ message: 'You have reached the maximum redemptions for this reward' });
    }

    // Deduct points
    user.points = user.points - reward.pointsCost;
    await user.save();

    // Create redemption
    const redemption = new RewardRedemption({
      user: user._id,
      reward: reward._id,
      pointsSpent: reward.pointsCost,
      status: 'active',
      redemptionCode: reward.type === 'discount' || reward.type === 'free_item' 
        ? crypto.randomBytes(4).toString('hex').toUpperCase()
        : null
    });

    // Set expiration if reward has validity period
    if (reward.validUntil) {
      redemption.expiresAt = reward.validUntil;
    } else if (reward.type === 'discount' || reward.type === 'free_item') {
      // Default 30 days for discount/free item rewards
      redemption.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    await redemption.save();

    // Update reward stats
    reward.redeemedCount = (reward.redeemedCount || 0) + 1;
    await reward.save();

    res.json({
      message: 'Reward redeemed successfully',
      redemption: {
        id: redemption._id,
        code: redemption.redemptionCode,
        expiresAt: redemption.expiresAt,
        reward: reward
      }
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's redeemed rewards
router.get('/my-rewards', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user: req.user.userId };

    if (status) {
      query.status = status;
    }

    const redemptions = await RewardRedemption.find(query)
      .populate('reward')
      .populate('usedAtVenue', 'name address')
      .sort({ createdAt: -1 });

    res.json({
      redemptions: redemptions.map(r => ({
        id: r._id,
        reward: r.reward,
        code: r.redemptionCode,
        status: r.status,
        expiresAt: r.expiresAt,
        usedAt: r.usedAt,
        usedAtVenue: r.usedAtVenue,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Use a reward (mark as used when redeemed at venue)
router.post('/use', auth, async (req, res) => {
  try {
    const { redemptionId, venueId } = req.body;

    if (!redemptionId) {
      return res.status(400).json({ message: 'Redemption ID is required' });
    }

    const redemption = await RewardRedemption.findById(redemptionId)
      .populate('reward');

    if (!redemption) {
      return res.status(404).json({ message: 'Redemption not found' });
    }

    if (redemption.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (redemption.status !== 'active') {
      return res.status(400).json({ message: 'Reward is not active' });
    }

    if (redemption.expiresAt && new Date() > redemption.expiresAt) {
      redemption.status = 'expired';
      await redemption.save();
      return res.status(400).json({ message: 'Reward has expired' });
    }

    redemption.status = 'used';
    redemption.usedAt = new Date();
    if (venueId) {
      redemption.usedAtVenue = venueId;
    }
    await redemption.save();

    res.json({
      message: 'Reward used successfully',
      redemption
    });
  } catch (error) {
    console.error('Error using reward:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

