/**
 * Refund expired PendingPayments back to senders.
 *
 * MongoDB's TTL index will auto-delete PendingPayment records after 30 days,
 * but since the sender's balance was already deducted on creation, we must
 * refund them BEFORE the record is deleted.
 *
 * This job finds all 'pending' PendingPayments that are ≥ 29 days old (one day
 * before TTL deletion fires) and refunds the sender atomically.
 *
 * Called from server.js on a daily interval after DB connects.
 */

const User = require('../models/User');
const PendingPayment = require('../models/PendingPayment');
const AuditLog = require('../models/AuditLog');

const REFUND_AFTER_DAYS = 29; // one day before the 30-day TTL deletes the record

async function refundExpiredPendingPayments() {
  const cutoff = new Date(Date.now() - REFUND_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const expired = await PendingPayment.find({
    status: 'pending',
    createdAt: { $lte: cutoff }
  });

  if (expired.length === 0) return;

  console.log(`🔄 Refunding ${expired.length} expired pending payment(s)...`);

  for (const pending of expired) {
    try {
      // Atomically refund sender
      await User.findByIdAndUpdate(
        pending.senderId,
        { $inc: { 'wallet.balance': pending.amount } }
      );

      // Mark as refunded so we don't double-process
      pending.status = 'refunded';
      await pending.save();

      AuditLog.create({
        action: 'payment_refunded',
        actorId: pending.senderId,
        amount: pending.amount,
        meta: {
          reason: 'pending_payment_expired',
          recipientPhone: pending.recipientPhone,
          pendingPaymentId: pending._id
        }
      }).catch(() => {});

      console.log(`✅ Refunded $${pending.amount.toFixed(2)} to sender ${pending.senderId} (pending payment ${pending._id})`);
    } catch (err) {
      console.error(`❌ Failed to refund pending payment ${pending._id}:`, err.message);
    }
  }
}

module.exports = { refundExpiredPendingPayments };
