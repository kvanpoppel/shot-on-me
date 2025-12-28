const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['live_music', 'dj', 'trivia', 'sports', 'comedy', 'special', 'other'],
    default: 'other'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  image: String,
  coverCharge: {
    type: Number,
    default: 0
  },
  rsvpRequired: {
    type: Boolean,
    default: false
  },
  rsvps: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rsvpedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedInAt: {
      type: Date,
      default: Date.now
    }
  }],
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue.promotions'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
eventSchema.index({ venue: 1, startTime: 1 });
eventSchema.index({ startTime: 1, endTime: 1, isActive: 1 });
eventSchema.index({ 'rsvps.user': 1 });

module.exports = mongoose.model('Event', eventSchema);

