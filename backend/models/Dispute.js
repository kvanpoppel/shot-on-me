const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['unauthorized', 'not_received', 'duplicate', 'wrong_amount', 'other'],
    required: true
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved_refund', 'resolved_no_action', 'closed'],
    default: 'open'
  },
  resolution: {
    type: String,
    maxlength: 1000
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  stripeRefundId: {
    type: String
  },
  refundAmount: {
    type: Number
  },
  resolvedAt: {
    type: Date
  }
}, { timestamps: true });

disputeSchema.index({ userId: 1, createdAt: -1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ paymentId: 1 }, { unique: true }); // one dispute per payment

module.exports = mongoose.model('Dispute', disputeSchema);
