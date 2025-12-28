const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
};

// Check for placeholder values
const hasPlaceholders = 
  cloudinaryConfig.api_key === 'your_api_key' ||
  cloudinaryConfig.api_key === 'YOUR_API_KEY' ||
  cloudinaryConfig.cloud_name === 'your_cloud_name' ||
  cloudinaryConfig.cloud_name === 'YOUR_CLOUD_NAME' ||
  cloudinaryConfig.api_secret === 'your_api_secret' ||
  cloudinaryConfig.api_secret === 'YOUR_API_SECRET';

if (cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret && !hasPlaceholders) {
  cloudinary.config(cloudinaryConfig);
  console.log('✅ Cloudinary configured successfully');
} else {
  if (hasPlaceholders) {
    console.error('❌ Cloudinary has placeholder values. Please set real API credentials in .env file.');
  } else {
    console.warn('⚠️ Cloudinary environment variables not set. Story uploads will fail.');
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
});

// Create a new story
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Media file is required' });
    }

    // Check if Cloudinary is configured
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Cloudinary not configured');
      return res.status(500).json({ 
        message: 'Image upload service is not configured. Please contact support.',
        error: 'Cloudinary configuration missing'
      });
    }
    
    // Check for placeholder values
    if (apiKey === 'your_api_key' || apiKey === 'YOUR_API_KEY' || 
        cloudName === 'your_cloud_name' || cloudName === 'YOUR_CLOUD_NAME' ||
        apiSecret === 'your_api_secret' || apiSecret === 'YOUR_API_SECRET') {
      console.error('❌ Cloudinary has placeholder values');
      return res.status(500).json({ 
        message: 'Cloudinary API credentials are not set. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file with real values from your Cloudinary account.',
        error: 'Cloudinary placeholder values detected'
      });
    }

    const { caption, mediaType } = req.body;
    const file = req.file;
    
    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return res.status(400).json({ 
        message: 'File is too large. Maximum size is 100MB.' 
      });
    }
    
    // Determine media type from file or request
    const resourceType = mediaType === 'video' || file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    console.log(`📸 Creating story: ${file.originalname} (${resourceType}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'shot-on-me/stories',
          timeout: 120000 // 2 minute timeout for large files
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Story uploaded to Cloudinary:', result.secure_url);
            resolve(result);
          }
        }
      ).end(file.buffer);
    });

    // Create story with 24-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = new Story({
      author: req.user.userId,
      media: {
        url: uploadResult.secure_url,
        type: resourceType,
        publicId: uploadResult.public_id
      },
      caption: caption || '',
      expiresAt: expiresAt
    });

    await story.save();
    await story.populate('author', 'name firstName lastName profilePicture');

    // Transform author name
    const storyObj = story.toObject();
    if (storyObj.author && storyObj.author.name && !storyObj.author.firstName) {
      const nameParts = storyObj.author.name.split(' ');
      storyObj.author.firstName = nameParts[0] || '';
      storyObj.author.lastName = nameParts.slice(1).join(' ') || '';
    }

    console.log('✅ Story created successfully');

    res.status(201).json({
      message: 'Story created successfully',
      story: storyObj
    });
  } catch (error) {
    console.error('❌ Error creating story:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to create story';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response) {
      errorMessage = error.response.data?.message || 'Upload failed';
    }
    
    // Check for Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      errorMessage = 'Cloudinary is not configured. Please contact support.';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all active stories from friends and self
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friends');
    
    // Get friend IDs including self
    const friendIds = [req.user.userId, ...(user.friends || []).map(f => f._id || f)];
    
    // Get active stories (not expired) from friends
    const now = new Date();
    const stories = await Story.find({
      author: { $in: friendIds },
      expiresAt: { $gt: now },
      isActive: true
    })
    .populate('author', 'name firstName lastName profilePicture')
    .sort({ createdAt: -1 });

    // Group stories by author
    const storiesByAuthor = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!storiesByAuthor[authorId]) {
        const author = story.author.toObject ? story.author.toObject() : story.author;
        if (author.name && !author.firstName) {
          const nameParts = author.name.split(' ');
          author.firstName = nameParts[0] || '';
          author.lastName = nameParts.slice(1).join(' ') || '';
        }
        storiesByAuthor[authorId] = {
          author,
          stories: []
        };
      }
      
      const storyObj = story.toObject();
      storyObj.viewCount = story.views.length;
      storyObj.hasViewed = story.hasViewed(req.user.userId);
      storyObj.reactionCount = story.reactions.length;
      
      storiesByAuthor[authorId].stories.push(storyObj);
    });

    // Convert to array and sort by most recent story
    const storiesArray = Object.values(storiesByAuthor).sort((a, b) => {
      const aLatest = a.stories[0]?.createdAt || new Date(0);
      const bLatest = b.stories[0]?.createdAt || new Date(0);
      return bLatest - aLatest;
    });

    res.json({ stories: storiesArray });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's active stories
router.get('/me', auth, async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({
      author: req.user.userId,
      expiresAt: { $gt: now },
      isActive: true
    })
    .populate('views.user', 'name firstName lastName profilePicture')
    .populate('reactions.user', 'name firstName lastName profilePicture')
    .sort({ createdAt: -1 });

    const storiesArray = stories.map(story => {
      const storyObj = story.toObject();
      storyObj.viewCount = story.views.length;
      storyObj.reactionCount = story.reactions.length;
      return storyObj;
    });

    res.json({ stories: storiesArray });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific story
router.get('/:storyId', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('author', 'name firstName lastName profilePicture')
      .populate('views.user', 'name firstName lastName profilePicture')
      .populate('reactions.user', 'name firstName lastName profilePicture');

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.isExpired()) {
      return res.status(410).json({ message: 'Story has expired' });
    }

    const storyObj = story.toObject();
    
    // Transform author name
    if (storyObj.author && storyObj.author.name && !storyObj.author.firstName) {
      const nameParts = storyObj.author.name.split(' ');
      storyObj.author.firstName = nameParts[0] || '';
      storyObj.author.lastName = nameParts.slice(1).join(' ') || '';
    }

    storyObj.viewCount = story.views.length;
    storyObj.hasViewed = story.hasViewed(req.user.userId);
    storyObj.reactionCount = story.reactions.length;

    res.json({ story: storyObj });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark story as viewed
router.post('/:storyId/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.isExpired()) {
      return res.status(410).json({ message: 'Story has expired' });
    }

    const wasNewView = story.addView(req.user.userId);
    await story.save();

    res.json({ 
      message: 'Story viewed',
      wasNewView,
      viewCount: story.views.length
    });
  } catch (error) {
    console.error('Error marking story as viewed:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add reaction to story
router.post('/:storyId/reaction', auth, async (req, res) => {
  try {
    const { emoji = '❤️' } = req.body;
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.isExpired()) {
      return res.status(410).json({ message: 'Story has expired' });
    }

    // Remove existing reaction from this user
    story.reactions = story.reactions.filter(
      r => r.user.toString() !== req.user.userId.toString()
    );

    // Add new reaction
    story.reactions.push({
      user: req.user.userId,
      emoji: emoji
    });

    await story.save();
    await story.populate('reactions.user', 'name firstName lastName profilePicture');
    await story.populate('author', 'name firstName lastName profilePicture');
    
    // Create notification if reacting to someone else's story
    if (story.author._id.toString() !== req.user.userId.toString()) {
      const Notification = require('../models/Notification');
      const actor = await User.findById(req.user.userId);
      if (actor) {
        const notification = new Notification({
          recipient: story.author._id,
          actor: req.user.userId,
          type: 'story_reaction',
          content: `${actor.firstName || actor.name} reacted ❤️ to your story`,
          relatedStory: story._id
        });
        await notification.save();
        
        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(story.author._id.toString()).emit('new-notification', {
            type: 'story_reaction',
            message: notification.content,
            storyId: story._id
          });
        }
      }
    }

    res.json({ 
      message: 'Reaction added',
      reactionCount: story.reactions.length,
      reactions: story.reactions
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete own story
router.delete('/:storyId', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.author.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(story.media.publicId, {
        resource_type: story.media.type === 'video' ? 'video' : 'image'
      });
      console.log('✅ Story media deleted from Cloudinary');
    } catch (cloudinaryError) {
      console.error('⚠️ Failed to delete from Cloudinary:', cloudinaryError);
      // Continue with deletion even if Cloudinary deletion fails
    }

    await story.deleteOne();

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

