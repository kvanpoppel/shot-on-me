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
  type: {
    type: String,
    enum: ['wallet_topup', 'shot_sent', 'shot_redeemed', 'transfer'],
    required: true
  },
  stripePaymentIntentId: String,
  stripeTransferId: String,
  stripeChargeId: String,
  redemptionCode: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled'],
    default: 'pending' 
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
paymentSchema.index({ redemptionCode: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);

