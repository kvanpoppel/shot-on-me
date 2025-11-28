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
  }
}, {
  timestamps: true
});

// Index for efficient querying
checkInSchema.index({ user: 1, createdAt: -1 });
checkInSchema.index({ venue: 1, createdAt: -1 });
checkInSchema.index({ user: 1, venue: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);

