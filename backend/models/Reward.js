const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['points', 'discount', 'free_item', 'vip_access', 'merchandise', 'cash_credit'],
    required: true
  },
  pointsCost: {
    type: Number,
    required: true,
    min: 0
  },
  value: {
    type: Number, // Dollar value or discount percentage
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    default: null // null = platform-wide reward
  },
  category: {
    type: String,
    enum: ['drink', 'food', 'experience', 'merchandise', 'credit', 'other'],
    default: 'other'
  },
  image: String,
  terms: String, // Terms and conditions
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number, // null = unlimited
    default: null
  },
  redeemedCount: {
    type: Number,
    default: 0
  },
  maxPerUser: {
    type: Number,
    default: 1 // How many times a user can redeem this
  }
}, {
  timestamps: true
});

// Index for efficient querying
rewardSchema.index({ isActive: 1, validUntil: 1 });
rewardSchema.index({ venue: 1, isActive: 1 });
rewardSchema.index({ pointsCost: 1 });

module.exports = mongoose.model('Reward', rewardSchema);

