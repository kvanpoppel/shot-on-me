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
      .populate('author', 'name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Transform posts to include firstName/lastName from name if needed
    const transformedPosts = posts.map(post => {
      const author = post.author.toObject ? post.author.toObject() : post.author;
      if (author && author.name && !author.firstName) {
        const nameParts = author.name.split(' ');
        author.firstName = nameParts[0] || '';
        author.lastName = nameParts.slice(1).join(' ') || '';
      }
      return { ...post.toObject(), author };
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

module.exports = router;
