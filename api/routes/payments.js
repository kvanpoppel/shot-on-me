import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import twilio from 'twilio';
import {
  isStripeConfigured,
  createPaymentMethod,
  createCustomer,
  chargeCustomer,
  getPaymentMethod,
  listPaymentMethods,
  deletePaymentMethod
} from '../utils/stripe.js';

const router = express.Router();

// Initialize Twilio client only if credentials are available
const getTwilioClient = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return null;
};

// Send payment to friend
router.post('/send', authenticate, [
  body('recipientPhone').optional().isMobilePhone(),
  body('recipientEmail').optional().isEmail(),
  body('amount').isFloat({ min: 0.01 }),
  body('venueId').optional().isMongoId(),
  body('message').optional().trim(),
  body('recipientName').optional().trim(),
  body('venueName').optional().trim(),
  body('venueAddress').optional().trim(),
  body('venuePlaceId').optional().trim(),
  body('anonymous').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      recipientPhone, 
      recipientEmail, 
      amount, 
      venueId, 
      message, 
      recipientName,
      venueName,
      venueAddress,
      venuePlaceId,
      anonymous 
    } = req.body;
    const sender = req.user;

    // Validate that at least one recipient method is provided
    if (!recipientPhone && !recipientEmail) {
      return res.status(400).json({ error: 'Either recipientPhone or recipientEmail is required' });
    }

    // Check sender balance
    if (sender.wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Find or create recipient by phone or email
    let recipient = null;
    if (recipientPhone) {
      recipient = await User.findOne({ phoneNumber: recipientPhone });
    }
    if (!recipient && recipientEmail) {
      recipient = await User.findOne({ email: recipientEmail });
    }
    
    if (!recipient) {
      // Create a placeholder user for SMS/email-only redemption
      const tempEmail = recipientEmail || `temp_${Date.now()}@shotonme.com`;
      const displayName = recipientName || 'Guest';
      const nameParts = displayName.split(' ');
      
      recipient = new User({
        email: tempEmail,
        password: Math.random().toString(36),
        phoneNumber: recipientPhone || undefined,
        firstName: nameParts[0] || 'Guest',
        lastName: nameParts.slice(1).join(' ') || 'User',
        userType: 'user'
      });
      await recipient.save();
    }

    // Create payment
    const payment = new Payment({
      sender: sender._id,
      recipient: recipient._id,
      amount,
      venue: venueId || null,
      message: message || '',
      status: 'active',
      anonymous: anonymous || false,
      recipientName: recipientName || undefined,
      venueName: venueName || undefined,
      venueAddress: venueAddress || undefined,
      venuePlaceId: venuePlaceId || undefined
    });

    await payment.save();

    // Deduct from sender's balance (money stays in escrow)
    sender.wallet.balance -= amount;
    sender.wallet.pendingBalance += amount;
    await sender.save();

    // Send SMS or Email notification
    const twilioClient = getTwilioClient();
    const senderName = anonymous ? 'Someone' : `${sender.firstName} ${sender.lastName}`;
    
    if (recipientPhone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const smsMessage = `You received $${amount.toFixed(2)} from ${senderName}!${venueName ? ` Redeem at ${venueName}.` : ''} Redeem code: ${payment.redemptionCode}. Use at any participating venue or visit shotonme.com/redeem`;
        
        await twilioClient.messages.create({
          body: smsMessage,
          to: recipientPhone,
          from: process.env.TWILIO_PHONE_NUMBER
        });

        payment.smsSent = true;
        await payment.save();
      } catch (smsError) {
        console.error('SMS error:', smsError);
        // Don't fail the payment if SMS fails
      }
    } else if (recipientEmail) {
      // TODO: Send email notification
      // For now, we'll just log it. In production, use SendGrid, AWS SES, or similar
      console.log(`Email notification would be sent to ${recipientEmail} for payment ${payment._id}`);
    } else {
      console.warn('Twilio not configured and no email provided. Notification skipped.');
    }

    res.status(201).json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        redemptionCode: payment.redemptionCode,
        recipient: recipientPhone || recipientEmail,
        message: payment.message,
        expiresAt: payment.expiresAt
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Server error processing payment' });
  }
});

// Redeem payment code
router.post('/redeem', authenticate, [
  body('code').trim().notEmpty(),
  body('venueId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, venueId } = req.body;
    const redeemer = req.user;

    // Find payment
    const payment = await Payment.findOne({ 
      redemptionCode: code.toUpperCase(),
      status: 'active'
    }).populate('sender recipient venue');

    if (!payment) {
      return res.status(404).json({ error: 'Invalid redemption code' });
    }

    // Check expiration
    if (payment.expiresAt && payment.expiresAt < new Date()) {
      payment.status = 'expired';
      await payment.save();
      return res.status(400).json({ error: 'Redemption code has expired' });
    }

    // Verify venue if provided
    let venue = null;
    if (venueId) {
      venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ error: 'Venue not found' });
      }
    }

    // Update payment status
    payment.status = 'redeemed';
    payment.redeemedAt = new Date();
    payment.redeemedBy = redeemer._id;
    if (venueId) {
      payment.venue = venueId;
    }
    await payment.save();

    // Transfer money from escrow
    const sender = await User.findById(payment.sender);
    if (sender) {
      sender.wallet.pendingBalance -= payment.amount;
      await sender.save();
    }

    // Add to recipient's wallet (money stays in user's account until used at venue)
    const recipient = await User.findById(payment.recipient);
    if (recipient && recipient._id.toString() === redeemer._id.toString()) {
      recipient.wallet.balance += payment.amount;
      await recipient.save();
    }

    // Emit real-time update
    const io = req.io;
    if (io) {
      io.to(`user_${redeemer._id}`).emit('payment-redeemed', {
        paymentId: payment._id,
        amount: payment.amount,
        venue: venue?.name || 'Any Venue'
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        venue: venue?.name || 'Any Venue',
        redeemedAt: payment.redeemedAt
      }
    });
  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({ error: 'Server error processing redemption' });
  }
});

// Get user's payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    })
    .populate('sender', 'firstName lastName profilePicture')
    .populate('recipient', 'firstName lastName profilePicture')
    .populate('venue', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ payments });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// Add credit card with Stripe
router.post('/cards', authenticate, [
  body('paymentMethodId').optional().trim(),
  body('cardNumber').optional().trim().isLength({ min: 13, max: 19 }),
  body('expiry').optional().matches(/^\d{2}\/\d{2}$/),
  body('cvc').optional().isLength({ min: 3, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentMethodId, cardNumber, expiry, cvc } = req.body;
    const user = req.user;

    // If payment method ID is provided (from Stripe Elements), use it directly
    if (paymentMethodId && isStripeConfigured()) {
      try {
        // Create or get Stripe customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
          const stripeCustomer = await createCustomer(
            user.email,
            `${user.firstName} ${user.lastName}`,
            { userId: user._id.toString() }
          );
          stripeCustomerId = stripeCustomer.id;
          user.stripeCustomerId = stripeCustomerId;
          await user.save();
        }

        // Attach payment method to customer
        const getStripeClient = (await import('../utils/stripe.js')).default;
        const stripe = getStripeClient();
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });

        // Get payment method details
        const paymentMethod = await getPaymentMethod(paymentMethodId);
        const card = paymentMethod.card;
        const maskedCard = `**** **** **** ${card.last4}`;
        
        if (!user.paymentMethods) {
          user.paymentMethods = [];
        }
        
        user.paymentMethods.push({
          type: 'card',
          stripePaymentMethodId: paymentMethodId,
          last4: card.last4,
          expiry: `${card.exp_month.toString().padStart(2, '0')}/${card.exp_year.toString().slice(-2)}`,
          masked: maskedCard,
          brand: card.brand || 'unknown',
          addedAt: new Date()
        });

        await user.save();

        return res.json({
          success: true,
          message: 'Credit card added successfully',
          card: {
            id: paymentMethodId,
            last4: card.last4,
            expiry: `${card.exp_month.toString().padStart(2, '0')}/${card.exp_year.toString().slice(-2)}`,
            brand: card.brand
          }
        });
      } catch (error) {
        console.error('Add card with payment method ID error:', error);
        return res.status(500).json({ 
          error: error.message || 'Server error adding credit card',
          details: error.type || undefined
        });
      }
    }

    // Fallback to raw card details (for backwards compatibility or when Stripe Elements not available)
    if (!cardNumber || !expiry || !cvc) {
      return res.status(400).json({ 
        error: 'Either paymentMethodId or card details (cardNumber, expiry, cvc) are required' 
      });
    }

    // If Stripe is not configured, fall back to basic storage (no actual tokenization)
    if (!isStripeConfigured()) {
      const maskedCard = `**** **** **** ${cardNumber.slice(-4)}`;
      
      if (!user.paymentMethods) {
        user.paymentMethods = [];
      }
      
      user.paymentMethods.push({
        type: 'card',
        last4: cardNumber.replace(/\s/g, '').slice(-4),
        expiry,
        masked: maskedCard,
        addedAt: new Date()
      });

      await user.save();

      return res.json({
        success: true,
        message: 'Credit card added (Stripe not configured - using basic storage)',
        card: {
          last4: cardNumber.slice(-4),
          expiry
        }
      });
    }

    // Parse expiry (MM/YY format)
    const [expMonth, expYear] = expiry.split('/').map(s => s.trim());

    // Create Stripe payment method
    const stripePaymentMethod = await createPaymentMethod(
      cardNumber,
      expMonth,
      expYear,
      cvc
    );

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
        { userId: user._id.toString() }
      );
      stripeCustomerId = stripeCustomer.id;
      user.stripeCustomerId = stripeCustomerId;
    }

    // Attach payment method to customer
    const getStripeClient = (await import('../utils/stripe.js')).default;
    const stripe = getStripeClient();
    await stripe.paymentMethods.attach(stripePaymentMethod.id, {
      customer: stripeCustomerId,
    });

    // Get card details from Stripe
    const card = stripePaymentMethod.card;
    const maskedCard = `**** **** **** ${card.last4}`;
    
    if (!user.paymentMethods) {
      user.paymentMethods = [];
    }
    
    user.paymentMethods.push({
      type: 'card',
      stripePaymentMethodId: stripePaymentMethod.id,
      last4: card.last4,
      expiry: `${card.exp_month.toString().padStart(2, '0')}/${card.exp_year.toString().slice(-2)}`,
      masked: maskedCard,
      brand: card.brand || 'unknown',
      addedAt: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Credit card added successfully',
      card: {
        id: stripePaymentMethod.id,
        last4: card.last4,
        expiry: `${card.exp_month.toString().padStart(2, '0')}/${card.exp_year.toString().slice(-2)}`,
        brand: card.brand
      }
    });
  } catch (error) {
    console.error('Add card error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error adding credit card',
      details: error.type || undefined
    });
  }
});

// Add funds to wallet via Stripe
router.post('/add-funds', authenticate, [
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethodId').optional().trim(),
  body('cardNumber').optional().trim(),
  body('expiry').optional().matches(/^\d{2}\/\d{2}$/),
  body('cvc').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, paymentMethodId, cardNumber, expiry, cvc } = req.body;
    const user = req.user;

    if (!isStripeConfigured()) {
      return res.status(400).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in backend/.env' 
      });
    }

    let stripePaymentMethodId = paymentMethodId;

    // If no payment method ID provided, create one from card details
    if (!stripePaymentMethodId && cardNumber && expiry && cvc) {
      const [expMonth, expYear] = expiry.split('/').map(s => s.trim());
      const stripePaymentMethod = await createPaymentMethod(
        cardNumber,
        expMonth,
        expYear,
        cvc
      );
      stripePaymentMethodId = stripePaymentMethod.id;
    }

    if (!stripePaymentMethodId) {
      return res.status(400).json({ 
        error: 'Either paymentMethodId or card details (cardNumber, expiry, cvc) are required' 
      });
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
        { userId: user._id.toString() }
      );
      stripeCustomerId = stripeCustomer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Charge the customer
    const paymentIntent = await chargeCustomer(
      stripeCustomerId,
      stripePaymentMethodId,
      amount,
      `Add funds to wallet - ${user.email}`,
      {
        userId: user._id.toString(),
        type: 'wallet_topup'
      }
    );

    // Check if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      // Add funds to user's wallet
      user.wallet.balance += amount;
      await user.save();

      res.json({
        success: true,
        message: `Successfully added $${amount.toFixed(2)} to wallet`,
        wallet: {
          balance: user.wallet.balance,
          pendingBalance: user.wallet.pendingBalance
        },
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status
        }
      });
    } else {
      res.status(400).json({
        error: 'Payment failed',
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id
      });
    }
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error adding funds',
      details: error.type || undefined
    });
  }
});

// Get saved payment methods
router.get('/cards', authenticate, async (req, res) => {
  try {
    const user = req.user;

    if (isStripeConfigured() && user.stripeCustomerId) {
      try {
        const stripePaymentMethods = await listPaymentMethods(user.stripeCustomerId);
        
        // Merge with local payment methods
        const localMethods = user.paymentMethods || [];
        const methods = localMethods.map(localMethod => {
          const stripeMethod = stripePaymentMethods.find(
            pm => pm.id === localMethod.stripePaymentMethodId
          );
          
          return {
            id: localMethod.stripePaymentMethodId || 'local',
            type: localMethod.type,
            last4: localMethod.last4,
            expiry: localMethod.expiry,
            masked: localMethod.masked,
            brand: localMethod.brand || stripeMethod?.card?.brand,
            addedAt: localMethod.addedAt
          };
        });

        return res.json({ paymentMethods: methods });
      } catch (stripeError) {
        console.error('Error fetching Stripe payment methods:', stripeError);
      }
    }

    // Fallback to local payment methods
    const methods = (user.paymentMethods || []).map(method => ({
      id: method.stripePaymentMethodId || 'local',
      type: method.type,
      last4: method.last4,
      expiry: method.expiry,
      masked: method.masked,
      brand: method.brand,
      addedAt: method.addedAt
    }));

    res.json({ paymentMethods: methods });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Server error fetching payment methods' });
  }
});

// Delete a payment method
router.delete('/cards/:paymentMethodId', authenticate, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = req.user;

    if (!isStripeConfigured()) {
      // Remove from local storage only
      user.paymentMethods = (user.paymentMethods || []).filter(
        pm => pm.stripePaymentMethodId !== paymentMethodId && pm.id !== paymentMethodId
      );
      await user.save();
      
      return res.json({ success: true, message: 'Payment method removed' });
    }

    // Remove from Stripe if it's a Stripe payment method
    try {
      await deletePaymentMethod(paymentMethodId);
    } catch (stripeError) {
      // Payment method might not exist in Stripe, continue to remove from local
      console.warn('Stripe delete warning:', stripeError.message);
    }

    // Remove from local storage
    user.paymentMethods = (user.paymentMethods || []).filter(
      pm => pm.stripePaymentMethodId !== paymentMethodId
    );
    await user.save();

    res.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Server error deleting payment method' });
  }
});

export default router;

