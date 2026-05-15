const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const VirtualCard = require('../models/VirtualCard');
const AuditLog = require('../models/AuditLog');
const PendingPayment = require('../models/PendingPayment');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');
const { handlePaymentSent, handlePaymentReceived } = require('../utils/gamification');
const { sendPaymentOTP, sendPaymentSMS } = require('../utils/sms');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();
const { paymentLimiter } = require('../middleware/rateLimiter');

// Get Stripe publishable key (for frontend)
router.get('/stripe-key', (req, res) => {
  try {
    const publishableKey = stripeUtils.getPublishableKey();
    // Check if it's a placeholder, empty, or invalid
    if (!publishableKey || 
        publishableKey.includes('your_stripe') || 
        publishableKey.includes('placeholder') ||
        publishableKey.endsWith('0000') ||
        publishableKey.length < 50) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable. Please configure valid Stripe API keys in backend/.env',
        configured: false
      });
    }
    res.json({ publishableKey, configured: true });
  } catch (error) {
    console.error('Error getting Stripe key:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request a payment OTP — sent via SMS to the user's registered phone
router.post('/request-otp', auth, paymentLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('phoneNumber paymentOtp');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.phoneNumber) {
      return res.status(400).json({
        message: 'A verified phone number is required to send payments. Please add one in your profile settings.'
      });
    }

    // Enforce a 60-second cooldown between OTP requests to prevent SMS flooding
    if (user.paymentOtp?.expiresAt) {
      const secondsRemaining = Math.ceil((new Date(user.paymentOtp.expiresAt) - Date.now()) / 1000);
      const otpAgeSeconds = 10 * 60 - secondsRemaining; // How many seconds ago was it issued?
      if (otpAgeSeconds < 60) {
        return res.status(429).json({
          message: 'Please wait before requesting another code.',
          retryAfter: 60 - otpAgeSeconds
        });
      }
    }

    // Generate cryptographically random 6-digit OTP
    const crypto = require('crypto');
    const otp = String(crypto.randomInt(100000, 1000000));
    const hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(req.user.userId, { paymentOtp: { hash, expiresAt } });

    const sent = await sendPaymentOTP(user.phoneNumber, otp);

    if (!sent && process.env.NODE_ENV !== 'production') {
      // Dev fallback — indicate OTP was generated but do NOT log the value
      console.log(`[DEV] Payment OTP generated for user ${req.user.userId} (SMS unavailable)`);
    }

    res.json({
      message: sent
        ? 'Verification code sent to your phone.'
        : 'SMS unavailable — check server logs (dev only).',
      requiresVerification: true
    });
  } catch (error) {
    console.error('Error requesting payment OTP:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Send payment
router.post('/send', auth, paymentLimiter, async (req, res) => {
  try {
    const { recipientPhone, recipientId, amount, message, otp } = req.body;

    // --- 2FA: verify OTP before processing ---
    if (!otp) {
      return res.status(400).json({
        message: 'A verification code is required. Please request one first.',
        requiresVerification: true
      });
    }

    const senderForOtp = await User.findById(req.user.userId).select('paymentOtp');
    if (!senderForOtp?.paymentOtp?.hash || !senderForOtp?.paymentOtp?.expiresAt) {
      return res.status(400).json({
        message: 'No active verification code found. Please request a new one.',
        requiresVerification: true
      });
    }
    if (new Date() > senderForOtp.paymentOtp.expiresAt) {
      return res.status(400).json({
        message: 'Verification code expired. Please request a new one.',
        requiresVerification: true
      });
    }
    const otpValid = await bcrypt.compare(String(otp), senderForOtp.paymentOtp.hash);
    if (!otpValid) {
      return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
    }
    // Clear OTP immediately — single use
    await User.findByIdAndUpdate(req.user.userId, { $unset: { paymentOtp: 1 } });
    // --- end 2FA ---

    // Basic validation
    if (!recipientPhone && !recipientId) {
      return res.status(400).json({ 
        message: 'Recipient is required',
        error: 'Please provide either recipientPhone or recipientId'
      });
    }
    
    if (!amount) {
      return res.status(400).json({ 
        message: 'Amount is required',
        error: 'Please provide a valid amount'
      });
    }
    
    // Convert to integer cents to avoid floating-point precision issues
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({
        message: 'Invalid amount',
        error: `Amount must be a positive number. Received: ${amount}`
      });
    }
    if (cents > 50000) {
      return res.status(400).json({ message: 'Amount exceeds the maximum of $500 per transaction' });
    }
    const amountNum = cents / 100;

    const sender = await User.findById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check sender balance
    const balance = sender.wallet?.balance || 0;
    const insufficientBalance = balance < amountNum;
    
    // If insufficient balance, return special error code to allow card payment
    if (insufficientBalance) {
      return res.status(402).json({ 
        message: 'Insufficient balance',
        error: `Your balance is $${balance.toFixed(2)}, but you're trying to send $${amountNum.toFixed(2)}`,
        insufficientBalance: true,
        currentBalance: balance,
        requiredAmount: amountNum,
        shortfall: amountNum - balance,
        canPayWithCard: true
      });
    }

    // Find recipient by phone or ID
    let recipient;
    if (recipientId) {
      recipient = await User.findById(recipientId);
    } else if (recipientPhone) {
      recipient = await User.findOne({ phoneNumber: recipientPhone });
    }

    // If recipient not found by ID/phone, create a pending payment so they can claim it after sign-up
    if (!recipient) {
      if (!recipientPhone) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      // Cap pending payments per user (max 5 outstanding)
      const pendingCount = await PendingPayment.countDocuments({
        senderId: req.user.userId,
        status: 'pending'
      });
      if (pendingCount >= 5) {
        return res.status(400).json({
          message: 'You have too many outstanding payments waiting to be claimed',
          error: 'You can have at most 5 pending payments at a time. Please wait for some to be claimed before sending more.'
        });
      }

      // Atomically deduct from sender
      const updatedSender = await User.findOneAndUpdate(
        { _id: req.user.userId, 'wallet.balance': { $gte: amountNum } },
        { $inc: { 'wallet.balance': -amountNum } },
        { new: true }
      );
      if (!updatedSender) {
        return res.status(400).json({ message: 'Insufficient balance', insufficientBalance: true });
      }

      const senderName = sender.name || sender.phoneNumber || sender.email || 'Someone';

      // Normalise phone for storage/lookup
      const normalizedPhone = normalizePhone(recipientPhone);

      const pending = new PendingPayment({
        senderId: req.user.userId,
        senderName,
        recipientPhone: normalizedPhone,
        amount: amountNum,
        message: message || ''
      });
      await pending.save();

      // SMS with download link — no redemption code, money will be in wallet after sign-up
      sendPaymentSMS(normalizedPhone, senderName, amountNum, null, message || '').catch(() => {});

      AuditLog.create({
        action: 'payment_sent',
        actorId: req.user.userId,
        amount: amountNum,
        ip: req.ip,
        metadata: { recipientPhone: normalizedPhone, pendingPaymentId: pending._id }
      }).catch(() => {});

      return res.json({
        success: true,
        pendingPayment: true,
        message: `$${amountNum.toFixed(2)} is waiting for ${normalizedPhone} to join Shot On Me. They will receive an SMS with a download link.`
      });
    }

    // Block sending to yourself
    if (recipient._id.toString() === req.user.userId.toString()) {
      return res.status(400).json({
        message: "You can't send a payment to yourself"
      });
    }

    // Block rapid back-and-forth payments (circular payment prevention)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sentToRecipient, receivedFromRecipient] = await Promise.all([
      Payment.findOne({
        senderId: req.user.userId,
        recipientId: recipient._id,
        status: { $in: ['succeeded', 'completed'] },
        createdAt: { $gte: twentyFourHoursAgo }
      }),
      Payment.findOne({
        senderId: recipient._id,
        recipientId: req.user.userId,
        status: { $in: ['succeeded', 'completed'] },
        createdAt: { $gte: twentyFourHoursAgo }
      })
    ]);

    if (sentToRecipient && receivedFromRecipient) {
      return res.status(400).json({
        message: 'Please cool down before sending again',
        error: 'You and this person have already exchanged payments in the last 24 hours. Wait a bit before sending again.'
      });
    }

    // Use parsed amount
    const finalAmount = amountNum;

    // Ensure both users have a name (required by User model)
    if (!sender.name) {
      sender.name = sender.phoneNumber || sender.email || 'User';
    }
    if (!recipient.name) {
      recipient.name = recipient.phoneNumber || recipient.email || 'User';
    }

    // Atomically deduct from sender — prevents double-spend from concurrent requests
    const updatedSender = await User.findOneAndUpdate(
      { _id: req.user.userId, 'wallet.balance': { $gte: finalAmount } },
      { $inc: { 'wallet.balance': -finalAmount } },
      { new: true }
    );
    if (!updatedSender) {
      return res.status(400).json({
        message: 'Insufficient balance',
        insufficientBalance: true
      });
    }

    // Atomically credit recipient's spendable balance — money is immediately available
    await User.findByIdAndUpdate(
      recipient._id,
      { $inc: { 'wallet.balance': finalAmount } }
    );

    // NO redemption code for money transfers - money goes to wallet, recipient uses tap-and-pay card
    // Redemption codes are ONLY for point/reward system between users and venue owners
    // Log payment to database (no redemption code for money transfers)
    const payment = new Payment({
      senderId: req.user.userId,
      recipientId: recipient._id,
      amount: finalAmount,
      type: 'shot_sent',
      // redemptionCode: null - Money transfers use tap-and-pay, not redemption codes
      status: 'succeeded',
      source: 'som'
    });
    await payment.save();

    // Audit log — fire and forget
    AuditLog.create({
      action: 'payment_sent',
      actorId: req.user.userId,
      targetId: recipient._id,
      amount: finalAmount,
      paymentId: payment._id,
      ip: req.ip
    }).catch(() => {});

    // Award points and update stats (async, don't wait)
    handlePaymentSent(req.user.userId, amount).catch(err => console.error('Gamification error:', err));
    handlePaymentReceived(recipient._id, amount).catch(err => console.error('Gamification error:', err));

    // Auto-post to feed (fire and forget)
    try {
      const FeedPost = require('../models/FeedPost');
      const drinkEmoji = amountNum >= 25 ? '🥂' : amountNum >= 10 ? '🍻' : '🍺';
      const drinkWord = amountNum >= 25 ? 'some bubbly' : amountNum >= 10 ? 'a round' : 'a drink';
      const recipientFirst = recipient.firstName || recipient.name?.split(' ')[0] || 'someone';
      const postContent = `${drinkEmoji} Just sent ${recipientFirst} ${drinkWord}! ${message || 'Cheers 🥂'}`;
      await FeedPost.create({
        author: req.user.userId,
        postType: 'drink_sent',
        content: postContent,
        drinkInfo: {
          recipientId: recipient._id,
          recipientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
          amount: finalAmount,
          emoji: drinkEmoji,
          message: message || ''
        }
      });
    } catch (feedErr) {
      console.error('Feed post error (non-fatal):', feedErr);
    }

    // Send SMS notification to recipient (if phone number available)
    // Money transfers use tap-and-pay, not redemption codes
    if (recipient.phoneNumber) {
      const { sendPaymentSMS } = require('../utils/sms');
      const senderName = sender.firstName || sender.name || 'Someone';
      sendPaymentSMS(
        recipient.phoneNumber,
        senderName,
        finalAmount,
        null, // No redemption code for money transfers - use tap-and-pay card
        message || ''
      ).catch(err => {
        console.error('Error sending payment SMS:', err);
        // Don't fail payment if SMS fails
      });
    } else {
      console.log('⚠️ Recipient has no phone number. SMS not sent.');
    }

    // Create notifications for both sender and recipient
    try {
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      
      // Get sender info for notification
      const senderInfo = await User.findById(req.user.userId).select('firstName lastName name');
      const senderName = senderInfo?.firstName || senderInfo?.name || 'Someone';
      
      // Notification for recipient
      const recipientNotification = new Notification({
        recipient: recipient._id,
        actor: req.user.userId,
        type: 'payment_received',
        content: `${senderName} sent you $${finalAmount.toFixed(2)}`
      });
      await recipientNotification.save();
      
      // Notification for sender (confirmation)
      const senderNotification = new Notification({
        recipient: req.user.userId,
        actor: req.user.userId,
        type: 'payment_sent',
        content: `You sent $${finalAmount.toFixed(2)} to ${recipient.name || recipient.phoneNumber}`
      });
      await senderNotification.save();
      
      // Emit real-time notifications via Socket.io
      const socketIO = req.app.get('io');
      if (socketIO) {
        socketIO.to(`user-${recipient._id.toString()}`).emit('new-notification', {
          notification: recipientNotification,
          message: `${senderName} sent you $${finalAmount.toFixed(2)}`
        });
        socketIO.to(`user-${req.user.userId.toString()}`).emit('new-notification', {
          notification: senderNotification,
          message: `Payment sent successfully`
        });
      }
    } catch (notifError) {
      console.error('Error creating payment notifications:', notifError);
      // Don't fail payment if notification creation fails
    }

    res.json({
      message: 'Payment sent successfully. Recipient can use their tap-and-pay card to spend at venues.',
      payment: {
        // No redemptionCode - money transfers use tap-and-pay
        amount: finalAmount,
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
    res.status(500).json({ message: 'Server error'});
  }
});

// Send a round — one OTP, batch drink send to multiple friends
router.post('/send-round', auth, paymentLimiter, async (req, res) => {
  try {
    const { recipientIds, amount, emoji = '🥂', message = '', otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'A verification code is required.', requiresVerification: true });
    }
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one friend for the round.' });
    }
    if (recipientIds.length > 20) {
      return res.status(400).json({ message: 'Maximum 20 friends per round.' });
    }

    // Verify OTP once for the entire round
    const senderForOtp = await User.findById(req.user.userId).select('paymentOtp');
    if (!senderForOtp?.paymentOtp?.hash || !senderForOtp?.paymentOtp?.expiresAt) {
      return res.status(400).json({ message: 'No active verification code. Request a new one.', requiresVerification: true });
    }
    if (new Date() > senderForOtp.paymentOtp.expiresAt) {
      return res.status(400).json({ message: 'Verification code expired. Request a new one.', requiresVerification: true });
    }
    const otpValid = await bcrypt.compare(String(otp), senderForOtp.paymentOtp.hash);
    if (!otpValid) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }
    await User.findByIdAndUpdate(req.user.userId, { $unset: { paymentOtp: 1 } });

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || cents > 50000) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }
    const amountNum = cents / 100;
    const totalAmount = amountNum * recipientIds.length;

    const sender = await User.findById(req.user.userId);
    if (!sender) return res.status(404).json({ message: 'User not found' });
    if ((sender.wallet?.balance || 0) < totalAmount) {
      return res.status(402).json({
        message: `Insufficient balance. Need $${totalAmount.toFixed(2)} for ${recipientIds.length} drinks.`,
        insufficientBalance: true,
        required: totalAmount,
        balance: sender.wallet?.balance || 0
      });
    }

    // Deduct full round amount from sender atomically
    const updatedSender = await User.findOneAndUpdate(
      { _id: req.user.userId, 'wallet.balance': { $gte: totalAmount } },
      { $inc: { 'wallet.balance': -totalAmount } },
      { new: true }
    );
    if (!updatedSender) {
      return res.status(402).json({ message: 'Insufficient balance.', insufficientBalance: true });
    }

    const results = [];
    const FeedPost = require('../models/FeedPost');
    const senderName = sender.firstName || sender.name?.split(' ')[0] || 'Someone';
    const drinkEmoji = ['🍺', '🍻', '🥂', '🍹', '🥃'].includes(emoji) ? emoji : '🥂';

    for (const recipientId of recipientIds) {
      try {
        const recipient = await User.findById(recipientId);
        if (!recipient) { results.push({ recipientId, success: false, reason: 'Not found' }); continue; }
        if (recipient._id.toString() === req.user.userId) { results.push({ recipientId, success: false, reason: 'Cannot send to yourself' }); continue; }

        await User.findByIdAndUpdate(recipientId, { $inc: { 'wallet.balance': amountNum } });

        const Payment = require('../models/Payment');
        await Payment.create({
          senderId: req.user.userId,
          recipientId: recipient._id,
          amount: amountNum,
          type: 'drink',
          status: 'completed',
          description: message || `Round from ${senderName} ${drinkEmoji}`,
          source: 'som',
        });

        const recipientName = recipient.firstName || recipient.name?.split(' ')[0] || 'Friend';
        await FeedPost.create({
          author: req.user.userId,
          postType: 'drink_sent',
          content: `${senderName} sent ${recipientName} a drink ${drinkEmoji}`,
          drinkInfo: {
            recipientId: recipient._id,
            recipientName,
            amount: amountNum,
            emoji: drinkEmoji,
            message,
          },
        });

        results.push({ recipientId, success: true, recipientName });
      } catch (e) {
        results.push({ recipientId, success: false, reason: e.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      message: `Round sent to ${successCount} of ${recipientIds.length} friends!`,
      results,
      newBalance: (updatedSender.wallet?.balance || 0) - ((recipientIds.length - successCount) * amountNum),
    });
  } catch (error) {
    console.error('Send round error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const { type, filter, limit = 20, skip = 0 } = req.query;
    
    const query = {
      $or: [
        { senderId: req.user.userId },
        { recipientId: req.user.userId }
      ]
    };

    if (type) {
      query.type = type;
    }

    // Filter by sent/received
    if (filter === 'sent') {
      query.senderId = req.user.userId;
      delete query.$or;
    } else if (filter === 'received') {
      query.recipientId = req.user.userId;
      delete query.$or;
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skipNum = Math.min(10000, Math.max(0, parseInt(skip) || 0));

    const payments = await Payment.find(query)
      .populate('senderId', 'firstName lastName profilePicture phoneNumber')
      .populate('recipientId', 'firstName lastName profilePicture phoneNumber')
      .populate('venueId', 'name address')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    // Get total count for pagination
    const totalCount = await Payment.countDocuments(query);

    res.json({ 
      payments: payments,
      count: payments.length,
      hasMore: skipNum + payments.length < totalCount,
      total: totalCount
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent recipients (for SendShotTab)
router.get('/recent-recipients', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get payments where current user was the sender
    const payments = await Payment.find({ senderId: req.user.userId })
      .populate('recipientId', 'firstName lastName profilePicture phoneNumber')
      .sort({ createdAt: -1 })
      .limit(Math.min(50, Math.max(1, parseInt(limit) || 10)) * 2); // Get more to deduplicate

    // Deduplicate by recipient and get most recent
    const recipientMap = new Map();
    payments.forEach(payment => {
      if (payment.recipientId && typeof payment.recipientId === 'object') {
        const recipientId = payment.recipientId._id?.toString() || payment.recipientId.toString();
        if (!recipientMap.has(recipientId)) {
          recipientMap.set(recipientId, {
            _id: recipientId,
            firstName: payment.recipientId.firstName || '',
            lastName: payment.recipientId.lastName || '',
            profilePicture: payment.recipientId.profilePicture,
            phoneNumber: payment.recipientId.phoneNumber,
            lastSent: payment.createdAt,
            totalSent: 1
          });
        } else {
          const existing = recipientMap.get(recipientId);
          existing.totalSent = (existing.totalSent || 0) + 1;
          if (new Date(payment.createdAt) > new Date(existing.lastSent)) {
            existing.lastSent = payment.createdAt;
          }
        }
      }
    });
    
    // Convert to array and sort by last sent date
    const recipients = Array.from(recipientMap.values())
      .sort((a, b) => new Date(b.lastSent).getTime() - new Date(a.lastSent).getTime())
      .slice(0, Math.min(50, Math.max(1, parseInt(limit) || 10)));

    res.json({ recipients });
  } catch (error) {
    console.error('Error fetching recent recipients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/redeem
// Robust, atomic, and idempotent redeem endpoint for tap-and-pay
// Body: { redemptionCode?: string, paymentId?: string, venueId?: string, idempotencyKey?: string }
// Auth required
router.post('/redeem', auth, async (req, res) => {
  const userId = req.user.userId;
  const { redemptionCode, paymentId, venueId, idempotencyKey } = req.body;

  try {
    // 1) Find the Payment record (if paymentId provided) OR find by redemptionCode
    let payment;
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    } else if (redemptionCode) {
      payment = await Payment.findOne({ 
        redemptionCode: redemptionCode.toUpperCase(),
        type: { $in: ['shot_sent', 'tap_and_pay'] }
      });
    } else {
      return res.status(400).json({ 
        error: 'paymentId or redemptionCode required',
        message: 'Either paymentId or redemptionCode must be provided'
      });
    }

    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment not found',
        message: 'Invalid payment ID or redemption code'
      });
    }

    // 2) Idempotency: if idempotencyKey passed and a Payment with that key already succeeded, return success
    if (idempotencyKey) {
      const prior = await Payment.findOne({ 
        idempotencyKey, 
        status: { $in: ['succeeded', 'processing'] } 
      });
      if (prior && prior.stripeTransferId) {
        console.log(`✅ Idempotency: Returning existing successful redemption for key ${idempotencyKey}`);
        return res.json({ 
          success: true, 
          transferId: prior.stripeTransferId, 
          paymentId: prior._id,
          message: 'Payment already processed',
          idempotent: true
        });
      }
    }

    // 3) Check if payment is already processed (for virtual card tap-and-pay)
    // Virtual card payments are processed via webhook, so wallet may already be deducted
    if (payment.status === 'succeeded' && payment.stripeTransferId) {
      // Payment already fully processed - return success
      return res.json({ 
        success: true, 
        transferId: payment.stripeTransferId, 
        paymentId: payment._id,
        message: 'Payment already processed',
        alreadyProcessed: true
      });
    }

    // 4) Ensure atomicity: attempt to mark payment processing only if it is pending
    // This prevents race conditions - only one request can transition from pending -> processing
    const now = new Date();
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      { 
        $set: { 
          status: 'processing', 
          idempotencyKey: idempotencyKey || payment.idempotencyKey, 
          updatedAt: now 
        } 
      },
      { new: true }
    );

    if (!updated) {
      // Someone else already processed; re-fetch and report status
      const fresh = await Payment.findById(payment._id);
      console.warn(`⚠️ Payment ${payment._id} already processed with status: ${fresh.status}`);
      
      // If it's succeeded with a transfer, return success
      if (fresh.status === 'succeeded' && fresh.stripeTransferId) {
        return res.json({ 
          success: true, 
          transferId: fresh.stripeTransferId, 
          paymentId: fresh._id,
          message: 'Payment already processed',
          alreadyProcessed: true
        });
      }
      
      return res.status(409).json({ 
        error: 'Payment already processed', 
        status: fresh.status, 
        paymentId: fresh._id,
        transferId: fresh.stripeTransferId || null
      });
    }

    // Update payment reference to the updated one
    payment = updated;

    // 5) Validate user wallet balance and venue
    const user = await User.findById(userId);
    if (!user) {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine venue - use provided venueId or payment.venueId
    const targetVenueId = venueId || payment.venueId;
    if (!targetVenueId) {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return res.status(400).json({ 
        error: 'Venue ID required',
        message: 'venueId must be provided for tap-and-pay redemption'
      });
    }

    const venue = await Venue.findById(targetVenueId);
    if (!venue || !venue.stripeAccountId) {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return res.status(400).json({ 
        error: 'Venue not connected',
        message: 'Venue has not connected their Stripe account'
      });
    }

    // Amount in dollars (payment.amount is stored in dollars)
    const amountInDollars = payment.amount;
    const amountInCents = Math.round(amountInDollars * 100);

    // Check if this is a virtual card tap-and-pay that was already processed via webhook
    // Virtual card payments have wallet deducted in webhook handler, so skip deduction here
    const isVirtualCardPayment = payment.stripeAuthorizationId && payment.type === 'tap_and_pay';
    const walletAlreadyDeducted = isVirtualCardPayment && payment.status === 'processing';

    // For virtual card payments processed via webhook, wallet is already deducted
    // We just need to create the transfer if it doesn't exist
    if (isVirtualCardPayment && walletAlreadyDeducted && payment.stripeTransferId) {
      // Transfer already created in webhook handler - just update status
      payment.status = 'succeeded';
      payment.venueId = venue._id;
      await payment.save();
      
      return res.json({ 
        success: true, 
        transferId: payment.stripeTransferId, 
        paymentId: payment._id,
        message: 'Payment already processed via webhook',
        alreadyProcessed: true
      });
    }

    // For non-virtual-card payments or virtual cards without transfer yet, proceed normally
    const userBalance = (user.wallet?.balance || 0);
    
    // Only check balance for tap_and_pay type that hasn't been processed yet
    if (payment.type === 'tap_and_pay' && !walletAlreadyDeducted && userBalance < amountInDollars) {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      return res.status(402).json({ 
        error: 'Insufficient wallet balance',
        balance: userBalance,
        required: amountInDollars
      });
    }

    // 6) Deduct user wallet (if needed) and create Stripe transfer under a DB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct wallet for tap_and_pay ONLY if not already deducted by webhook
      if (payment.type === 'tap_and_pay' && !walletAlreadyDeducted) {
        const deducted = await User.findOneAndUpdate(
          { _id: userId, 'wallet.balance': { $gte: amountInDollars } },
          { $inc: { 'wallet.balance': -amountInDollars } },
          { new: true, session }
        );
        if (!deducted) throw new Error('Insufficient balance during redeem deduction');
        console.log(`💰 Deducted $${amountInDollars} from user ${userId} wallet. New balance: $${deducted.wallet.balance}`);
      } else if (walletAlreadyDeducted) {
        console.log(`ℹ️ Wallet already deducted for virtual card payment ${payment._id} via webhook`);
      }

      // Create Stripe transfer from platform to connected account
      // Skip if transfer already exists (created by webhook handler for virtual cards)
      let transfer;
      if (payment.stripeTransferId) {
        // Transfer already created by webhook handler - retrieve it
        const stripe = stripeUtils.stripe;
        transfer = await stripe.transfers.retrieve(payment.stripeTransferId);
        console.log(`ℹ️ Using existing transfer ${transfer.id} for payment ${payment._id} (created via webhook)`);
      } else {
        // Create new transfer
        if (!stripeUtils.isStripeConfigured()) {
          throw new Error('Stripe is not configured');
        }

        const stripe = stripeUtils.stripe;
        transfer = await stripe.transfers.create({
          amount: amountInCents, // cents
          currency: payment.currency || 'usd',
          destination: venue.stripeAccountId,
          metadata: {
            paymentId: payment._id.toString(),
            userId: userId,
            venueId: venue._id.toString(),
            venueName: venue.name,
            type: payment.type === 'tap_and_pay' ? 'tap_and_pay' : 'shot_redemption',
            redemptionCode: payment.redemptionCode || null
          },
        }, {
          idempotencyKey: idempotencyKey || `redeem-${payment._id.toString()}-${Date.now()}`
        });

        console.log(`✅ Stripe transfer created: ${transfer.id} for payment ${payment._id}`);
      }

      // Update payment record
      payment.stripeTransferId = transfer.id;
      payment.status = 'succeeded';
      payment.venueId = venue._id;
      if (payment.type === 'shot_sent') {
        payment.type = 'shot_redeemed';
        payment.recipientId = userId; // User redeeming
      }
      await payment.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Award points for Tap n Pay transaction (2 points)
      if (payment.type === 'tap_and_pay') {
        try {
          const DailyVenuePoints = require('../models/DailyVenuePoints');
          const startOfDay = DailyVenuePoints.getStartOfDay();
          
          // Get or create daily venue points record
          let dailyPoints = await DailyVenuePoints.findOne({
            user: userId,
            venue: venue._id,
            date: startOfDay
          });

          if (!dailyPoints) {
            dailyPoints = new DailyVenuePoints({
              user: userId,
              venue: venue._id,
              date: startOfDay,
              tapAndPayPoints: 0,
              checkInPoints: 0,
              totalPoints: 0
            });
          }

          // Award 2 points for Tap n Pay
          const result = dailyPoints.awardPoints('tap_and_pay', 2, payment._id);
          
          if (result.awarded > 0) {
            await dailyPoints.save();
            
            // Update user's total points
            user.points = (user.points || 0) + result.awarded;
            user.totalPointsEarned = (user.totalPointsEarned || 0) + result.awarded;
            await user.save();
            
            console.log(`⭐ Awarded ${result.awarded} points for Tap n Pay at ${venue.name}`);
            
            // Emit points update event
            const io = req.app.get('io');
            if (io) {
              io.to(`user-${userId.toString()}`).emit('points-updated', {
                userId: userId.toString(),
                points: user.points,
                pointsEarned: result.awarded,
                source: 'tap_and_pay',
                venueId: venue._id.toString()
              });
            }
          } else {
            console.log(`ℹ️ Points not awarded: ${result.reason}`);
          }
        } catch (pointsError) {
          console.error('Error awarding points for Tap n Pay:', pointsError);
          // Don't fail redemption if points awarding fails
        }
      }

      // Create notification for successful redemption
      try {
        const Notification = require('../models/Notification');
        const sender = await User.findById(payment.senderId).select('firstName lastName name');
        const senderName = sender?.firstName || sender?.name || 'Someone';
        
        const redemptionNotification = new Notification({
          recipient: userId,
          actor: payment.senderId,
          type: 'payment_received',
          content: `You redeemed $${amountInDollars.toFixed(2)} at ${venue.name}`
        });
        await redemptionNotification.save();
        
        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user-${userId.toString()}`).emit('new-notification', {
            notification: redemptionNotification,
            message: `Payment redeemed at ${venue.name}`
          });
        }
      } catch (notifError) {
        console.error('Error creating redemption notification:', notifError);
        // Don't fail redemption if notification creation fails
      }

      // Emit socket events for real-time updates
      const io = req.app.get('io');
      if (io) {
        if (payment.type === 'tap_and_pay' || payment.type === 'shot_redeemed') {
          io.to(`user-${userId}`).emit('wallet-updated', { 
            userId, 
            newBalance: user.wallet?.balance || 0 
          });
        }
        io.to(`venue-${venue._id}`).emit('venue-paid', { 
          paymentId: payment._id, 
          amount: amountInDollars,
          transferId: transfer.id
        });
      }

      return res.json({ 
        success: true, 
        transferId: transfer.id, 
        newBalance: payment.type === 'tap_and_pay' ? user.wallet.balance : undefined,
        paymentId: payment._id,
        message: 'Payment redeemed successfully'
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ Redeem error:', err);
      
      // Update payment status to failed
      const errorMetadata = new Map(payment.metadata || []);
      errorMetadata.set('error', String(err.message || err));
      errorMetadata.set('errorType', err.type || 'unknown');
      await Payment.findByIdAndUpdate(payment._id, { 
        status: 'failed', 
        metadata: errorMetadata
      });

      return res.status(500).json({ 
        error: 'Redeem failed', 
        details: err.message || String(err),
        paymentId: payment._id
      });
    }
  } catch (error) {
    console.error('❌ Error in redeem endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// KYC limits helper (imported lazily to avoid circular deps)
const { KYC_LIMITS } = require('./kyc');

// Create Stripe Payment Intent for adding funds to wallet
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { amount, paymentMethodId, savePaymentMethod } = req.body;

    // Validate and parse amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        message: 'Valid amount is required',
        error: `Amount must be a positive number. Received: ${amount} (type: ${typeof amount})`
      });
    }

    // Enforce KYC-based per-transaction and balance limits
    const userForKyc = await User.findById(req.user.userId).select('kyc wallet');
    if (userForKyc) {
      const kycStatus = userForKyc.kyc?.status || 'unverified';
      const limits = KYC_LIMITS[kycStatus] || KYC_LIMITS.unverified;

      if (amountNum > limits.dailyAddFunds) {
        return res.status(400).json({
          message: `Amount exceeds your daily add-funds limit of $${limits.dailyAddFunds}. Verify your identity to increase limits.`,
          kycRequired: kycStatus === 'unverified' || kycStatus === 'failed'
        });
      }

      const projectedBalance = (userForKyc.wallet?.balance || 0) + amountNum;
      if (projectedBalance > limits.maxBalance) {
        return res.status(400).json({
          message: `This would exceed your wallet balance limit of $${limits.maxBalance}. Verify your identity to increase limits.`,
          kycRequired: kycStatus === 'unverified' || kycStatus === 'failed'
        });
      }
    }

    if (amountNum > 2000) {
      return res.status(400).json({ message: 'Amount exceeds the maximum of $2,000 per transaction' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    // Validate Stripe client is accessible
    let stripe;
    try {
      stripe = stripeUtils.stripe;
    } catch (stripeError) {
      console.error('❌ Stripe client access error:', stripeError);
      return res.status(503).json({ 
        error: 'Stripe is not initialized',
        message: stripeError.message || 'Payment processing is currently unavailable. Please check Stripe configuration.'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      try {
        // Build name from firstName/lastName or use name field
        const customerName = user.name || 
          (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email);
        
        if (!user.email) {
          return res.status(400).json({ 
            message: 'User email is required',
            error: 'User account is missing email address'
          });
        }
        
        const customer = await stripe.customers.create({
          email: user.email,
          name: customerName,
          metadata: {
            userId: user._id.toString()
          }
        });
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save();
      } catch (customerError) {
        console.error('Error creating Stripe customer:', customerError);
        return res.status(500).json({ 
          error: 'Failed to create payment account',
          message: customerError.message || 'Could not set up payment account'
        });
      }
    } else {
      // Verify existing customer is valid
      try {
        await stripe.customers.retrieve(customerId);
      } catch (verifyError) {
        // Customer doesn't exist or is invalid - create a new one
        if (verifyError.code === 'resource_missing' || verifyError.message?.includes('No such customer')) {
          console.log('⚠️ Invalid Stripe customer ID, creating new one:', customerId);
          try {
            const customerName = user.name || 
              (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email);
            const customer = await stripe.customers.create({
              email: user.email,
              name: customerName,
              metadata: {
                userId: user._id.toString()
              }
            });
            customerId = customer.id;
            user.stripeCustomerId = customerId;
            await user.save();
          } catch (createError) {
            console.error('Error creating new Stripe customer:', createError);
            return res.status(500).json({ 
              error: 'Failed to create payment account',
              message: createError.message || 'Could not set up payment account'
            });
          }
        } else {
          throw verifyError;
        }
      }
    }

    const amountInCents = Math.round(amountNum * 100);

    // Create payment intent with optional saved payment method
    const paymentIntentData = {
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      metadata: {
        userId: req.user.userId.toString(),
        type: 'wallet_topup'
      }
    };

    // If using saved payment method, attach it and use confirmation_method
    // NOTE: Cannot use both automatic_payment_methods and confirmation_method together
    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.confirmation_method = 'automatic';
      paymentIntentData.confirm = true;
      paymentIntentData.return_url = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/wallet?success=true`;
    } else {
      // Only use automatic_payment_methods when NOT using a saved payment method
      paymentIntentData.automatic_payment_methods = {
        enabled: true
      };
    }

    // If saving payment method, set up future usage
    if (savePaymentMethod) {
      paymentIntentData.setup_future_usage = 'off_session';
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    } catch (stripeError) {
      console.error('❌ Stripe PaymentIntent creation error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        raw: stripeError.raw
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create payment intent';
      let statusCode = 500;
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        errorMessage = `Invalid request: ${stripeError.message}`;
        statusCode = 400;
      } else if (stripeError.type === 'StripeAPIError') {
        errorMessage = `Stripe API error: ${stripeError.message}`;
        statusCode = 503;
      } else if (stripeError.message?.includes('No such customer')) {
        errorMessage = 'Customer account issue. Please try again.';
        statusCode = 400;
      } else if (stripeError.message?.includes('Invalid API Key')) {
        errorMessage = 'Payment system configuration error. Please contact support.';
        statusCode = 503;
      } else {
        errorMessage = stripeError.message || 'Failed to create payment intent';
      }
      
      return res.status(statusCode).json({ 
        error: 'Payment processing failed',
        message: errorMessage,
        details: stripeError.type || 'unknown_error',
        code: stripeError.code || null
      });
    }

    // Log payment to database
    // Note: Don't include redemptionCode for wallet_topup (it's only for shot_sent)
    let payment = null;
    try {
      const paymentData = {
        senderId: req.user.userId,
        amount: amountNum,
        type: 'wallet_topup',
        stripePaymentIntentId: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        source: 'som'
      };
      // Explicitly omit redemptionCode to avoid index conflicts
      payment = new Payment(paymentData);
      await payment.save();
    } catch (dbError) {
      console.error('Error saving payment to database:', dbError);
      // Don't fail the request if DB save fails - payment intent is already created
    }

    // If payment succeeded immediately (saved payment method), update wallet atomically.
    // The Payment record is saved with status:'succeeded' above, so the webhook guard
    // (payment.status === 'pending') will prevent a double-credit if the webhook also fires.
    if (paymentIntent.status === 'succeeded') {
      try {
        await User.findByIdAndUpdate(req.user.userId, { $inc: { 'wallet.balance': amount } });

        if (payment) {
          payment.status = 'succeeded';
          await payment.save();
        }
      } catch (walletError) {
        console.error('Error updating wallet:', walletError);
        // Non-critical - payment intent succeeded, wallet update can be retried
      }

      // Emit real-time update — re-fetch fresh balance for accuracy
      const io = req.app.get('io');
      if (io) {
        const freshUser = await User.findById(req.user.userId, 'wallet');
        if (freshUser) {
          io.to(`user-${freshUser._id.toString()}`).emit('wallet-updated', {
            userId: freshUser._id.toString(),
            balance: freshUser.wallet.balance
          });
        }
      }

      // Audit log — fire-and-forget
      AuditLog.create({
        action: 'wallet_funded',
        actorId: req.user.userId,
        amount,
        ip: req.ip,
        meta: { paymentIntentId: paymentIntent.id }
      }).catch(() => {});
    }

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      paymentId: payment?._id || null,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action',
      nextAction: paymentIntent.next_action
    });
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    console.error('   Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create payment intent';
    let statusCode = 500;
    
    if (error.message?.includes('Stripe is not initialized') || error.message?.includes('STRIPE_SECRET_KEY')) {
      errorMessage = 'Stripe is not configured. Please check backend configuration.';
      statusCode = 503;
    } else if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAPIError') {
      errorMessage = `Stripe error: ${error.message || 'Payment processing failed'}`;
      statusCode = 400; // Client error for invalid Stripe requests
    } else if (error.message?.includes('No such customer')) {
      errorMessage = 'Customer creation failed. Please try again.';
    } else if (error.message?.includes('Invalid API Key') || error.message?.includes('api_key')) {
      errorMessage = 'Stripe API key is invalid. Please check configuration.';
      statusCode = 503;
    } else {
      errorMessage = error.message || 'Failed to create payment intent';
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: undefined || 'Unknown error',
      type: error.type || 'unknown',
      code: error.code || null
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
      status: transfer.status === 'paid' ? 'succeeded' : 'processing',
      source: 'som'
    });
    await payment.save();

    // Atomically deduct from sender's wallet
    await User.findOneAndUpdate(
      { _id: req.user.userId, 'wallet.balance': { $gte: amount } },
      { $inc: { 'wallet.balance': -amount } }
    );

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
      error: undefined 
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

        // Atomically credit wallet — prevents double-credit from concurrent webhooks
        const user = await User.findOneAndUpdate(
          { _id: payment.senderId },
          { $inc: { 'wallet.balance': payment.amount } },
          { new: true }
        );
        if (user) {

          // Card uses wallet.balance for authorization - no separate sync needed
          // The card checks wallet.balance directly when authorizing transactions
          // So they're always in sync by design

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
      
      const paymentId = transfer.metadata?.paymentId;
      if (paymentId) {
        const payment = await Payment.findById(paymentId);
        if (payment) {
          if (payment.status === 'processing' || payment.status === 'pending') {
            payment.status = 'succeeded';
            payment.stripeTransferId = transfer.id;
            await payment.save();
            console.log(`✅ Transfer succeeded: ${transfer.id} for payment ${paymentId}`);
            
            // Emit socket event if needed
            const io = req.app.get('io');
            if (io && payment.venueId) {
              io.to(`venue-${payment.venueId}`).emit('transfer-completed', {
                paymentId: payment._id,
                transferId: transfer.id,
                amount: payment.amount
              });
            }
          } else {
            console.log(`ℹ️ Transfer ${transfer.id} already processed for payment ${paymentId} (status: ${payment.status})`);
          }
        } else {
          console.warn(`⚠️ Payment ${paymentId} not found for transfer ${transfer.id}`);
        }
      } else {
        // Fallback: find by stripeTransferId
        const payment = await Payment.findOne({ 
          stripeTransferId: transfer.id 
        });
        if (payment && (payment.status === 'processing' || payment.status === 'pending')) {
          payment.status = 'succeeded';
          await payment.save();
          console.log(`✅ Transfer succeeded (fallback lookup): ${transfer.id}`);
        }
      }
    }

    // Process transfer.updated (alternative to transfer.paid/failed - check status)
    if (event.type === 'transfer.updated') {
      const transfer = event.data.object;
      
      // Only process if transfer status changed to paid or failed
      if (transfer.status === 'paid' || transfer.status === 'failed') {
        const paymentId = transfer.metadata?.paymentId;
        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment && (payment.status === 'processing' || payment.status === 'pending')) {
            if (transfer.status === 'paid') {
              payment.status = 'succeeded';
              payment.stripeTransferId = transfer.id;
              await payment.save();
              console.log(`✅ Transfer succeeded (via transfer.updated): ${transfer.id} for payment ${paymentId}`);
              
              const io = req.app.get('io');
              if (io && payment.venueId) {
                io.to(`venue-${payment.venueId}`).emit('transfer-completed', {
                  paymentId: payment._id,
                  transferId: transfer.id,
                  amount: payment.amount
                });
              }
            } else if (transfer.status === 'failed') {
              payment.status = 'failed';
              payment.metadata = payment.metadata || new Map();
              payment.metadata.set('transferFailureReason', transfer.failure_code || 'unknown');
              payment.metadata.set('transferFailureMessage', transfer.failure_message || 'Transfer failed');
              await payment.save();
              console.error(`❌ Transfer failed (via transfer.updated): ${transfer.id} for payment ${paymentId}`);
            }
          }
        }
      }
    }

    // Process transfer.failed (when transfer to venue fails)
    if (event.type === 'transfer.failed') {
      const transfer = event.data.object;
      
      const paymentId = transfer.metadata?.paymentId;
      if (paymentId) {
        const payment = await Payment.findById(paymentId);
        if (payment) {
          payment.status = 'failed';
          payment.metadata = payment.metadata || new Map();
          payment.metadata.set('transferFailureReason', transfer.failure_code || 'unknown');
          payment.metadata.set('transferFailureMessage', transfer.failure_message || 'Transfer failed');
          await payment.save();
          console.error(`❌ Transfer failed: ${transfer.id} for payment ${paymentId}. Reason: ${transfer.failure_code}`);
          
          // Automatically refund sender if wallet was already deducted
          if (payment.type === 'tap_and_pay' || payment.type === 'shot_sent') {
            try {
              await User.findByIdAndUpdate(
                payment.senderId,
                { $inc: { 'wallet.balance': payment.amount } }
              );
              payment.status = 'refunded';
              await payment.save();
              AuditLog.create({
                action: 'payment_refunded',
                actorId: payment.senderId,
                amount: payment.amount,
                meta: { reason: 'transfer_failed', transferId: transfer.id, paymentId: payment._id }
              }).catch(() => {});
              console.log(`✅ Auto-refunded $${payment.amount} to sender ${payment.senderId} after transfer failure`);
            } catch (refundErr) {
              console.error(`❌ CRITICAL: Failed to auto-refund payment ${payment._id} after transfer failure:`, refundErr.message);
            }
          }
        } else {
          console.warn(`⚠️ Payment ${paymentId} not found for failed transfer ${transfer.id}`);
        }
      } else {
        // Fallback: find by stripeTransferId
        const payment = await Payment.findOne({ 
          stripeTransferId: transfer.id 
        });
        if (payment) {
          payment.status = 'failed';
          payment.metadata = payment.metadata || new Map();
          payment.metadata.set('transferFailureReason', transfer.failure_code || 'unknown');
          await payment.save();
          console.error(`❌ Transfer failed (fallback lookup): ${transfer.id}`);
        }
      }
    }

    // ============================================
    // NEW PATHWAY: Virtual Card Tap-and-Pay
    // Process issuing.authorization.request (virtual card tap-and-pay)
    // This is when a user taps their phone - money draws from platform account
    // ============================================
    // Handle both dot and underscore formats (Stripe uses dots in webhooks)
    if (event.type === 'issuing.authorization.request' || event.type === 'issuing_authorization.request') {
      const authorization = event.data.object;
      
      try {
        // Get the card and find the user
        const cardId = authorization.card.id;
        const VirtualCard = require('../models/VirtualCard');
        const virtualCard = await VirtualCard.findOne({ stripeCardId: cardId });
        
        if (!virtualCard) {
          console.warn(`⚠️ Virtual card not found for authorization ${authorization.id}`);
          // Deny the authorization if we can't find the card
          const stripe = stripeUtils.stripe;
          await stripe.issuing.authorizations.decline(authorization.id, {
            metadata: {
              reason: 'card_not_found',
              message: 'Virtual card not found in database'
            }
          });
          return res.json({ received: true, handled: false, reason: 'card_not_found' });
        }
        
        // Get user and check wallet balance (ledger check)
        const user = await User.findById(virtualCard.user);
        if (!user) {
          console.warn(`⚠️ User not found for virtual card ${cardId}`);
          const stripe = stripeUtils.stripe;
          await stripe.issuing.authorizations.decline(authorization.id, {
            metadata: {
              reason: 'user_not_found',
              message: 'User not found for virtual card'
            }
          });
          return res.json({ received: true, handled: false, reason: 'user_not_found' });
        }
        
        // Check wallet balance (ledger check) - money stays in platform account
        const amountInDollars = authorization.amount / 100; // Convert from cents
        const walletBalance = user.wallet?.balance || 0;
        
        if (walletBalance < amountInDollars) {
          // Insufficient balance - decline authorization
          console.log(`❌ Declining authorization ${authorization.id}: Insufficient wallet balance. User: ${user._id}, Balance: $${walletBalance}, Requested: $${amountInDollars}`);
          const stripe = stripeUtils.stripe;
          await stripe.issuing.authorizations.decline(authorization.id, {
            metadata: {
              reason: 'insufficient_balance',
              userId: user._id.toString(),
              walletBalance: walletBalance.toString(),
              requestedAmount: amountInDollars.toString()
            }
          });
          return res.json({ received: true, handled: true, approved: false, reason: 'insufficient_balance' });
        }
        
        // Sufficient balance — look up participating venue before approving
        // Stripe Issuing: merchant_data.network_id is the merchant's network MID.
        // Venues that use Stripe Terminal under their connected account expose this MID
        // through the authorization event. We store it as stripeAccountId on the Venue.
        const merchantNetworkId = authorization.merchant_data?.network_id;
        let venue = null;
        if (merchantNetworkId) {
          venue = await Venue.findOne({ stripeAccountId: merchantNetworkId });
          if (!venue) {
            // Secondary attempt: some Stripe configurations use the connected account ID
            // directly as the network_id — no match means non-participating merchant.
            console.warn(`⚠️ Tap-and-pay at unrecognized merchant "${authorization.merchant_data?.name}" (network_id: ${merchantNetworkId}) for authorization ${authorization.id}`);
          }
        } else {
          console.warn(`⚠️ No merchant network_id in authorization ${authorization.id} — cannot verify venue`);
        }

        const stripe = stripeUtils.stripe;
        await stripe.issuing.authorizations.approve(authorization.id, {
          metadata: {
            userId: user._id.toString(),
            walletBalance: walletBalance.toString(),
            amount: amountInDollars.toString(),
            type: 'tap_and_pay',
            merchant: authorization.merchant_data?.name || 'Unknown',
            venueId: venue ? venue._id.toString() : ''
          }
        });

        // Create a pending Payment record for tracking
        const payment = new Payment({
          senderId: user._id,
          amount: amountInDollars,
          type: 'tap_and_pay',
          status: 'processing',
          source: 'som',
          stripeAuthorizationId: authorization.id,
          ...(venue && { venueId: venue._id }),
          metadata: new Map([
            ['authorizationId', authorization.id],
            ['cardId', cardId],
            ['merchant', authorization.merchant_data?.name || 'Unknown'],
            ['location', authorization.merchant_data?.city || 'Unknown'],
            ...(venue ? [['venueId', venue._id.toString()], ['venueName', venue.name]] : [])
          ])
        });
        await payment.save();
        
        return res.json({ received: true, handled: true, approved: true });
      } catch (authError) {
        console.error(`❌ Error processing issuing authorization ${authorization.id}:`, authError);
        // Try to decline on error
        try {
          const stripe = stripeUtils.stripe;
          await stripe.issuing.authorizations.decline(authorization.id, {
            metadata: {
              reason: 'processing_error',
              error: authError.message
            }
          });
        } catch (declineError) {
          console.error(`❌ Failed to decline authorization ${authorization.id}:`, declineError);
        }
        return res.json({ received: true, handled: false });
      }
    }

    // Process issuing.authorization.updated (authorization completed/finalized)
    // When the charge is finalized, deduct from wallet ledger and create transfer to venue
    // Handle both dot and underscore formats (Stripe uses dots in webhooks)
    if (event.type === 'issuing.authorization.updated' || event.type === 'issuing_authorization.updated') {
      const authorization = event.data.object;
      
      // Find payment by authorization ID
      let payment = await Payment.findOne({
        stripeAuthorizationId: authorization.id
      });
      
      if (!payment) {
        // Try metadata lookup as fallback
        payment = await Payment.findOne({
          'metadata.authorizationId': authorization.id
        });
        if (payment) {
          payment.stripeAuthorizationId = authorization.id;
          await payment.save();
        } else {
          console.warn(`⚠️ Payment not found for authorization ${authorization.id}`);
          return res.json({ received: true, handled: false, reason: 'payment_not_found' });
        }
      }
      
      // If authorization was approved and completed, deduct wallet (ledger) and create transfer
      if (authorization.status === 'approved' && payment.status === 'processing') {
        const amountInDollars = authorization.amount / 100;

        // Atomically deduct wallet — $gte guard prevents going negative if somehow
        // the balance dropped between authorization approval and this webhook
        const updatedUser = await User.findOneAndUpdate(
          { _id: payment.senderId, 'wallet.balance': { $gte: amountInDollars } },
          { $inc: { 'wallet.balance': -amountInDollars } },
          { new: true }
        );

        if (!updatedUser) {
          console.error(`❌ Insufficient balance or user not found for payment ${payment._id}`);
          payment.status = 'failed';
          await payment.save();
          return res.json({ received: true, handled: false, reason: 'insufficient_balance' });
        }

        try {
          // Update payment status
          payment.status = 'succeeded';
          payment.stripeChargeId = authorization.id;
          await payment.save();
          
          console.log(`✅ Wallet ledger updated: User ${updatedUser._id}, Amount: $${amountInDollars}, New Balance: $${updatedUser.wallet.balance}`);

          // Emit real-time update
          const io = req.app.get('io');
          if (io) {
            io.to(`user-${updatedUser._id.toString()}`).emit('wallet-updated', {
              userId: updatedUser._id.toString(),
              balance: updatedUser.wallet.balance
            });
          }

          // If venueId is known, create transfer from platform → venue immediately
          if (payment.venueId) {
            try {
              const venue = await Venue.findById(payment.venueId);
              if (venue && venue.stripeAccountId) {
                const amountInCents = Math.round(amountInDollars * 100);
                const transfer = await stripeUtils.stripe.transfers.create({
                  amount: amountInCents,
                  currency: 'usd',
                  destination: venue.stripeAccountId,
                  metadata: {
                    paymentId: payment._id.toString(),
                    userId: updatedUser._id.toString(),
                    venueId: venue._id.toString(),
                    venueName: venue.name,
                    type: 'tap_and_pay',
                    authorizationId: authorization.id
                  }
                }, {
                  idempotencyKey: `tap-pay-${authorization.id}`
                });
                payment.stripeTransferId = transfer.id;
                await payment.save();
                console.log(`✅ Transfer created: ${transfer.id} from platform to venue ${venue.name}`);
              }
            } catch (transferError) {
              console.error(`⚠️ Could not create transfer for authorization ${authorization.id}:`, transferError.message);
            }
          }

        } catch (deductError) {
          console.error(`❌ Error processing authorization ${authorization.id}:`, deductError);
          payment.status = 'failed';
          await payment.save();
          throw deductError;
        }
      } else if (authorization.status === 'declined') {
        // Authorization was declined - mark payment as failed
        payment.status = 'failed';
        await payment.save();
        console.log(`❌ Authorization declined: ${authorization.id} for payment ${payment._id}`);
      }
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true, handled: result.handled });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Add payment method to user's account
router.post('/add-payment-method', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ message: 'Payment method ID is required' });
    }

    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Payment processing is currently unavailable'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stripe = stripeUtils.stripe;

    // First, try to retrieve the payment method to verify it exists
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (retrieveError) {
      console.error('❌ Error retrieving payment method:', retrieveError);
      if (retrieveError.code === 'resource_missing') {
        return res.status(400).json({ 
          error: 'Payment method not found',
          message: 'The payment method could not be found. Please try adding your card again.'
        });
      }
      throw retrieveError;
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Check if payment method is already attached to a customer
    if (paymentMethod.customer) {
      // If it's attached to a different customer, detach and reattach
      if (paymentMethod.customer !== customerId) {
        await stripe.paymentMethods.detach(paymentMethodId);
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        });
      }
      // If it's already attached to this customer, we're good
    } else {
      // Payment method is not attached, attach it now
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
    }

    // If user has no default payment method, set this as default
    if (!user.defaultPaymentMethodId) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      user.defaultPaymentMethodId = paymentMethodId;
      await user.save();
    }

    // Retrieve the payment method again to get updated details
    const updatedPaymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    res.json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethod: {
        id: updatedPaymentMethod.id,
        type: updatedPaymentMethod.type,
        card: {
          brand: updatedPaymentMethod.card?.brand,
          last4: updatedPaymentMethod.card?.last4,
          expMonth: updatedPaymentMethod.card?.exp_month,
          expYear: updatedPaymentMethod.card?.exp_year
        },
        isDefault: updatedPaymentMethod.id === user.defaultPaymentMethodId
      }
    });
  } catch (error) {
    console.error('❌ Error adding payment method:', error);
    console.error('   Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    
    let errorMessage = 'Failed to add payment method';
    let statusCode = 500;
    
    if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAPIError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Payment method not found. Please try adding your card again.';
        statusCode = 400;
      } else if (error.message?.includes('No such payment_method')) {
        errorMessage = 'Invalid payment method. Please try adding your card again.';
        statusCode = 400;
      } else {
        errorMessage = `Stripe error: ${error.message}`;
      }
    } else {
      errorMessage = error.message || 'Failed to add payment method';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: errorMessage
    });
  }
});

// ─── Refund a payment (within 24 hours, wallet-to-wallet only) ───────────────
router.post('/refund/:paymentId', auth, paymentLimiter, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Only the sender can request a refund
    if (payment.senderId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Only the sender can request a refund' });
    }

    // Only wallet-to-wallet payments are eligible
    if (!['shot_sent', 'transfer'].includes(payment.type)) {
      return res.status(400).json({ message: 'Only wallet payments are eligible for refund' });
    }

    if (payment.status !== 'succeeded' && payment.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed payments can be refunded' });
    }

    // 24-hour window
    const ageHours = (Date.now() - new Date(payment.createdAt).getTime()) / 3600000;
    if (ageHours > 24) {
      return res.status(400).json({ message: 'Refunds are only available within 24 hours of payment' });
    }

    if (payment.refunded) {
      return res.status(400).json({ message: 'This payment has already been refunded' });
    }

    // Atomically deduct from recipient and credit sender
    const recipient = await User.findOneAndUpdate(
      { _id: payment.recipientId, 'wallet.balance': { $gte: payment.amount } },
      { $inc: { 'wallet.balance': -payment.amount } },
      { new: true }
    );
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient has insufficient balance to refund this payment' });
    }

    await User.findByIdAndUpdate(payment.senderId, {
      $inc: { 'wallet.balance': payment.amount }
    });

    payment.refunded = true;
    payment.refundedAt = new Date();
    await payment.save();

    AuditLog.create({
      action: 'payment_refunded',
      actorId: req.user.userId,
      amount: payment.amount,
      ip: req.ip,
      metadata: { paymentId: payment._id, reason: 'user_requested' }
    }).catch(() => {});

    // Notify both parties
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${payment.senderId.toString()}`).emit('wallet-updated', { balance: null });
      io.to(`user-${payment.recipientId.toString()}`).emit('wallet-updated', { balance: null });
    }

    res.json({ success: true, message: `$${payment.amount.toFixed(2)} has been refunded to your wallet` });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Claim pending payments (for existing users) ──────────────────────────────
router.post('/claim-pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('phoneNumber wallet');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.phoneNumber) {
      return res.status(400).json({ message: 'Add a phone number to your profile to claim pending payments' });
    }

    const { normalizePhone } = require('../utils/phone');
    const normalizedPhone = normalizePhone(user.phoneNumber);

    const pending = await PendingPayment.find({ recipientPhone: normalizedPhone, status: 'pending' });
    if (pending.length === 0) {
      return res.json({ claimed: 0, message: 'No pending payments found for your phone number' });
    }

    const totalClaimed = pending.reduce((sum, p) => sum + p.amount, 0);

    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'wallet.balance': totalClaimed }
    });

    await PendingPayment.updateMany(
      { _id: { $in: pending.map(p => p._id) } },
      { $set: { status: 'claimed', claimedAt: new Date(), claimedBy: req.user.userId } }
    );

    AuditLog.create({
      action: 'pending_payments_claimed',
      actorId: req.user.userId,
      amount: totalClaimed,
      ip: req.ip,
      metadata: { count: pending.length, phone: normalizedPhone }
    }).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.userId.toString()}`).emit('wallet-updated', { balance: null });
    }

    res.json({
      success: true,
      claimed: pending.length,
      totalAmount: totalClaimed,
      message: `$${totalClaimed.toFixed(2)} from ${pending.length} payment${pending.length > 1 ? 's' : ''} added to your wallet`
    });
  } catch (error) {
    console.error('Claim pending payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.webhook = webhookHandler;
