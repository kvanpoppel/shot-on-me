const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    required: true
    // Index defined below - don't use unique: true here to avoid duplicate
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rewarded'],
    default: 'pending'
  },
  // Track when referred user completes actions
  completedActions: {
    signedUp: { type: Boolean, default: false },
    firstPayment: { type: Boolean, default: false },
    firstCheckIn: { type: Boolean, default: false }
  },
  rewards: {
    referrerReward: {
      type: Number,
      default: 0 // Points or dollars
    },
    referredReward: {
      type: Number,
      default: 0
    },
    referrerRewarded: {
      type: Boolean,
      default: false
    },
    referredRewarded: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referred: 1 });
referralSchema.index({ referralCode: 1 }, { unique: true }); // Add unique here since removed from field definition

module.exports = mongoose.model('Referral', referralSchema);

