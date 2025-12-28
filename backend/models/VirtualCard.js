const mongoose = require('mongoose');

const virtualCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One card per user
    index: true
  },
  stripeCardId: {
    type: String,
    required: true
    // Index defined below - don't use unique: true here to avoid duplicate
  },
  stripeCardholderId: {
    type: String,
    required: true,
    index: true
  },
  last4: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover'],
    required: true
  },
  expirationMonth: {
    type: Number,
    required: true
  },
  expirationYear: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted', 'suspended'],
    default: 'active'
  },
  addedToAppleWallet: {
    type: Boolean,
    default: false
  },
  addedToGooglePay: {
    type: Boolean,
    default: false
  },
  appleWalletPassId: {
    type: String
  },
  googlePayTokenId: {
    type: String
  },
  deletionWarningsShown: {
    type: Number,
    default: 0
  },
  lastDeletedAt: {
    type: Date
  },
  minimumBalance: {
    type: Number,
    default: 5.00 // $5 minimum
  },
  spendingLimits: {
    daily: {
      type: Number,
      default: 1000.00 // $1,000 daily limit
    },
    weekly: {
      type: Number,
      default: 5000.00 // $5,000 weekly limit
    },
    monthly: {
      type: Number,
      default: 10000.00 // $10,000 monthly limit
    },
    perTransaction: {
      min: {
        type: Number,
        default: 5.00 // $5 minimum transaction
      },
      max: {
        type: Number,
        default: 500.00 // $500 maximum transaction
      }
    }
  },
  metadata: {
    createdAt: Date,
    lastUsedAt: Date,
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  // Custom card design
  customDesignId: {
    type: String, // Stripe Issuing Design ID
    index: true
  },
  customDesignUrl: {
    type: String // Cloudinary URL of the design with branding overlay
  }
}, {
  timestamps: true
});

// Index for efficient queries
virtualCardSchema.index({ user: 1, status: 1 });
virtualCardSchema.index({ stripeCardId: 1 }, { unique: true }); // Add unique here since removed from field definition
virtualCardSchema.index({ status: 1 });

// Method to check if card can be used
virtualCardSchema.methods.canUse = function(userBalance) {
  if (this.status !== 'active') {
    return { canUse: false, reason: 'Card is not active' };
  }
  
  if (userBalance < this.minimumBalance) {
    return { 
      canUse: false, 
      reason: `Minimum balance of $${this.minimumBalance} required` 
    };
  }
  
  return { canUse: true };
};

// Method to check spending limits
virtualCardSchema.methods.checkSpendingLimit = function(amount, period = 'daily') {
  const limit = this.spendingLimits[period];
  const currentSpending = this.metadata.totalSpent || 0;
  
  if (currentSpending + amount > limit) {
    return {
      allowed: false,
      reason: `Exceeds ${period} spending limit of $${limit}`,
      remaining: Math.max(0, limit - currentSpending)
    };
  }
  
  return { allowed: true };
};

module.exports = mongoose.model('VirtualCard', virtualCardSchema);

