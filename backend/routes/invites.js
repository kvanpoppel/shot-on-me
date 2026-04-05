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

module.exports = router;

