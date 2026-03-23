const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'payment_sent', 'payment_received', 'tap_and_pay',
      'wallet_funded', 'wallet_redeemed', 'payment_refunded',
      'login', 'logout', 'register', 'password_reset',
      'admin_report_reviewed', 'admin_user_banned', 'admin_venue_deactivated'
    ]
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  amount: {
    type: Number
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  meta: {
    type: mongoose.Schema.Types.Mixed
  },
  ip: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-delete audit logs older than 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
