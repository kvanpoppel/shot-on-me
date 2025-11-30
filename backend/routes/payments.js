const express = require('express');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');

const router = express.Router();

// Get Stripe publishable key (for frontend)
router.get('/stripe-key', (req, res) => {
  try {
    const publishableKey = stripeUtils.getPublishableKey();
    if (!publishableKey) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }
    res.json({ publishableKey });
  } catch (error) {
    console.error('Error getting Stripe key:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send payment
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientPhone, recipientId, amount, message } = req.body;
    
    // Basic validation
    if ((!recipientPhone && !recipientId) || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Recipient and amount are required' });
    }

    const sender = await User.findById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check sender balance
    const balance = sender.wallet?.balance || 0;
    if (balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Find recipient by phone or ID
    let recipient;
    if (recipientId) {
      recipient = await User.findById(recipientId);
    } else if (recipientPhone) {
      recipient = await User.findOne({ phoneNumber: recipientPhone });
    }

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Update balances
    sender.wallet = sender.wallet || { balance: 0, pendingBalance: 0 };
    recipient.wallet = recipient.wallet || { balance: 0, pendingBalance: 0 };
    
    sender.wallet.balance -= amount;
    recipient.wallet.pendingBalance = (recipient.wallet.pendingBalance || 0) + amount;

    await sender.save();
    await recipient.save();

    // Generate redemption code
    const redemptionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log payment to database
    const payment = new Payment({
      senderId: req.user.userId,
      recipientId: recipient._id,
      amount: amount,
      type: 'shot_sent',
      redemptionCode: redemptionCode,
      status: 'succeeded'
    });
    await payment.save();

    res.json({ 
      message: 'Payment sent successfully',
      payment: {
        transactionId,
        redemptionCode,
        amount,
        paymentId: payment._id,
        recipient: {
          id: recipient._id,
          name: recipient.name,
          phoneNumber: recipient.phoneNumber
        }
      },
      newBalance: sender.wallet.balance
    });
  } catch (error) {
    console.error('Error sending payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    
    const query = {
      $or: [
        { senderId: req.user.userId },
        { recipientId: req.user.userId }
      ]
    };

    if (type) {
      query.type = type;
    }

    const payments = await Payment.find(query)
      .populate('senderId', 'firstName lastName profilePicture')
      .populate('recipientId', 'firstName lastName profilePicture')
      .populate('venueId', 'name address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ 
      payments: payments,
      count: payments.length
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Redeem payment code
router.post('/redeem', auth, async (req, res) => {
  try {
    const { code, venueId } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Redemption code is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find payment by redemption code
    const payment = await Payment.findOne({ 
      redemptionCode: code.toUpperCase(),
      status: 'succeeded',
      type: 'shot_sent'
    }).populate('senderId', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({ message: 'Invalid or already redeemed redemption code' });
    }

    // Check if already redeemed (recipientId should be null for unredeemed)
    if (payment.recipientId && payment.recipientId.toString() !== req.user.userId.toString()) {
      return res.status(400).json({ message: 'This code has already been redeemed by another user' });
    }

    // If venueId is provided, transfer funds to venue
    if (venueId) {
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ message: 'Venue not found' });
      }

      if (!venue.stripeAccountId) {
        return res.status(400).json({ 
          message: 'Venue not connected to Stripe',
          error: 'This venue cannot accept payments yet'
        });
      }

      // Create transfer to venue
      const stripe = stripeUtils.stripe;
      const transfer = await stripe.transfers.create({
        amount: Math.round(payment.amount * 100),
        currency: 'usd',
        destination: venue.stripeAccountId,
        metadata: {
          venueId: venueId,
          venueName: venue.name,
          senderId: payment.senderId.toString(),
          paymentId: payment._id.toString(),
          type: 'shot_redemption'
        }
      });

      // Update payment record
      payment.venueId = venueId;
      payment.stripeTransferId = transfer.id;
      payment.type = 'shot_redeemed';
      payment.status = transfer.status === 'paid' ? 'succeeded' : 'processing';
      await payment.save();

      // Create transfer payment record
      const transferPayment = new Payment({
        senderId: payment.senderId,
        recipientId: req.user.userId,
        venueId: venueId,
        amount: payment.amount,
        type: 'transfer',
        stripeTransferId: transfer.id,
        status: transfer.status === 'paid' ? 'succeeded' : 'processing',
        metadata: {
          originalPaymentId: payment._id.toString(),
          redemptionCode: code
        }
      });
      await transferPayment.save();

      res.json({ 
        message: 'Payment redeemed and transferred to venue successfully',
        amount: payment.amount,
        venue: {
          id: venue._id,
          name: venue.name
        },
        transferId: transfer.id
      });
    } else {
      // Simple redemption - add to wallet
      user.wallet = user.wallet || { balance: 0, pendingBalance: 0 };
      user.wallet.balance = (user.wallet.balance || 0) + payment.amount;
      user.wallet.pendingBalance = Math.max(0, (user.wallet.pendingBalance || 0) - payment.amount);
      await user.save();

      // Update payment record
      payment.recipientId = req.user.userId;
      payment.type = 'shot_redeemed';
      await payment.save();

      res.json({ 
        message: 'Payment redeemed successfully',
        amount: payment.amount,
        newBalance: user.wallet.balance
      });
    }
  } catch (error) {
    console.error('Error redeeming payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Stripe Payment Intent for adding funds to wallet
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Create payment intent
    const paymentIntent = await stripeUtils.createPaymentIntent(
      amount,
      req.user.userId.toString(),
      'usd'
    );

    // Log payment to database
    const payment = new Payment({
      senderId: req.user.userId,
      amount: amount,
      type: 'wallet_topup',
      stripePaymentIntentId: paymentIntent.paymentIntentId,
      status: 'pending'
    });
    await payment.save();

    res.json({ 
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: paymentIntent.amount,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      message: 'Failed to create payment intent',
      error: error.message 
    });
  }
});

// Transfer funds to venue when shot is redeemed
router.post('/transfer', auth, async (req, res) => {
  try {
    const { venueId, amount } = req.body;

    if (!venueId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Venue ID and valid amount are required' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Get venue and check Stripe connection
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (!venue.stripeAccountId) {
      return res.status(400).json({ 
        error: 'Venue not connected',
        message: 'This venue has not connected their Stripe account yet'
      });
    }

    // Get sender (user redeeming the shot)
    const sender = await User.findById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check sender has sufficient balance
    const senderBalance = sender.wallet?.balance || 0;
    if (senderBalance < amount) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        balance: senderBalance,
        required: amount
      });
    }

    // Create transfer to venue's Stripe account
    const stripe = stripeUtils.stripe;
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: venue.stripeAccountId,
      metadata: {
        venueId: venueId,
        venueName: venue.name,
        senderId: req.user.userId.toString(),
        senderName: sender.name || `${sender.firstName} ${sender.lastName}`,
        type: 'shot_redemption'
      }
    });

    // Log transfer to database
    const payment = new Payment({
      senderId: req.user.userId,
      venueId: venueId,
      amount: amount,
      type: 'transfer',
      stripeTransferId: transfer.id,
      status: transfer.status === 'paid' ? 'succeeded' : 'processing'
    });
    await payment.save();

    // Deduct from sender's wallet
    sender.wallet = sender.wallet || { balance: 0, pendingBalance: 0 };
    sender.wallet.balance = sender.wallet.balance - amount;
    await sender.save();

    // Emit Socket.io event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.userId.toString()}`).emit('wallet-updated', {
        userId: req.user.userId.toString(),
        balance: sender.wallet.balance
      });
    }

    res.json({ 
      success: true, 
      transfer: {
        id: transfer.id,
        amount: transfer.amount / 100, // Convert back to dollars
        currency: transfer.currency,
        destination: transfer.destination,
        status: transfer.status
      },
      paymentId: payment._id,
      newBalance: sender.wallet.balance
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ 
      message: 'Failed to create transfer',
      error: error.message 
    });
  }
});

// Stripe Webhook handler function (exported separately for server.js)
// This endpoint does NOT use auth middleware - Stripe verifies via signature
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripeUtils.verifyWebhookSignature(req.body, sig);
    
    if (!event) {
      console.error('⚠️ Webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Handle the event
    const result = await stripeUtils.handleWebhookEvent(event);
    
    // Process payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Find payment record
      const payment = await Payment.findOne({ 
        stripePaymentIntentId: paymentIntent.id 
      });

      if (payment && payment.status === 'pending') {
        // Update payment status
        payment.status = 'succeeded';
        payment.stripeChargeId = paymentIntent.latest_charge;
        await payment.save();

        // Update user wallet balance
        const user = await User.findById(payment.senderId);
        if (user) {
          user.wallet = user.wallet || { balance: 0, pendingBalance: 0 };
          user.wallet.balance = (user.wallet.balance || 0) + payment.amount;
          await user.save();

          // Emit Socket.io event for real-time update
          const io = req.app.get('io');
          if (io) {
            io.to(`user-${user._id.toString()}`).emit('wallet-updated', {
              userId: user._id.toString(),
              balance: user.wallet.balance
            });
          }

          console.log(`✅ Payment succeeded: ${paymentIntent.id}, Wallet updated for user ${user._id}`);
        }
      }
    }

    // Process payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      
      const payment = await Payment.findOne({ 
        stripePaymentIntentId: paymentIntent.id 
      });

      if (payment) {
        payment.status = 'failed';
        await payment.save();
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
      }
    }

    // Process transfer.paid (when transfer to venue succeeds)
    if (event.type === 'transfer.paid') {
      const transfer = event.data.object;
      
      const payment = await Payment.findOne({ 
        stripeTransferId: transfer.id 
      });

      if (payment && payment.status === 'processing') {
        payment.status = 'succeeded';
        await payment.save();
        console.log(`✅ Transfer succeeded: ${transfer.id}`);
      }
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true, handled: result.handled });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = router;
module.exports.webhook = webhookHandler;
