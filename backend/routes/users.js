const express = require('express');
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
} else {
  console.warn('⚠️ Cloudinary environment variables not set. Profile picture uploads will fail.');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for profile pictures
  }
});

// Update profile picture (MUST come before /me to avoid route conflicts)
router.put('/me/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ 
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profilePictureUrl = '';

    // Check if file was uploaded via multer
    if (req.file) {
      console.log('📤 Uploading profile picture file to Cloudinary...');
      
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'shot-on-me/profiles',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Profile picture uploaded to Cloudinary');
              resolve(result);
            }
          }
        ).end(req.file.buffer);
      });

      profilePictureUrl = uploadResult.secure_url;
    } 
    // Check if base64 string was sent in body
    else if (req.body.profilePicture) {
      console.log('📤 Uploading profile picture (base64) to Cloudinary...');
      
      // Handle base64 data URL
      let base64Data = req.body.profilePicture;
      if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1]; // Remove data URL prefix
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          `data:image/jpeg;base64,${base64Data}`,
          {
            folder: 'shot-on-me/profiles',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Profile picture uploaded to Cloudinary');
              resolve(result);
            }
          }
        );
      });

      profilePictureUrl = uploadResult.secure_url;
    } else {
      return res.status(400).json({ message: 'No profile picture provided' });
    }

    // Update user's profile picture
    user.profilePicture = profilePictureUrl;
    await user.save();

    // Split name for response
    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('✅ Profile picture updated successfully');

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: user.phoneNumber,
        userType: user.userType || 'user',
        wallet: user.wallet || { balance: 0, pendingBalance: 0 },
        friends: user.friends || [],
        location: user.location || { isVisible: true },
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    res.status(500).json({ 
      message: 'Failed to update profile picture',
      error: error.message 
    });
  }
});

// Get current user (me) - must come after /me/profile-picture
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Split name into firstName and lastName for frontend compatibility
    const nameParts = (user.name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    // Return user with firstName and lastName
    res.json({
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: user.phoneNumber,
        userType: user.userType || 'user',
        wallet: user.wallet || { balance: 0, pendingBalance: 0 },
        friends: user.friends || [],
        location: user.location || { isVisible: true },
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friend suggestions (must come before /:userId)
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendIds = currentUser.friends || [];
    friendIds.push(req.user.userId); // Exclude self

    // Get users who are not already friends
    const suggestions = await User.find({
      _id: { $nin: friendIds },
      userType: { $ne: 'venue' } // Don't suggest venues
    })
    .select('-password')
    .limit(10)
    .sort({ createdAt: -1 }); // Newest users first

    const transformedSuggestions = suggestions.map(user => {
      const nameParts = (user.name || '').split(' ');
      return {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture
      };
    });

    res.json({ suggestions: transformedSuggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users (must come before /:userId)
router.get('/search/:query?', auth, async (req, res) => {
  try {
    const query = req.params.query || req.query.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const currentUser = await User.findById(req.user.userId);
    const friendIds = currentUser?.friends || [];

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phoneNumber: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('-password').limit(20);

    // Transform users to include firstName/lastName and friend status
    const transformedUsers = users.map(user => {
      const nameParts = (user.name || '').split(' ');
      const isFriend = friendIds.includes(user._id.toString());
      
      return {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        isFriend
      };
    });

    res.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (must be last to avoid matching /me, /profile, /search, /suggestions)
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Split name into firstName and lastName for frontend compatibility
    const nameParts = (user.name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    res.json({
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: user.phoneNumber,
        userType: user.userType || 'user',
        wallet: user.wallet || { balance: 0, pendingBalance: 0 },
        friends: user.friends || [],
        location: user.location || { isVisible: true },
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add friend
router.post('/friends/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Cannot add yourself as a friend' });
    }

    const user = await User.findById(currentUserId);
    const friend = await User.findById(userId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.friends.includes(userId)) {
      return res.status(400).json({ message: 'User is already a friend' });
    }

    user.friends.push(userId);
    friend.friends.push(currentUserId);

    await user.save();
    await friend.save();

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend
router.delete('/friends/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId);
    const friend = await User.findById(userId);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from both users' friend lists
    user.friends = user.friends.filter(id => id.toString() !== userId);
    friend.friends = friend.friends.filter(id => id.toString() !== currentUserId);

    await user.save();
    await friend.save();

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
