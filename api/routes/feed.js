import express from 'express';
import FeedPost from '../models/FeedPost.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Get feed posts
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get posts from friends and user's own posts
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendIds = [...(user.friends || []), user._id];
    
    // Safely get followed venues
    let followedVenueIds = [];
    try {
      if (user.followedVenues && user.followedVenues.length > 0) {
        // If followedVenues are ObjectIds, convert them
        followedVenueIds = user.followedVenues.map((v) => {
          if (typeof v === 'object' && v._id) {
            return v._id;
          }
          return v;
        });
      }
    } catch (error) {
      console.error('Error processing followedVenues:', error);
      // Continue without followed venues
    }

    // Build query - if no followed venues, just get friend posts
    const query = followedVenueIds.length > 0
      ? {
          $or: [
            { author: { $in: friendIds } },
            { 'checkIn.venue': { $in: followedVenueIds } },
            { 'location.venue': { $in: followedVenueIds } }
          ]
        }
      : { author: { $in: friendIds } };

    const posts = await FeedPost.find(query)
    .populate('author', 'firstName lastName profilePicture username')
    .populate('location.venue', 'name')
    .populate('checkIn.venue', 'name')
    .populate('likes.user', 'firstName lastName profilePicture')
    .populate('comments.user', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json({ posts, page, limit });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Server error fetching feed' });
  }
});

// Create post
router.post('/', authenticate, upload.array('media', 10), [
  body('content').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, venueId, latitude, longitude, checkIn } = req.body;
    const media = [];

    // Upload media files to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(file.buffer);
        });

        media.push({
          type: file.mimetype.startsWith('video/') ? 'video' : 'image',
          url: result.secure_url,
          thumbnail: result.secure_url
        });
      }
    }

    const post = new FeedPost({
      author: req.user._id,
      content: content || '',
      media,
      location: {
        venue: venueId || null,
        coordinates: latitude && longitude ? {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        } : undefined
      },
      checkIn: checkIn && venueId ? {
        venue: venueId,
        checkedInAt: new Date()
      } : undefined
    });

    await post.save();
    await post.populate('author', 'firstName lastName profilePicture username');

    // Emit real-time update
    const io = req.io;
    io.emit('new-post', post);

    res.status(201).json({ post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error creating post' });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = post.likes.find(
      like => like.user.toString() === req.user._id.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(
        like => like.user.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    // Emit real-time update
    const io = req.io;
    io.emit('post-updated', { postId: post._id, likes: post.likes.length });

    res.json({ 
      liked: !existingLike,
      likesCount: post.likes.length 
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Server error updating like' });
  }
});

// Add comment
router.post('/:id/comments', authenticate, [
  body('content').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const post = await FeedPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      content: req.body.content
    });

    await post.save();
    await post.populate('comments.user', 'firstName lastName profilePicture');

    // Emit real-time update
    const io = req.io;
    io.emit('new-comment', {
      postId: post._id,
      comment: post.comments[post.comments.length - 1]
    });

    res.status(201).json({ 
      comment: post.comments[post.comments.length - 1] 
    });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Server error adding comment' });
  }
});

// Check in at a venue
router.post('/checkin', authenticate, [
  body('venueId').notEmpty(),
  body('content').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { venueId, content } = req.body;
    const Venue = (await import('../models/Venue.js')).default;
    const venue = await Venue.findById(venueId);

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const post = new FeedPost({
      author: req.user._id,
      content: content || `Checked in at ${venue.name} 🍻`,
      checkIn: {
        venue: venueId,
        checkedInAt: new Date()
      }
    });

    await post.save();
    await post.populate('author', 'firstName lastName profilePicture username');
    await post.populate('checkIn.venue', 'name');

    // Emit real-time update
    const io = req.io;
    io.emit('new-post', post);
    io.emit('check-in', {
      userId: req.user._id,
      venueId: venueId,
      venueName: venue.name,
      postId: post._id
    });

    res.status(201).json({ post });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error creating check-in' });
  }
});

export default router;

