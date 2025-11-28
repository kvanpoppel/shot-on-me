const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get Socket.io instance (will be set by server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// Get all conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { recipient: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate sender and recipient info
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const message = await Message.findById(conv.lastMessage._id)
          .populate('sender', 'name firstName lastName profilePicture')
          .populate('recipient', 'name firstName lastName profilePicture');
        
        // Get the other user in the conversation
        const otherUser = message.sender._id.toString() === userId 
          ? message.recipient 
          : message.sender;
        
        return {
          conversationId: conv._id,
          otherUser: {
            id: otherUser._id,
            _id: otherUser._id,
            name: otherUser.name,
            firstName: otherUser.firstName || otherUser.name?.split(' ')[0] || '',
            lastName: otherUser.lastName || otherUser.name?.split(' ').slice(1).join(' ') || '',
            profilePicture: otherUser.profilePicture
          },
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.sender._id.toString()
          },
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json({ conversations: populatedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    
    // Verify user is part of this conversation
    const message = await Message.findOne({ conversationId });
    if (!message) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const isParticipant = message.sender.toString() === userId || message.recipient.toString() === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Get all messages in conversation
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name firstName lastName profilePicture')
      .populate('recipient', 'name firstName lastName profilePicture')
      .sort({ createdAt: 1 })
      .limit(100);
    
    // Mark messages as read
    await Message.updateMany(
      { conversationId, recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a message
router.post('/send', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.userId;
    
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient is required' });
    }
    
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }
    
    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Generate conversation ID
    const conversationId = Message.getConversationId(senderId, recipientId);
    
    // Upload media if present
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'shot-on-me/messages',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });
        
        mediaUrls.push({
          url: uploadResult.secure_url,
          type: resourceType,
          publicId: uploadResult.public_id
        });
      }
    }
    
    // Create message
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: content || '',
      media: mediaUrls,
      conversationId,
      read: false
    });
    
    await message.save();
    await message.populate('sender', 'name firstName lastName profilePicture');
    await message.populate('recipient', 'name firstName lastName profilePicture');
    
    // Emit Socket.io event for real-time delivery
    if (io) {
      io.to(recipientId).emit('new-message', {
        message,
        conversationId
      });
      io.emit('message-sent', {
        message,
        conversationId
      });
    }
    
    console.log('✅ Message sent:', message._id);
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Message.countDocuments({
      recipient: userId,
      read: false
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
router.put('/read/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    
    await Message.updateMany(
      { conversationId, recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

