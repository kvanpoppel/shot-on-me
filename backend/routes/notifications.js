const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    
    const query = { recipient: req.user.userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('actor', 'name firstName lastName profilePicture')
      .populate('relatedPost', 'content media')
      .populate('relatedStory', 'media')
      .populate('relatedVenue', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Transform actor names
    const transformedNotifications = notifications.map(notif => {
      const notifObj = notif.toObject ? notif.toObject() : notif;
      if (notifObj.actor && notifObj.actor.name && !notifObj.actor.firstName) {
        const nameParts = notifObj.actor.name.split(' ');
        notifObj.actor.firstName = nameParts[0] || '';
        notifObj.actor.lastName = nameParts.slice(1).join(' ') || '';
      }
      return notifObj;
    });

    res.json({ notifications: transformedNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      read: false
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await notification.deleteOne();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to create notification (exported for use in other routes)
router.createNotification = async (data) => {
  try {
    const notification = new Notification({
      recipient: data.recipient,
      actor: data.actor,
      type: data.type,
      content: data.content,
      relatedPost: data.relatedPost,
      relatedStory: data.relatedStory,
      relatedMessage: data.relatedMessage,
      relatedVenue: data.relatedVenue
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = router;

