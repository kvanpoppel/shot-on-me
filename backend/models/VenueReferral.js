const mongoose = require('mongoose');

const venueReferralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  checkIn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckIn',
    sparse: true // Optional - only set when recipient checks in
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending'
  },
  pointsAwarded: {
    referrer: {
      type: Number,
      default: 0
    },
    recipient: {
      type: Number,
      default: 0
    },
    referrerAwarded: {
      type: Boolean,
      default: false
    },
    recipientAwarded: {
      type: Boolean,
      default: false
    }
  },
  inviteLink: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    // Default: expires in 7 days if not used
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
venueReferralSchema.index({ referrer: 1, venue: 1, status: 1 });
venueReferralSchema.index({ recipient: 1, status: 1 });
venueReferralSchema.index({ venue: 1, status: 1 });
// checkIn is optional and sparse - no need for separate index, can query via compound indexes
// Prevent duplicate referrals (same referrer inviting same recipient to same venue)
venueReferralSchema.index({ referrer: 1, recipient: 1, venue: 1 }, { unique: true });

module.exports = mongoose.model('VenueReferral', venueReferralSchema);

