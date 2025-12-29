const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  venueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Venue' 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: {
    type: String,
    default: 'usd'
  },
  type: {
    type: String,
    enum: ['wallet_topup', 'shot_sent', 'shot_redeemed', 'transfer', 'tap_and_pay'],
    required: true
  },
  stripePaymentIntentId: String,
  stripeTransferId: String,
  stripeChargeId: String,
  stripeAuthorizationId: String, // For Issuing authorizations (virtual card charges)
  redemptionCode: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled'],
    default: 'pending' 
  },
  idempotencyKey: {
    type: String,
    index: true,
    sparse: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
paymentSchema.index({ senderId: 1, createdAt: -1 });
paymentSchema.index({ recipientId: 1, createdAt: -1 });
paymentSchema.index({ venueId: 1, createdAt: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ stripeTransferId: 1 });
paymentSchema.index({ status: 1 });
// Sparse unique index - only enforces uniqueness for non-null values
// Note: sparse indexes skip null/undefined values, allowing multiple nulls
paymentSchema.index({ redemptionCode: 1 }, { sparse: true, unique: true });

module.exports = mongoose.model('Payment', paymentSchema);

