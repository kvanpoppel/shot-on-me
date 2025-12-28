const mongoose = require('mongoose');

const venueLoyaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  checkInCount: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastCheckIn: {
    type: Date
  },
  firstCheckIn: {
    type: Date,
    default: Date.now
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'vip'],
    default: 'bronze'
  },
  badges: [{
    badgeId: String,
    name: String,
    earnedAt: { type: Date, default: Date.now }
  }],
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastCheckInDate: Date
  }
}, {
  timestamps: true
});

// One loyalty record per user per venue
venueLoyaltySchema.index({ user: 1, venue: 1 }, { unique: true });
venueLoyaltySchema.index({ venue: 1, checkInCount: -1 }); // For leaderboards
venueLoyaltySchema.index({ venue: 1, totalSpent: -1 }); // For VIP tracking

module.exports = mongoose.model('VenueLoyalty', venueLoyaltySchema);


