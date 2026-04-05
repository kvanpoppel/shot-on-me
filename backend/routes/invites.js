const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const { sendFriendInviteSMS, isTwilioConfigured } = require('../utils/sms');

// Send SMS invite via Twilio
router.post('/sms', auth, async (req, res) => {
  try {
    const { phoneNumber, inviteLink } = req.body;
    if (!phoneNumber || !inviteLink) {
      return res.status(400).json({ message: 'Phone number and invite link are required' });
    }

    if (!isTwilioConfigured()) {
      return res.status(503).json({ message: 'SMS service not available' });
    }

    const inviter = await User.findById(req.user.userId).select('firstName lastName name');
    if (!inviter) return res.status(404).json({ message: 'User not found' });

    const inviterName = inviter.firstName || inviter.name || 'Someone';
    const sent = await sendFriendInviteSMS(phoneNumber, inviterName, inviteLink);

    if (sent) {
      res.json({ success: true, message: 'Invite sent!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('Error sending invite SMS:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send email invite
router.post('/email', auth, async (req, res) => {
  try {
    const { email, inviteLink } = req.body;
    const inviterId = req.user.userId;

    if (!email || !inviteLink) {
      return res.status(400).json({ message: 'Email and invite link are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Get inviter info
    const inviter = await User.findById(inviterId).select('firstName lastName name email');
    if (!inviter) {
      return res.status(404).json({ message: 'User not found' });
    }

    const inviterName = inviter.firstName || inviter.name || 'Someone';

    const result = await emailService.sendInviteEmail(email, inviterName, inviteLink);

    if (result.success) {
      res.json({
        success: true,
        message: 'Invite email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send invite email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending invite email:', error);
    res.status(500).json({ message: 'Server error'});
  }
});

// Diagnostic: test Twilio by sending a real SMS to a given number
// POST /invites/test-sms  { "to": "+12223334444" }
router.post('/test-sms', auth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Provide a "to" phone number' });

    const { isTwilioConfigured } = require('../utils/sms');
    const configured = isTwilioConfigured();

    if (!configured) {
      return res.json({
        configured: false,
        sid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...',
        phone: process.env.TWILIO_PHONE_NUMBER,
        error: 'Twilio client failed to initialize — check SID/token format'
      });
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const result = await client.messages.create({
      body: 'Shot On Me test message — Twilio is working ✅',
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    res.json({ success: true, sid: result.sid, status: result.status, to: result.to });
  } catch (error) {
    res.status(500).json({
      success: false,
      errorCode: error.code,
      errorMessage: error.message,
      moreInfo: error.moreInfo
    });
  }
});

module.exports = router;

