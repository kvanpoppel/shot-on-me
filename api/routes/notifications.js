import express from 'express';
import Venue from '../models/Venue.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import twilio from 'twilio';

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

// Send notification to users (venue owners)
router.post('/send', authenticate, [
  body('message').trim().notEmpty(),
  body('type').isIn(['promotion', 'birthday', 'anniversary', 'event', 'general']),
  body('userIds').optional().isArray()
], async (req, res) => {
  try {
    if (req.user.userType !== 'venue' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only venue owners can send notifications' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, type, userIds, venueId } = req.body;

    // Get venue if provided
    let venue = null;
    if (venueId) {
      venue = await Venue.findById(venueId);
      if (!venue || venue.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Venue not found or not owned by you' });
      }
    }

    // Get target users
    let targetUsers = [];
    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds } });
    } else {
      // Send to all users (or implement targeting logic)
      targetUsers = await User.find({ userType: 'user', isActive: true });
    }

    // Send SMS notifications
    const twilioClient = getTwilioClient();
    const results = [];
    
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      for (const user of targetUsers) {
        try {
          const notificationMessage = venue 
            ? `${venue.name}: ${message}`
            : message;

          await twilioClient.messages.create({
            body: notificationMessage,
            to: user.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
          });

          results.push({ userId: user._id, status: 'sent' });
        } catch (error) {
          console.error(`Failed to send SMS to ${user.phoneNumber}:`, error);
          results.push({ userId: user._id, status: 'failed', error: error.message });
        }
      }
    } else {
      console.warn('Twilio not configured. SMS notifications skipped.');
      for (const user of targetUsers) {
        results.push({ userId: user._id, status: 'skipped', reason: 'Twilio not configured' });
      }
    }

    // Emit real-time notification
    const io = req.io;
    io.emit('notification', {
      type,
      message,
      venue: venue ? venue.name : null,
      timestamp: new Date()
    });

    res.json({
      success: true,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Server error sending notifications' });
  }
});

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    // In a full implementation, you'd have a Notification model
    // For now, return recent activity
    res.json({ 
      notifications: [],
      message: 'Notification history coming soon' 
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

export default router;

