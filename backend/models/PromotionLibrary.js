const mongoose = require('mongoose');

const promotionLibrarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  // Store the full promotion data
  promotionData: {
    type: mongoose.Schema.Types.Mixed // Use Mixed to allow flexible structure
  },
  // Performance metrics when saved
  performance: {
    views: Number,
    clicks: Number,
    redemptions: Number,
    revenue: Number,
    conversionRate: Number
  },
  // Tags for organization
  tags: [String],
  // Category for filtering
  category: {
    type: String,
    enum: ['happy-hour', 'special', 'event', 'flash-deal', 'exclusive', 'other'],
    default: 'other'
  },
  // Usage count (how many times it's been reused)
  usageCount: {
    type: Number,
    default: 0
  },
  // Last used date
  lastUsed: Date
}, {
  timestamps: true
});

// Indexes for efficient querying
promotionLibrarySchema.index({ userId: 1, createdAt: -1 });
promotionLibrarySchema.index({ venueId: 1 });
promotionLibrarySchema.index({ category: 1 });
promotionLibrarySchema.index({ tags: 1 });

module.exports = mongoose.model('PromotionLibrary', promotionLibrarySchema);

