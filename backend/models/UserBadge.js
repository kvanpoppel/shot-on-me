const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0 // Track progress toward badge (0-100)
  }
}, {
  timestamps: true
});

// Ensure a user can only have one instance of each badge
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);

