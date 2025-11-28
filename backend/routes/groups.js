const express = require('express');
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user.userId,
      isPrivate: isPrivate || false,
      members: [{
        user: req.user.userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    if (isPrivate) {
      group.generateInviteCode();
    }

    await group.save();
    await group.populate('creator', 'name firstName lastName profilePicture');
    await group.populate('members.user', 'name firstName lastName profilePicture');

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all groups user is a member of
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.userId
    })
    .populate('creator', 'name firstName lastName profilePicture')
    .populate('members.user', 'name firstName lastName profilePicture')
    .sort({ updatedAt: -1 });

    // Get last message for each group
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await GroupMessage.findOne({ group: group._id })
          .populate('sender', 'name firstName lastName profilePicture')
          .sort({ createdAt: -1 })
          .limit(1);

        const groupObj = group.toObject();
        
        // Transform names
        if (groupObj.creator && groupObj.creator.name && !groupObj.creator.firstName) {
          const nameParts = groupObj.creator.name.split(' ');
          groupObj.creator.firstName = nameParts[0] || '';
          groupObj.creator.lastName = nameParts.slice(1).join(' ') || '';
        }

        return {
          ...groupObj,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            sender: lastMessage.sender,
            createdAt: lastMessage.createdAt
          } : null,
          memberCount: group.members.length
        };
      })
    );

    res.json({ groups: groupsWithLastMessage });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('creator', 'name firstName lastName profilePicture')
      .populate('members.user', 'name firstName lastName profilePicture');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.user._id.toString() === req.user.userId || m.user.toString() === req.user.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a group by invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if already a member
    const isMember = group.members.some(
      m => m.user.toString() === req.user.userId
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    group.members.push({
      user: req.user.userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();
    await group.populate('members.user', 'name firstName lastName profilePicture');

    res.json({
      message: 'Joined group successfully',
      group
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a group
router.post('/:groupId/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Can't leave if you're the creator and only member
    if (group.creator.toString() === req.user.userId && group.members.length === 1) {
      return res.status(400).json({ message: 'Cannot leave group as the only member. Delete the group instead.' });
    }

    group.members = group.members.filter(
      m => m.user.toString() !== req.user.userId
    );

    await group.save();

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group messages
router.get('/:groupId/messages', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.user.toString() === req.user.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await GroupMessage.find({ group: req.params.groupId })
      .populate('sender', 'name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .reverse(); // Reverse to show oldest first

    // Transform sender names
    const transformedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.sender && msgObj.sender.name && !msgObj.sender.firstName) {
        const nameParts = msgObj.sender.name.split(' ');
        msgObj.sender.firstName = nameParts[0] || '';
        msgObj.sender.lastName = nameParts.slice(1).join(' ') || '';
      }
      return msgObj;
    });

    res.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to group
router.post('/:groupId/messages', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { content } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.user.toString() === req.user.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Message content or media is required' });
    }

    const mediaUrls = [];

    // Upload media files to Cloudinary if present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'shot-on-me/group-messages',
              timeout: 120000
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

    const message = new GroupMessage({
      group: req.params.groupId,
      sender: req.user.userId,
      content: content?.trim() || '',
      media: mediaUrls
    });

    await message.save();
    await message.populate('sender', 'name firstName lastName profilePicture');

    // Transform sender name
    const messageObj = message.toObject();
    if (messageObj.sender && messageObj.sender.name && !messageObj.sender.firstName) {
      const nameParts = messageObj.sender.name.split(' ');
      messageObj.sender.firstName = nameParts[0] || '';
      messageObj.sender.lastName = nameParts.slice(1).join(' ') || '';
    }

    res.status(201).json({
      message: 'Message sent successfully',
      message: messageObj
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

