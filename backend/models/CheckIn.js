const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  points: {
    type: Number,
    default: 10 // Base points for checking in
  },
  reward: {
    type: String,
    default: '' // Optional reward description
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Referral tracking
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Optional - only set if checked in via referral
  },
  referralType: {
    type: String,
    enum: ['app', 'venue', 'event'],
    default: null
  },
  venueReferralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VenueReferral',
    sparse: true // Optional - link to venue referral if applicable
  },
  referralPoints: {
    type: Number,
    default: 0 // Additional points earned from referral
  }
}, {
  timestamps: true
});

// Index for efficient querying
checkInSchema.index({ user: 1, createdAt: -1 });
checkInSchema.index({ venue: 1, createdAt: -1 });
checkInSchema.index({ user: 1, venue: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);

