const express = require('express');
const FeedPost = require('../models/FeedPost');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const notificationsRouter = require('./notifications');

const router = express.Router();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  console.warn('⚠️ Cloudinary environment variables not set. Media uploads will fail.');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Get feed posts
router.get('/', auth, async (req, res) => {
  try {
    const posts = await FeedPost.find()
      .populate('author', 'name firstName lastName profilePicture')
      .populate('comments.user', 'name firstName lastName profilePicture')
      .populate('likes.user', 'name firstName lastName profilePicture')
      .populate('reactions.user', 'name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Transform posts to include firstName/lastName from name if needed
    const transformedPosts = posts.map(post => {
      const postObj = post.toObject ? post.toObject() : post;
      const author = postObj.author;
      
      if (author && author.name && !author.firstName) {
        const nameParts = author.name.split(' ');
        author.firstName = nameParts[0] || '';
        author.lastName = nameParts.slice(1).join(' ') || '';
      }
      
      // Transform comments
      if (postObj.comments) {
        postObj.comments = postObj.comments.map((comment) => {
          if (comment.user && comment.user.name && !comment.user.firstName) {
            const nameParts = comment.user.name.split(' ');
            comment.user.firstName = nameParts[0] || '';
            comment.user.lastName = nameParts.slice(1).join(' ') || '';
          }
          return comment;
        });
      }
      
      // Calculate reaction counts by emoji
      const reactionCounts = {};
      let userReaction = null;
      if (postObj.reactions) {
        postObj.reactions.forEach((reaction) => {
          if (!reactionCounts[reaction.emoji]) {
            reactionCounts[reaction.emoji] = { count: 0, users: [] };
          }
          reactionCounts[reaction.emoji].count++;
          reactionCounts[reaction.emoji].users.push(reaction.user);
          
          // Check if current user reacted
          if (reaction.user && (reaction.user._id?.toString() === req.user.userId || reaction.user.toString() === req.user.userId)) {
            userReaction = reaction.emoji;
          }
        });
      }
      
      // Backward compatibility: migrate likes to reactions if no reactions exist
      if ((!postObj.reactions || postObj.reactions.length === 0) && postObj.likes && postObj.likes.length > 0) {
        postObj.likes.forEach((like) => {
          if (!reactionCounts['❤️']) {
            reactionCounts['❤️'] = { count: 0, users: [] };
          }
          reactionCounts['❤️'].count++;
          if (like.user && (like.user._id?.toString() === req.user.userId || like.user.toString() === req.user.userId)) {
            userReaction = '❤️';
          }
        });
      }
      
      return { 
        ...postObj, 
        author,
        reactionCounts,
        userReaction,
        totalReactions: Object.values(reactionCounts).reduce((sum, r) => sum + r.count, 0)
      };
    });
    
    res.json({ posts: transformedPosts });
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new post
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    console.log('📝 Creating new post...');
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Content:', req.body.content);
    
    const { content, location } = req.body;
    const mediaUrls = [];

    // Upload media files to Cloudinary if present
    if (req.files && req.files.length > 0) {
      console.log(`📤 Uploading ${req.files.length} file(s) to Cloudinary...`);
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`Uploading file ${i + 1}/${req.files.length}: ${file.originalname} (${file.mimetype}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                resource_type: resourceType,
                folder: 'shot-on-me/feed',
                timeout: 120000 // 2 minute timeout for large files
              },
              (error, result) => {
                if (error) {
                  console.error(`❌ Cloudinary upload error for ${file.originalname}:`, error);
                  reject(error);
                } else {
                  console.log(`✅ Uploaded ${file.originalname} to Cloudinary`);
                  resolve(result);
                }
              }
            ).end(file.buffer);
          });

          mediaUrls.push({
            url: uploadResult.secure_url,
            type: resourceType,
            publicId: uploadResult.public_id
          });
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.originalname}:`, uploadError);
          // Continue with other files even if one fails
          if (req.files.length === 1) {
            throw new Error(`Failed to upload file: ${uploadError.message}`);
          }
        }
      }
      
      console.log(`✅ Successfully uploaded ${mediaUrls.length} file(s)`);
    }

    const newPost = new FeedPost({
      author: req.user.userId,
      content: content || '',
      media: mediaUrls,
      location: location ? (typeof location === 'string' ? JSON.parse(location) : location) : null
    });

    await newPost.save();
    await newPost.populate('author', 'name firstName lastName profilePicture');
    
    console.log('✅ Post created successfully:', newPost._id);
    
    res.status(201).json({
      posts: [newPost], // Match frontend expectation
      post: newPost
    });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error messages
    let errorMessage = 'Server error';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response) {
      errorMessage = error.response.data?.message || 'Upload failed';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Like a post (backward compatibility - converts to ❤️ reaction)
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already reacted with ❤️
    const existingReaction = post.reactions.find(
      r => r.user.toString() === req.user.userId && r.emoji === '❤️'
    );

    if (existingReaction) {
      // Remove reaction
      post.reactions = post.reactions.filter(
        r => !(r.user.toString() === req.user.userId && r.emoji === '❤️')
      );
    } else {
      // Add ❤️ reaction
      // Remove any existing reaction from this user first
      post.reactions = post.reactions.filter(
        r => r.user.toString() !== req.user.userId
      );
      post.reactions.push({
        user: req.user.userId,
        emoji: '❤️',
        createdAt: new Date()
      });
    }

    await post.save();
    await post.populate('author', 'name firstName lastName profilePicture');
    await post.populate('reactions.user', 'name firstName lastName profilePicture');
    
    res.json({ 
      message: existingReaction ? 'Post unliked' : 'Post liked',
      post 
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove emoji reaction to a post
router.post('/:postId/reaction', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji = '❤️' } = req.body;
    
    const validEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji reaction' });
    }

    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = post.reactions.find(
      r => r.user.toString() === req.user.userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction (toggle off)
      post.reactions = post.reactions.filter(
        r => !(r.user.toString() === req.user.userId && r.emoji === emoji)
      );
    } else {
      // Remove any existing reaction from this user (one reaction per user)
      post.reactions = post.reactions.filter(
        r => r.user.toString() !== req.user.userId
      );
      // Add new reaction
      post.reactions.push({
        user: req.user.userId,
        emoji: emoji,
        createdAt: new Date()
      });
    }

    await post.save();
    await post.populate('reactions.user', 'name firstName lastName profilePicture');
    await post.populate('author', 'name firstName lastName');
    
    // Create notification if reaction was added (not removed) and user is not the post author
    if (!existingReaction && post.author._id.toString() !== req.user.userId.toString()) {
      const actor = await require('../models/User').findById(req.user.userId);
      if (actor) {
        await notificationsRouter.createNotification({
          recipient: post.author._id,
          actor: req.user.userId,
          type: 'reaction',
          content: `${actor.firstName || actor.name} reacted ${emoji} to your post`,
          relatedPost: post._id
        });
      }
    }
    
    // Group reactions by emoji
    const reactionCounts = {};
    post.reactions.forEach(r => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, users: [] };
      }
      reactionCounts[r.emoji].count++;
      reactionCounts[r.emoji].users.push(r.user);
    });

    res.json({ 
      message: existingReaction ? 'Reaction removed' : 'Reaction added',
      reactionCounts,
      userReaction: existingReaction ? null : emoji,
      post 
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Comment on a post
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add comment
    post.comments.push({
      user: req.user.userId,
      content: content.trim(),
      createdAt: new Date()
    });

    await post.save();
    await post.populate('author', 'name firstName lastName profilePicture');
    await post.populate('comments.user', 'name firstName lastName profilePicture');
    
    // Create notification if user is not the post author
    if (post.author._id.toString() !== req.user.userId.toString()) {
      const actor = await require('../models/User').findById(req.user.userId);
      if (actor) {
        await notificationsRouter.createNotification({
          recipient: post.author._id,
          actor: req.user.userId,
          type: 'comment',
          content: `${actor.firstName || actor.name} commented on your post: "${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}"`,
          relatedPost: post._id
        });
      }
    }
    
    // Get the last comment (the one we just added)
    const newComment = post.comments[post.comments.length - 1];
    
    res.json({ 
      message: 'Comment added',
      comment: newComment,
      post 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
