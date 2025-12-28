const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const emailService = require('../utils/emailService');

// Send email invite
router.post('/email', auth, async (req, res) => {
  try {
    const { email, inviteLink, referralCode } = req.body;
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

    // Send email
    const result = await emailService.sendInviteEmail(
      email,
      inviterName,
      inviteLink,
      referralCode
    );

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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

