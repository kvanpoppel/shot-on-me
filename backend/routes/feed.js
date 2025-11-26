const express = require('express');
const FeedPost = require('../models/FeedPost');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
      .populate('author', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new post
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { content, location } = req.body;
    const mediaUrls = [];

    // Upload media files to Cloudinary if present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'shot-on-me/feed'
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

    const newPost = new FeedPost({
      author: req.user.userId,
      content,
      media: mediaUrls,
      location: location ? JSON.parse(location) : null
    });

    await newPost.save();
    await newPost.populate('author', 'name profilePicture');
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
