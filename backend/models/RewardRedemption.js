const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  pointsSpent: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  redemptionCode: {
    type: String,
    sparse: true // For rewards that need codes
  },
  usedAt: Date,
  usedAtVenue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  expiresAt: Date
}, {
  timestamps: true
});

// Index for efficient querying
rewardRedemptionSchema.index({ user: 1, status: 1 });
rewardRedemptionSchema.index({ reward: 1 });
rewardRedemptionSchema.index({ redemptionCode: 1 }, { sparse: true, unique: true });

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema);

