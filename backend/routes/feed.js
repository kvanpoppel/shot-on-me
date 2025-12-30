const express = require('express');
const FeedPost = require('../models/FeedPost');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const notificationsRouter = require('./notifications');

const router = express.Router();

// Get Socket.io instance (will be set by server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

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

// Get feed posts - show posts from friends and user's own posts
router.get('/', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const currentUser = await User.findById(req.user.userId).select('friends');
    
    // Build query: show posts from friends OR user's own posts
    // If user has no friends, show all posts (for discovery)
    const friendIds = currentUser?.friends || [];
    const query = friendIds.length > 0 
      ? { author: { $in: [...friendIds, req.user.userId] } }
      : {}; // Show all posts if no friends (for new users)
    
    const posts = await FeedPost.find(query)
      .populate('author', 'name firstName lastName profilePicture')
      .populate('comments.user', 'name firstName lastName profilePicture')
      .populate('comments.reactions.user', 'name firstName lastName profilePicture')
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
      
      // Transform comments and organize replies
      if (postObj.comments) {
        // First, transform all comments
        const transformedComments = postObj.comments.map((comment) => {
          if (comment.user && comment.user.name && !comment.user.firstName) {
            const nameParts = comment.user.name.split(' ');
            comment.user.firstName = nameParts[0] || '';
            comment.user.lastName = nameParts.slice(1).join(' ') || '';
          }
          return comment;
        });
        
        // Organize comments with replies
        const topLevelComments = transformedComments.filter(c => !c.replyTo);
        const commentsWithReplies = topLevelComments.map(comment => {
          const replies = transformedComments.filter(c => 
            c.replyTo && (c.replyTo.toString() === comment._id.toString() || c.replyTo._id?.toString() === comment._id.toString())
          );
          return {
            ...comment,
            replies: replies
          };
        });
        
        postObj.comments = commentsWithReplies;
      }
      
      // Calculate reaction counts by emoji and track all user reactions
      const reactionCounts = {};
      const userReactions = []; // Array to support multiple reactions per user
      if (postObj.reactions) {
        postObj.reactions.forEach((reaction) => {
          if (!reactionCounts[reaction.emoji]) {
            reactionCounts[reaction.emoji] = { count: 0, users: [] };
          }
          reactionCounts[reaction.emoji].count++;
          reactionCounts[reaction.emoji].users.push(reaction.user);
          
          // Track all reactions from current user (support multiple reactions)
          if (reaction.user && (reaction.user._id?.toString() === req.user.userId || reaction.user.toString() === req.user.userId)) {
            if (!userReactions.includes(reaction.emoji)) {
              userReactions.push(reaction.emoji);
            }
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
          reactionCounts['❤️'].users.push(like.user);
          if (like.user && (like.user._id?.toString() === req.user.userId || like.user.toString() === req.user.userId)) {
            if (!userReactions.includes('❤️')) {
              userReactions.push('❤️');
            }
          }
        });
      }
      
      return { 
        ...postObj, 
        author,
        reactionCounts,
        userReactions, // Array of all emojis user has reacted with
        userReaction: userReactions.length > 0 ? userReactions[0] : null, // First reaction for backward compatibility
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
    
    const { content, location, venueId, checkIn } = req.body;
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

    // Handle check-in location
    let postLocation = location ? (typeof location === 'string' ? JSON.parse(location) : location) : null;
    let checkInData = null;
    
    if (checkIn && venueId) {
      const Venue = require('../models/Venue');
      const venue = await Venue.findById(venueId);
      if (venue) {
        checkInData = {
          venue: venue._id,
          checkedInAt: new Date()
        };
        if (!postLocation) {
          postLocation = {
            venue: {
              _id: venue._id,
              name: venue.name
            }
          };
        }
      }
    }

    const newPost = new FeedPost({
      author: req.user.userId,
      content: content || '',
      media: mediaUrls,
      location: postLocation,
      checkIn: checkInData
    });

    await newPost.save();
    await newPost.populate('author', 'name firstName lastName profilePicture');
    
    // Update user stats (async, don't wait)
    const { updateUserStats, awardPoints } = require('../utils/gamification');
    updateUserStats(req.user.userId, { postsCount: 1 }).catch(err => console.error('Gamification error:', err));
    awardPoints(req.user.userId, 5, 'post_created').catch(err => console.error('Gamification error:', err));
    
      // Notify all friends when user posts
    const author = await require('../models/User').findById(req.user.userId);
    if (author && author.friends && author.friends.length > 0) {
      const Notification = require('../models/Notification');
      const socketIO = io || req.app.get('io');
      
      const postPreview = content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'a new post';
      
      // Create notifications for all friends
      const notificationPromises = author.friends.map(async (friendId) => {
        const notification = new Notification({
          recipient: friendId,
          actor: req.user.userId,
          type: 'friend_post',
          content: `${author.firstName || author.name} posted: ${postPreview}`,
          relatedPost: newPost._id
        });
        await notification.save();
        
        // Emit real-time notification
        if (socketIO) {
          socketIO.to(friendId.toString()).emit('new-notification', {
            type: 'friend_post',
            message: notification.content,
            postId: newPost._id
          });
        }
      });
      
      await Promise.all(notificationPromises);
      console.log(`📬 Notified ${author.friends.length} friends about new post`);
    }
    
    // Auto-create story for check-in posts
    if (checkIn && venueId) {
      try {
        const Story = require('../models/Story');
        const cloudinary = require('cloudinary').v2;
        const Venue = require('../models/Venue');
        const venue = await Venue.findById(venueId);
        
        if (venue && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
          });

          // Use first media from post if available, otherwise use venue image or default
          let storyMediaUrl = mediaUrls.length > 0 ? mediaUrls[0].url : (venue.image || venue.images?.[0]);
          let storyPublicId = `shot-on-me/stories/checkin_${newPost._id}`;
          let mediaType = mediaUrls.length > 0 ? mediaUrls[0].type : 'image';

          // If no media, create or use default check-in image
          if (!storyMediaUrl) {
            // Use a simple placeholder or create default image
            storyMediaUrl = `https://via.placeholder.com/1080x1920/1a1a2e/FFD700?text=${encodeURIComponent(venue.name + ' Check-In')}`;
          } else if (!storyMediaUrl.includes('cloudinary.com') && !storyMediaUrl.includes('res.cloudinary.com')) {
            // Upload to Cloudinary if not already there
            try {
              const uploadResult = await cloudinary.uploader.upload(storyMediaUrl, {
                folder: 'shot-on-me/stories',
                public_id: storyPublicId,
                resource_type: mediaType
              });
              storyMediaUrl = uploadResult.secure_url;
              storyPublicId = uploadResult.public_id;
            } catch (uploadError) {
              console.warn('⚠️ Could not upload story media, using original URL:', uploadError);
            }
          }

          // Create story with 24-hour expiration
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          const story = new Story({
            author: req.user.userId,
            media: {
              url: storyMediaUrl,
              type: mediaType,
              publicId: storyPublicId
            },
            caption: content || `Checked in at ${venue.name} 🍻`,
            expiresAt: expiresAt
          });

          await story.save();
          console.log(`✅ Auto-created story for check-in at ${venue.name}`);
        }
      } catch (storyError) {
        // Don't fail post creation if story creation fails
        console.error('⚠️ Failed to auto-create story for check-in:', storyError);
      }
    }

    // Emit new post to all connected clients
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('new-post', { post: newPost });
    }
    
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
    
    // Emit real-time update to all connected clients
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      // Group reactions by emoji for frontend
      const reactionCounts = {};
      post.reactions.forEach(r => {
        if (!reactionCounts[r.emoji]) {
          reactionCounts[r.emoji] = { count: 0, users: [] };
        }
        reactionCounts[r.emoji].count++;
        reactionCounts[r.emoji].users.push(r.user);
      });
      
      socketIO.emit('post-reaction-updated', {
        postId: post._id,
        reactionCounts,
        userReaction: existingReaction ? null : '❤️',
        totalReactions: post.reactions.length
      });
    }
    
    res.json({ 
      message: existingReaction ? 'Post unliked' : 'Post liked',
      post 
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove emoji reaction to a post (using atomic operation to prevent race conditions)
router.post('/:postId/reaction', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji = '❤️' } = req.body;
    
    const validEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji reaction' });
    }

    // Check if post exists and get current reaction state
    const postCheck = await FeedPost.findById(postId);
    if (!postCheck) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already reacted with this emoji (for toggle behavior)
    const existingReaction = postCheck.reactions.find(
      r => r.user.toString() === req.user.userId && r.emoji === emoji
    );

    // Use atomic operation to prevent race conditions
    // Allow multiple reactions from same user - only toggle if same emoji
    let post;
    if (existingReaction) {
      // Remove this specific reaction (toggle off) - atomic operation
      post = await FeedPost.findByIdAndUpdate(
        postId,
        { $pull: { reactions: { user: req.user.userId, emoji: emoji } } },
        { new: true }
      );
    } else {
      // Add new reaction - allow multiple reactions from same user - atomic operation
      post = await FeedPost.findByIdAndUpdate(
        postId,
        { 
          $push: { reactions: { user: req.user.userId, emoji: emoji, createdAt: new Date() } }
        },
        { new: true }
      );
    }

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    await post.populate('reactions.user', 'name firstName lastName profilePicture');
    await post.populate('author', 'name firstName lastName');
    
    // Create notification if reaction was added (not removed) and user is not the post author
    if (!existingReaction && post.author._id.toString() !== req.user.userId.toString()) {
      const Notification = require('../models/Notification');
      const actor = await require('../models/User').findById(req.user.userId);
      if (actor) {
        const notification = new Notification({
          recipient: post.author._id,
          actor: req.user.userId,
          type: 'reaction',
          content: `${actor.firstName || actor.name} reacted ${emoji} to your post`,
          relatedPost: post._id
        });
        await notification.save();
        
        // Emit real-time notification
        const socketIO = io || req.app.get('io');
        if (socketIO) {
          socketIO.to(post.author._id.toString()).emit('new-notification', {
            notification: notification,
            message: notification.content,
            postId: post._id
          });
        }
      }
    }
    
    // Group reactions by emoji and track all user reactions
    const reactionCounts = {};
    const userReactions = [];
    post.reactions.forEach(r => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, users: [] };
      }
      reactionCounts[r.emoji].count++;
      reactionCounts[r.emoji].users.push(r.user);
      
      // Track all reactions from current user
      if (r.user && (r.user._id?.toString() === req.user.userId || r.user.toString() === req.user.userId)) {
        if (!userReactions.includes(r.emoji)) {
          userReactions.push(r.emoji);
        }
      }
    });

    // Emit real-time update to all connected clients
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('post-reaction-updated', {
        postId: post._id,
        reactionCounts,
        userReactions, // Array of all user reactions
        userReaction: userReactions.length > 0 ? userReactions[0] : null, // First for backward compatibility
        totalReactions: post.reactions.length
      });
    }

    res.json({ 
      message: existingReaction ? 'Reaction removed' : 'Reaction added',
      reactionCounts,
      userReactions, // Return all user reactions
      userReaction: userReactions.length > 0 ? userReactions[0] : null, // First for backward compatibility
      post 
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Comment on a post (supports nested replies)
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, replyTo } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Validate replyTo if provided
    if (replyTo) {
      const parentComment = post.comments.id(replyTo);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }

    // Add comment (with optional replyTo)
    post.comments.push({
      user: req.user.userId,
      content: content.trim(),
      replyTo: replyTo || null,
      createdAt: new Date()
    });

    await post.save();
    await post.populate('author', 'name firstName lastName profilePicture');
    await post.populate('comments.user', 'name firstName lastName profilePicture');
    await post.populate('comments.reactions.user', 'name firstName lastName profilePicture');
    
    // Get the last comment (the one we just added)
    const newComment = post.comments[post.comments.length - 1];
    
    // Emit real-time update to all connected clients
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('post-comment-added', {
        postId: post._id,
        comment: newComment,
        totalComments: post.comments.length
      });
    }
    
    // Create notification if commenting on someone else's post
    if (post.author._id.toString() !== req.user.userId.toString()) {
      const Notification = require('../models/Notification');
      const actor = await require('../models/User').findById(req.user.userId);
      if (actor) {
        const commentPreview = content.trim().length > 50 ? content.trim().substring(0, 50) + '...' : content.trim();
        const notification = new Notification({
          recipient: post.author._id,
          actor: req.user.userId,
          type: 'comment',
          content: `${actor.firstName || actor.name} commented: "${commentPreview}"`,
          relatedPost: post._id
        });
        await notification.save();
        
        // Emit real-time notification
        const socketIO = io || req.app.get('io');
        if (socketIO) {
          socketIO.to(post.author._id.toString()).emit('new-notification', {
            notification: notification,
            message: notification.content,
            postId: post._id
          });
        }
      }
    }
    
    // Notify other commenters on the same post (if they're not the author or current commenter)
    const Notification = require('../models/Notification');
    const commenterIds = new Set();
    post.comments.forEach(comment => {
      const commenterId = comment.user._id?.toString() || comment.user.toString();
      if (commenterId !== req.user.userId.toString() && 
          commenterId !== post.author._id.toString()) {
        commenterIds.add(commenterId);
      }
    });
    
    if (commenterIds.size > 0) {
      const actor = await require('../models/User').findById(req.user.userId);
      const socketIO = io || req.app.get('io');
      
      const notificationPromises = Array.from(commenterIds).map(async (commenterId) => {
        const notification = new Notification({
          recipient: commenterId,
          actor: req.user.userId,
          type: 'comment_reply',
          content: `${actor.firstName || actor.name} also commented on ${post.author.firstName || post.author.name}'s post`,
          relatedPost: post._id
        });
        await notification.save();
        
        if (socketIO) {
          socketIO.to(commenterId).emit('new-notification', {
            notification: notification,
            message: notification.content,
            postId: post._id
          });
        }
      });
      
      await Promise.all(notificationPromises);
    }
    
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

// React to a comment (like/laugh) - using atomic operation to prevent race conditions
router.post('/:postId/comment/:commentId/reaction', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { emoji = '❤️' } = req.body;
    
    const validEmojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Invalid emoji. Allowed: ❤️ 👍 😂 😮 😢 🔥 👏 🎉' });
    }

    // Check if post and comment exist
    const postCheck = await FeedPost.findById(postId);
    if (!postCheck) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = postCheck.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = comment.reactions.find(
      r => r.user.toString() === req.user.userId && r.emoji === emoji
    );

    // Use atomic operation with arrayFilters for nested array updates
    let post;
    if (existingReaction) {
      // Remove reaction (toggle off) - atomic operation
      post = await FeedPost.findByIdAndUpdate(
        postId,
        { $pull: { 'comments.$[comment].reactions': { user: req.user.userId, emoji: emoji } } },
        { 
          new: true,
          arrayFilters: [{ 'comment._id': commentId }]
        }
      );
    } else {
      // Remove any existing reaction from this user, then add new one - atomic operation
      post = await FeedPost.findByIdAndUpdate(
        postId,
        { 
          $pull: { 'comments.$[comment].reactions': { user: req.user.userId } },
          $push: { 'comments.$[comment].reactions': { user: req.user.userId, emoji: emoji, createdAt: new Date() } }
        },
        { 
          new: true,
          arrayFilters: [{ 'comment._id': commentId }]
        }
      );
    }

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    await post.populate('comments.reactions.user', 'name firstName lastName profilePicture');
    await post.populate('comments.user', 'name firstName lastName profilePicture');
    
    // Get the updated comment
    const updatedComment = post.comments.id(commentId);
    
    // Calculate reaction counts
    const reactionCounts = {};
    updatedComment.reactions.forEach(r => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = 0;
      }
      reactionCounts[r.emoji]++;
    });

    // Check if current user reacted
    const userReaction = updatedComment.reactions.find(
      r => r.user.toString() === req.user.userId
    )?.emoji || null;

    // Emit real-time update to all connected clients
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('comment-reaction-updated', {
        postId: post._id,
        commentId: commentId,
        reactionCounts,
        userReaction,
        comment: updatedComment
      });
    }

    res.json({ 
      message: existingReaction ? 'Reaction removed' : 'Reaction added',
      reactionCounts,
      userReaction,
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error reacting to comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post
router.delete('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete media from Cloudinary if present
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        if (media.publicId) {
          try {
            await cloudinary.uploader.destroy(media.publicId, {
              resource_type: media.type === 'video' ? 'video' : 'image'
            });
          } catch (cloudinaryError) {
            console.warn('Failed to delete media from Cloudinary:', cloudinaryError);
            // Continue even if Cloudinary deletion fails
          }
        }
      }
    }

    await FeedPost.findByIdAndDelete(postId);

    // Emit deletion event
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('post-deleted', { postId });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the comment author
    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove comment and all its replies
    post.comments = post.comments.filter(c => {
      const commentIdStr = commentId.toString();
      const cIdStr = c._id.toString();
      // Remove the comment itself or any replies to it
      return cIdStr !== commentIdStr && (c.replyTo?.toString() !== commentIdStr);
    });

    await post.save();

    // Emit deletion event
    const socketIO = io || req.app.get('io');
    if (socketIO) {
      socketIO.emit('comment-deleted', { postId, commentId });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report a post
router.post('/:postId/report', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason, details } = req.body;
    
    const post = await FeedPost.findById(postId).populate('author', 'name firstName lastName');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Prevent users from reporting their own posts
    if (post.author._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot report your own post' });
    }

    // TODO: Store report in database (create Report model if needed)
    // For now, just log it
    console.log(`🚨 Post reported: ${postId} by user ${req.user.userId}`);
    console.log(`Reason: ${reason || 'Not specified'}`);
    console.log(`Details: ${details || 'None'}`);
    console.log(`Reported post author: ${post.author.name || post.author.firstName}`);

    // In production, you would:
    // 1. Create a Report document
    // 2. Send notification to admins
    // 3. Track report count and auto-hide if threshold reached

    res.json({ message: 'Report submitted successfully. Thank you for helping keep our community safe.' });
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report a comment
router.post('/:postId/comment/:commentId/report', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { reason, details } = req.body;
    
    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Prevent users from reporting their own comments
    if (comment.user.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot report your own comment' });
    }

    // TODO: Store report in database
    console.log(`🚨 Comment reported: ${commentId} on post ${postId} by user ${req.user.userId}`);
    console.log(`Reason: ${reason || 'Not specified'}`);
    console.log(`Details: ${details || 'None'}`);

    res.json({ message: 'Report submitted successfully. Thank you for helping keep our community safe.' });
  } catch (error) {
    console.error('Error reporting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
