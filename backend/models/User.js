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
    minlength: 12
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
    paymentNotifications: { type: Boolean, default: true },
    aiPersonalizationEnabled: { type: Boolean, default: true },
    // Venue owner specific notifications
    promotionExpiring: { type: Boolean, default: true }, // Notify when promotion expiring soon
    promotionLaunching: { type: Boolean, default: true }, // Notify when promotion about to launch
    promotionObjectives: { type: Boolean, default: true }, // Notify when reaching objectives (views, clicks, revenue)
    aiRenewalSuggestions: { type: Boolean, default: true }, // Notify about AI renewal suggestions
    expirationWarningHours: { type: Number, default: 24 }, // Hours before expiration to warn (default 24h)
    launchWarningHours: { type: Number, default: 1 } // Hours before launch to notify (default 1h)
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
  loyaltyProgress: [{
    partnershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoyaltyPartnership' },
    visitedVenueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Venue' }],
    rewardClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date }
  }],
  influencerStats: {
    totalEarned: { type: Number, default: 0 },
    completedOffers: { type: Number, default: 0 }
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
  },
  // Lightweight AI personalization signals (persisted across devices)
  aiSignals: {
    viewedProfileIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    addedFriendIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    feedback: {
      helpfulCount: { type: Number, default: 0 },
      lessLikeThisCount: { type: Number, default: 0 }
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  agreements: {
    termsAcceptedAt: {
      type: Date
    },
    privacyAcceptedAt: {
      type: Date
    },
    acceptedVersion: {
      type: String,
      default: 'v1'
    }
  },
  // Role-based access control — used by owner/admin middleware
  role: {
    type: String,
    enum: ['user', 'admin', 'owner'],
    default: 'user'
  },
  isOwner: {
    type: Boolean,
    default: false
  },
  // Payment 2FA — single-use OTP, cleared after use or expiry
  paymentOtp: {
    hash: { type: String },
    expiresAt: { type: Date }
  },
  // KYC / identity verification
  kyc: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'failed'],
      default: 'unverified'
    },
    stripeVerificationSessionId: { type: String },
    verifiedAt: { type: Date },
    failureReason: { type: String }
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 }, { sparse: true });
userSchema.index({ userType: 1 });
userSchema.index({ friends: 1 });
userSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('User', userSchema);
