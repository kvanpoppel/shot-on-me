const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆' // Emoji or icon URL
  },
  category: {
    type: String,
    enum: ['payment', 'social', 'venue', 'streak', 'milestone', 'special'],
    required: true
  },
  criteria: {
    type: {
      type: String,
      enum: ['total_sent', 'total_received', 'check_ins', 'friends', 'posts', 'streak', 'venue_visits', 'referrals', 'points', 'custom'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    description: String // e.g., "Send $500 total"
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  pointsReward: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
badgeSchema.index({ category: 1, isActive: 1 });
badgeSchema.index({ 'criteria.type': 1 });

module.exports = mongoose.model('Badge', badgeSchema);

