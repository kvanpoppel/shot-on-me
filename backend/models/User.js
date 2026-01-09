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
  lastSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['online', 'away', 'offline'],
    default: 'offline'
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPointsRedeemed: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardCashBalance: {
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
  }],
  followedVenues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  }],
  notificationPreferences: {
    pushEnabled: { type: Boolean, default: true },
    promotionNotifications: { type: Boolean, default: true },
    venueUpdates: { type: Boolean, default: true },
    friendActivity: { type: Boolean, default: true },
    paymentNotifications: { type: Boolean, default: true }
  },
  favoritePosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedPost'
  }],
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    }
  }],
  // Enhanced gamification fields
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  totalSent: {
    type: Number,
    default: 0
  },
  totalReceived: {
    type: Number,
    default: 0
  },
  totalCheckIns: {
    type: Number,
    default: 0
  },
  loginStreak: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastLoginDate: {
      type: Date
    }
  },
  stats: {
    postsCount: { type: Number, default: 0 },
    friendsCount: { type: Number, default: 0 },
    venuesVisited: { type: Number, default: 0 },
    referralsCount: { type: Number, default: 0 }
  },
  // Stripe integration
  stripeCustomerId: {
    type: String,
    sparse: true,
    index: true
  },
  defaultPaymentMethodId: {
    type: String,
    default: null
  },
  // User tracking for personalized promotions
  venueInteractions: {
    type: Map,
    of: {
      venueId: mongoose.Schema.Types.ObjectId,
      firstInteraction: Date,
      lastInteraction: Date,
      interactions: [{
        type: String, // 'view', 'click', 'checkin', 'redemption', 'share'
        timestamp: Date,
        metadata: mongoose.Schema.Types.Mixed
      }],
      preferences: {
        favoritePromotionTypes: [{
          type: String,
          count: Number
        }],
        preferredTimeframes: [{
          timeframe: String,
          count: Number
        }],
        visitFrequency: { type: Number, default: 0 }
      }
    },
    default: {}
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('User', userSchema);
