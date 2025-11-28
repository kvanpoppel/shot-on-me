const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['user', 'venue'],
    default: 'user'
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    isVisible: {
      type: Boolean,
      default: true
    },
    latitude: Number,
    longitude: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  profilePicture: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  checkInStreak: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastCheckInDate: {
      type: Date
    }
  },
  favoriteVenues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  }]
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('User', userSchema);
