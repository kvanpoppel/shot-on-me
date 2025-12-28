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

// Like/Unlike a message
router.post('/:messageId/like', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Verify user is part of conversation
    const isParticipant = message.sender.toString() === userId || message.recipient.toString() === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Toggle like
    if (!message.likedBy) {
      message.likedBy = [];
    }
    
    const likedIndex = message.likedBy.findIndex(id => id.toString() === userId);
    if (likedIndex > -1) {
      message.likedBy.splice(likedIndex, 1);
    } else {
      message.likedBy.push(userId);
    }
    
    await message.save();
    
    res.json({ liked: likedIndex === -1, message });
  } catch (error) {
    console.error('Error liking message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only sender can delete
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    await Message.findByIdAndDelete(messageId);
    
    // Emit socket event
    if (io) {
      io.to(message.recipient.toString()).emit('message-deleted', { messageId });
    }
    
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a message (supports replyTo)
router.post('/send', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { recipientId, content, replyTo } = req.body;
    const senderId = req.user.userId;
    
    console.log('📨 Message send request:', { 
      senderId, 
      recipientId, 
      hasContent: !!content, 
      hasFiles: !!(req.files && req.files.length > 0),
      fileCount: req.files ? req.files.length : 0
    });
    
    if (!recipientId) {
      console.error('❌ Missing recipientId');
      return res.status(400).json({ message: 'Recipient is required' });
    }
    
    // Allow empty content if no media, but at least one must be present
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }
    
    // If only media and no content, set empty string
    const messageContent = content || '';
    
    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Verify replyTo message exists and is in same conversation if provided
    let replyToMessage = null;
    if (replyTo) {
      replyToMessage = await Message.findById(replyTo);
      if (!replyToMessage) {
        return res.status(404).json({ message: 'Reply message not found' });
      }
      // Verify reply is in same conversation
      const conversationId = Message.getConversationId(senderId, recipientId);
      if (replyToMessage.conversationId !== conversationId) {
        return res.status(400).json({ message: 'Reply must be in same conversation' });
      }
    }
    
    // Generate conversation ID
    const conversationId = Message.getConversationId(senderId, recipientId);
    
    // Upload media if present
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('❌ Cloudinary not configured - cannot upload media');
        // If there's no content and Cloudinary isn't configured, we can't send the message
        if (!messageContent.trim()) {
          return res.status(500).json({ 
            message: 'Media upload service not configured. Please configure Cloudinary environment variables or send a text message.',
            error: 'Cloudinary not configured'
          });
        }
        // If there's content, allow the message without media
        console.warn('⚠️ Cloudinary not configured - sending message without media');
      } else {
        // Cloudinary is configured, proceed with uploads
      for (const file of req.files) {
          try {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        const uploadResult = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'shot-on-me/messages',
            },
            (error, result) => {
                  if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    reject(error);
                  } else {
                    console.log('✅ Media uploaded to Cloudinary:', result.secure_url);
                    resolve(result);
            }
                }
              );
              
              if (!file.buffer) {
                reject(new Error('File buffer is empty'));
                return;
              }
              
              uploadStream.end(file.buffer);
        });
        
        mediaUrls.push({
          url: uploadResult.secure_url,
          type: resourceType,
          publicId: uploadResult.public_id
        });
          } catch (uploadError) {
            console.error('❌ Error uploading file:', uploadError);
            return res.status(500).json({ 
              message: 'Failed to upload media file',
              error: uploadError.message 
            });
          }
        }
      }
    }
    
    // Create message - ensure content is not null/undefined
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: messageContent || (mediaUrls.length > 0 ? '📷' : ''),
      media: mediaUrls,
      conversationId,
      read: false,
      replyTo: replyTo || undefined
    });
    
    await message.save();
    await message.populate('sender', 'name firstName lastName profilePicture');
    await message.populate('recipient', 'name firstName lastName profilePicture');
    if (replyToMessage) {
      await message.populate('replyTo', 'content sender');
    }
    
    // Create notification for new message
    const Notification = require('../models/Notification');
    const sender = await User.findById(senderId);
    if (sender) {
      const messagePreview = messageContent ? (messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent) : (mediaUrls.length > 0 ? 'sent you a photo' : 'sent you a message');
      const notification = new Notification({
        recipient: recipientId,
        actor: senderId,
        type: 'message',
        content: `${sender.firstName || sender.name} sent you a message: ${messagePreview}`,
        relatedMessage: message._id
      });
      await notification.save();
    }
    
    // Emit Socket.io event for real-time delivery
    if (io) {
      io.to(recipientId).emit('new-message', {
        message,
        conversationId
      });
      io.to(recipientId).emit('new-notification', {
        type: 'message',
        message: `${sender.firstName || sender.name} sent you a message`,
        messageId: message._id
      });
    }
    
    console.log('✅ Message sent:', message._id);
    res.status(201).json({ message });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while sending message',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

