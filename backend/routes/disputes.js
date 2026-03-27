const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Dispute = require('../models/Dispute');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Initialize Stripe for refunds
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ─── User: File a dispute ──────────────────────────────────────────────────────
// POST /api/disputes
router.post('/', auth, async (req, res) => {
  try {
    const { paymentId, reason, description } = req.body;

    const validReasons = ['unauthorized', 'not_received', 'duplicate', 'wrong_amount', 'other'];
    if (!paymentId || !reason || !validReasons.includes(reason)) {
      return res.status(400).json({ message: 'paymentId and a valid reason are required' });
    }

    // Verify the payment belongs to this user
    const payment = await Payment.findOne({
      _id: paymentId,
      $or: [{ senderId: req.user.userId }, { recipientId: req.user.userId }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found or not accessible' });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Can only dispute succeeded payments' });
    }

    if (payment.refunded) {
      return res.status(400).json({ message: 'This payment has already been refunded' });
    }

    // Check no existing dispute for this payment
    const existing = await Dispute.findOne({ paymentId });
    if (existing) {
      return res.status(409).json({
        message: 'A dispute already exists for this payment',
        disputeId: existing._id,
        status: existing.status
      });
    }

    // Disputes must be filed within 60 days
    const ageMs = Date.now() - new Date(payment.createdAt).getTime();
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    if (ageMs > sixtyDaysMs) {
      return res.status(400).json({ message: 'Disputes must be filed within 60 days of the payment' });
    }

    const dispute = new Dispute({
      paymentId,
      userId: req.user.userId,
      reason,
      description: (description || '').slice(0, 1000),
      status: 'open'
    });

    await dispute.save();

    // Notify admins via socket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('admin:new_dispute', {
        disputeId: dispute._id,
        paymentId,
        reason,
        userId: req.user.userId,
        amount: payment.amount
      });
    }

    res.status(201).json({
      success: true,
      message: 'Dispute filed successfully. We will review within 3–5 business days.',
      dispute: {
        _id: dispute._id,
        status: dispute.status,
        reason: dispute.reason,
        createdAt: dispute.createdAt
      }
    });
  } catch (error) {
    console.error('Error filing dispute:', error);
    res.status(500).json({ message: 'Failed to file dispute', error: undefined });
  }
});

// ─── User: Get own disputes ────────────────────────────────────────────────────
// GET /api/disputes
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const disputes = await Dispute.find({ userId: req.user.userId })
      .populate('paymentId', 'amount type status createdAt stripePaymentIntentId')
      .sort({ createdAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();

    const total = await Dispute.countDocuments({ userId: req.user.userId });

    res.json({ success: true, disputes, total });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ message: 'Failed to fetch disputes', error: undefined });
  }
});

// ─── User: Get single dispute ─────────────────────────────────────────────────
// GET /api/disputes/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const dispute = await Dispute.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('paymentId', 'amount type status createdAt stripePaymentIntentId stripeChargeId');

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    res.json({ success: true, dispute });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({ message: 'Failed to fetch dispute', error: undefined });
  }
});

// ─── Admin: List all disputes ─────────────────────────────────────────────────
// GET /api/disputes/admin/list
router.get('/admin/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, limit = 50, offset = 0 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const filter = {};
    if (status && ['open', 'under_review', 'resolved_refund', 'resolved_no_action', 'closed'].includes(status)) {
      filter.status = status;
    } else {
      // Default: show actionable disputes
      filter.status = { $in: ['open', 'under_review'] };
    }

    const disputes = await Dispute.find(filter)
      .populate('userId', 'name email')
      .populate('paymentId', 'amount type status createdAt stripePaymentIntentId stripeChargeId')
      .sort({ createdAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();

    const total = await Dispute.countDocuments(filter);

    res.json({ success: true, disputes, total });
  } catch (error) {
    console.error('Error fetching admin disputes:', error);
    res.status(500).json({ message: 'Failed to fetch disputes', error: undefined });
  }
});

// ─── Admin: Update status (mark under_review, etc.) ──────────────────────────
// PUT /api/disputes/:id/status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status } = req.body;
    const validTransitions = ['open', 'under_review', 'closed'];
    if (!status || !validTransitions.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use open, under_review, or closed' });
    }

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status, adminId: req.user.userId },
      { new: true }
    );

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    res.json({ success: true, dispute });
  } catch (error) {
    console.error('Error updating dispute status:', error);
    res.status(500).json({ message: 'Failed to update dispute', error: undefined });
  }
});

// ─── Admin: Resolve with refund ───────────────────────────────────────────────
// POST /api/disputes/:id/resolve
router.post('/:id/resolve', auth, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.userId).select('role');
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { action, resolution, refundAmount } = req.body;

    if (!action || !['refund', 'no_action'].includes(action)) {
      return res.status(400).json({ message: 'action must be "refund" or "no_action"' });
    }

    const dispute = await Dispute.findById(req.params.id)
      .populate('paymentId');

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (['resolved_refund', 'resolved_no_action', 'closed'].includes(dispute.status)) {
      return res.status(400).json({ message: 'Dispute already resolved' });
    }

    const payment = dispute.paymentId;

    if (action === 'refund') {
      if (!stripe) {
        return res.status(503).json({ message: 'Stripe not configured — cannot process refund' });
      }

      if (payment.refunded) {
        return res.status(400).json({ message: 'Payment already refunded' });
      }

      // Determine refund amount (partial or full)
      const paymentAmountCents = Math.round(payment.amount * 100);
      const refundAmountCents = refundAmount
        ? Math.min(Math.round(parseFloat(refundAmount) * 100), paymentAmountCents)
        : paymentAmountCents;

      if (refundAmountCents <= 0) {
        return res.status(400).json({ message: 'Invalid refund amount' });
      }

      // Issue Stripe refund via payment intent
      let stripeRefund;
      const stripeRefundParams = { amount: refundAmountCents };

      if (payment.stripePaymentIntentId) {
        stripeRefundParams.payment_intent = payment.stripePaymentIntentId;
      } else if (payment.stripeChargeId) {
        stripeRefundParams.charge = payment.stripeChargeId;
      } else {
        // No stripe reference — issue internal wallet credit instead
        const disputeUser = await User.findById(dispute.userId);
        if (disputeUser) {
          disputeUser.wallet.balance = (disputeUser.wallet.balance || 0) + (refundAmountCents / 100);
          await disputeUser.save();
        }

        dispute.status = 'resolved_refund';
        dispute.resolution = resolution || 'Refunded to wallet (internal)';
        dispute.refundAmount = refundAmountCents / 100;
        dispute.resolvedAt = new Date();
        dispute.adminId = req.user.userId;
        await dispute.save();

        // Mark payment refunded
        await Payment.findByIdAndUpdate(payment._id, { refunded: true, refundedAt: new Date() });

        // Notify user
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${dispute.userId}`).emit('dispute:resolved', {
            disputeId: dispute._id,
            action: 'refund',
            refundAmount: refundAmountCents / 100
          });
        }

        return res.json({
          success: true,
          message: 'Dispute resolved with internal wallet credit',
          dispute: { _id: dispute._id, status: dispute.status, refundAmount: dispute.refundAmount }
        });
      }

      stripeRefund = await stripe.refunds.create(stripeRefundParams);

      // Update payment record
      await Payment.findByIdAndUpdate(payment._id, {
        refunded: true,
        refundedAt: new Date()
      });

      dispute.stripeRefundId = stripeRefund.id;
      dispute.refundAmount = refundAmountCents / 100;
      dispute.status = 'resolved_refund';
      dispute.resolution = resolution || `Refunded $${(refundAmountCents / 100).toFixed(2)} via Stripe`;
      dispute.resolvedAt = new Date();
      dispute.adminId = req.user.userId;
      await dispute.save();

      // Notify user via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${dispute.userId}`).emit('dispute:resolved', {
          disputeId: dispute._id,
          action: 'refund',
          refundAmount: refundAmountCents / 100,
          stripeRefundId: stripeRefund.id
        });
      }

      return res.json({
        success: true,
        message: `Refund of $${(refundAmountCents / 100).toFixed(2)} issued successfully`,
        stripeRefundId: stripeRefund.id,
        dispute: { _id: dispute._id, status: dispute.status, refundAmount: dispute.refundAmount }
      });
    }

    // action === 'no_action'
    dispute.status = 'resolved_no_action';
    dispute.resolution = resolution || 'Reviewed and no refund warranted';
    dispute.resolvedAt = new Date();
    dispute.adminId = req.user.userId;
    await dispute.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${dispute.userId}`).emit('dispute:resolved', {
        disputeId: dispute._id,
        action: 'no_action',
        resolution: dispute.resolution
      });
    }

    res.json({
      success: true,
      message: 'Dispute resolved with no refund',
      dispute: { _id: dispute._id, status: dispute.status, resolution: dispute.resolution }
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ message: 'Failed to resolve dispute', error: undefined });
  }
});

module.exports = router;
