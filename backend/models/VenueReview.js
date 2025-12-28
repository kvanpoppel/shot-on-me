const mongoose = require('mongoose');

const venueReviewSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  checkInId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckIn',
    sparse: true // Optional - link to check-in if review was from check-in
  },
  isVerified: {
    type: Boolean,
    default: false // Verified if user actually checked in
  }
}, {
  timestamps: true
});

// One review per user per venue
venueReviewSchema.index({ venue: 1, user: 1 }, { unique: true });
venueReviewSchema.index({ venue: 1, rating: 1 });
venueReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VenueReview', venueReviewSchema);


