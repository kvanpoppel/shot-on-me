const express = require('express');
const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');
const { paymentLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get Socket.io instance (will be set by server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// Process tap-and-pay transaction
// Money flows from the platform's Stripe account → venue via Transfer.
// No card charge is created here — the user's wallet was already funded on top-up.
router.post('/process', auth, paymentLimiter, async (req, res) => {
  try {
    const { venueId, amount } = req.body;
    const userId = req.user.userId;

    if (!venueId || !amount) {
      return res.status(400).json({ message: 'Venue ID and amount are required' });
    }

    // Convert to integer cents to avoid floating-point precision issues
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents < 500) {
      return res.status(400).json({ message: 'Minimum transaction amount is $5.00' });
    }
    if (cents > 50000) {
      return res.status(400).json({ message: 'Maximum transaction amount is $500.00' });
    }
    const normalizedAmount = cents / 100;

    // Fetch card (for spend-limit checks) and venue in parallel
    const [card, venue] = await Promise.all([
      VirtualCard.findOne({ user: userId, status: 'active' }),
      Venue.findById(venueId)
    ]);

    if (!card) {
      return res.status(404).json({ message: 'No active virtual card found. Please create a card first.' });
    }

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.stripeAccountId) {
      return res.status(400).json({ message: 'Venue has not connected their Stripe account' });
    }

    // Pre-flight balance snapshot (informational only — atomic check is below)
    const userSnap = await User.findById(userId, 'wallet');
    if (!userSnap) return res.status(404).json({ message: 'User not found' });

    const balance = userSnap.wallet?.balance || 0;
    const canUse = card.canUse(balance);
    if (!canUse.canUse) {
      return res.status(400).json({ message: canUse.reason });
    }

    const limitCheck = card.checkSpendingLimit(normalizedAmount, 'daily');
    if (!limitCheck.allowed) {
      return res.status(400).json({ message: limitCheck.reason, remaining: limitCheck.remaining });
    }

    // Atomically deduct wallet BEFORE touching Stripe — prevents double-spend
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'wallet.balance': { $gte: normalizedAmount } },
      { $inc: { 'wallet.balance': -normalizedAmount } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ message: 'Insufficient balance', insufficientBalance: true });
    }

    // Calculate commission (platform keeps a small fee)
    const commission = stripeUtils.calculateCommission(normalizedAmount);
    const venueAmountCents = Math.round(commission.venueReceives * 100);

    // Transfer from platform account → venue's connected account
    // This is the correct "one business account" model: money was loaded into
    // the platform account on wallet top-up, now we distribute it to the venue.
    let transfer;
    try {
      transfer = await stripeUtils.stripe.transfers.create({
        amount: venueAmountCents,
        currency: 'usd',
        destination: venue.stripeAccountId,
        metadata: {
          userId: userId.toString(),
          venueId: venueId.toString(),
          transactionType: 'tap-and-pay'
        },
        description: `Payment at ${venue.name}`
      });
    } catch (stripeError) {
      // Stripe failed — reverse the wallet deduction so the user isn't shorted
      await User.findByIdAndUpdate(userId, { $inc: { 'wallet.balance': normalizedAmount } });
      console.error('Stripe transfer error:', stripeError);
      return res.status(400).json({
        message: 'Payment processing failed',
        error: stripeError.message
      });
    }

    // Update card metadata
    card.metadata.totalTransactions = (card.metadata.totalTransactions || 0) + 1;
    card.metadata.totalSpent = (card.metadata.totalSpent || 0) + normalizedAmount;
    card.metadata.lastUsedAt = new Date();
    await card.save();

    // Record payment
    const payment = new Payment({
      senderId: userId,
      venueId: venueId,
      amount: normalizedAmount,
      type: 'tap_and_pay',
      status: 'succeeded',
      stripeTransferId: transfer.id,
      metadata: {
        commission: commission.amount,
        commissionType: commission.type,
        venueReceives: commission.venueReceives,
        cardId: card.stripeCardId
      }
    });
    await payment.save();

    // Audit log — fire and forget
    AuditLog.create({
      action: 'tap_and_pay',
      actorId: userId,
      venueId: venueId,
      amount: normalizedAmount,
      paymentId: payment._id,
      ip: req.ip
    }).catch(() => {});

    // Real-time balance update
    if (io) {
      io.to(`user-${userId}`).emit('wallet-updated', {
        userId: userId.toString(),
        balance: updatedUser.wallet.balance
      });
      io.to(`user-${userId}`).emit('payment-processed', {
        amount: normalizedAmount,
        venue: venue.name,
        newBalance: updatedUser.wallet.balance,
        transactionId: payment._id
      });
    }

    res.json({
      message: 'Payment processed successfully',
      transaction: {
        id: payment._id,
        amount: normalizedAmount,
        commission: commission.amount,
        venueReceives: commission.venueReceives,
        newBalance: updatedUser.wallet.balance,
        status: 'succeeded'
      },
      transfer: { id: transfer.id }
    });
  } catch (error) {
    console.error('Error processing tap-and-pay:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Get transaction history for user
router.get('/transactions', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const transactions = await Payment.find({
      senderId: userId,
      type: 'tap_and_pay'
    })
      .populate('venueId', 'name address')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip(safeOffset);

    res.json({
      transactions: transactions.map(tx => ({
        id: tx._id,
        amount: tx.amount,
        venue: tx.venueId?.name || 'Unknown Venue',
        commission: tx.metadata?.commission || 0,
        status: tx.status,
        createdAt: tx.createdAt
      })),
      total: transactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

module.exports = router;

