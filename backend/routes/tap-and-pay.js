const express = require('express');
const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');

const router = express.Router();

// Get Socket.io instance (will be set by server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// Process tap-and-pay transaction
router.post('/process', auth, async (req, res) => {
  try {
    const { venueId, amount, paymentMethodId } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!venueId || !amount || !paymentMethodId) {
      return res.status(400).json({
        message: 'Venue ID, amount, and payment method are required'
      });
    }

    // Validate amount
    if (amount < 5.00) {
      return res.status(400).json({
        message: 'Minimum transaction amount is $5.00'
      });
    }

    if (amount > 500.00) {
      return res.status(400).json({
        message: 'Maximum transaction amount is $500.00'
      });
    }

    // Get user and card
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const card = await VirtualCard.findOne({ user: userId, status: 'active' });
    if (!card) {
      return res.status(404).json({
        message: 'No active virtual card found. Please create a card first.'
      });
    }

    // Check balance
    const balance = user.wallet?.balance || 0;
    if (balance < amount) {
      return res.status(400).json({
        message: 'Insufficient balance',
        balance: balance,
        required: amount
      });
    }

    // Check minimum balance requirement
    const canUse = card.canUse(balance);
    if (!canUse.canUse) {
      return res.status(400).json({
        message: canUse.reason
      });
    }

    // Check spending limits
    const limitCheck = card.checkSpendingLimit(amount, 'daily');
    if (!limitCheck.allowed) {
      return res.status(400).json({
        message: limitCheck.reason,
        remaining: limitCheck.remaining
      });
    }

    // Get venue
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.stripeAccountId) {
      return res.status(400).json({
        message: 'Venue has not connected their Stripe account'
      });
    }

    // Calculate commission
    const commission = stripeUtils.calculateCommission(amount);
    const venueAmount = commission.venueReceives;

    // Create payment intent on venue's Stripe account
    try {
      const paymentIntent = await stripeUtils.stripe.paymentIntents.create(
        {
          amount: Math.round(venueAmount * 100), // Convert to cents
          currency: 'usd',
          payment_method: paymentMethodId,
          confirmation_method: 'automatic',
          confirm: true,
          application_fee_amount: Math.round(commission.amount * 100),
          metadata: {
            userId: userId.toString(),
            venueId: venueId.toString(),
            cardId: card.stripeCardId,
            transactionType: 'tap-and-pay',
            commissionType: commission.type
          },
          description: `Payment at ${venue.name}`
        },
        {
          stripeAccount: venue.stripeAccountId
        }
      );

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          message: 'Payment failed',
          status: paymentIntent.status,
          error: paymentIntent.last_payment_error?.message
        });
      }

      // Update user balance
      user.wallet.balance = balance - amount;
      await user.save();

      // Update card metadata
      card.metadata.totalTransactions = (card.metadata.totalTransactions || 0) + 1;
      card.metadata.totalSpent = (card.metadata.totalSpent || 0) + amount;
      card.metadata.lastUsedAt = new Date();
      await card.save();

      // Create payment record
      const payment = new Payment({
        senderId: userId,
        venueId: venueId,
        amount: amount,
        type: 'tap_and_pay',
        status: 'succeeded',
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          commission: commission.amount,
          commissionType: commission.type,
          venueReceives: venueAmount,
          cardId: card.stripeCardId
        }
      });
      await payment.save();

      // Emit socket event for real-time updates
      if (io) {
        io.to(userId).emit('payment-processed', {
          amount: amount,
          venue: venue.name,
          newBalance: user.wallet.balance,
          transactionId: payment._id
        });
      }

      res.json({
        message: 'Payment processed successfully',
        transaction: {
          id: payment._id,
          amount: amount,
          commission: commission.amount,
          venueReceives: venueAmount,
          newBalance: user.wallet.balance,
          status: 'succeeded'
        },
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      });
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError);
      return res.status(400).json({
        message: 'Payment processing failed',
        error: stripeError.message,
        type: stripeError.type
      });
    }
  } catch (error) {
    console.error('Error processing tap-and-pay:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get transaction history for user
router.get('/transactions', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await Payment.find({
      senderId: userId,
      type: 'tap_and_pay'
    })
      .populate('venueId', 'name address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

