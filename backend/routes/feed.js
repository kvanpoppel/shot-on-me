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
      .populate('comments.user', 'name firstName lastName profilePicture')
      .populate('likes.user', 'name firstName lastName profilePicture')
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
        postObj.comments = postObj.comments.map((comment: any) => {
          if (comment.user && comment.user.name && !comment.user.firstName) {
            const nameParts = comment.user.name.split(' ');
            comment.user.firstName = nameParts[0] || '';
            comment.user.lastName = nameParts.slice(1).join(' ') || '';
          }
          return comment;
        });
      }
      
      return { ...postObj, author };
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

// Like a post
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await FeedPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked
    const existingLike = post.likes.find(
      like => like.user.toString() === req.user.userId
    );

    if (existingLike) {
      // Unlike - remove like
      post.likes = post.likes.filter(
        like => like.user.toString() !== req.user.userId
      );
    } else {
      // Like - add like
      post.likes.push({
        user: req.user.userId,
        createdAt: new Date()
      });
    }

    await post.save();
    await post.populate('author', 'name firstName lastName profilePicture');
    
    res.json({ 
      message: existingLike ? 'Post unliked' : 'Post liked',
      post 
    });
  } catch (error) {
    console.error('Error liking post:', error);
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
