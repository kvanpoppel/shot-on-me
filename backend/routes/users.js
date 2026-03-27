const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { getUserStatus, updateUserActivity } = require('../utils/activityTracker');

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
// Note: upload.single() only processes multipart/form-data. For JSON base64, we handle it in the body.
router.put('/me/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Cloudinary not configured');
      return res.status(500).json({ 
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profilePictureUrl = '';

    // Check if file was uploaded via multer (multipart/form-data)
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
    // Check if base64 string was sent in body (application/json)
    else if (req.body.profilePicture) {
      console.log('📤 Uploading profile picture (base64) to Cloudinary...');
      
      // Handle base64 data URL
      let base64Data = req.body.profilePicture;
      let mimeType = 'image/jpeg'; // Default
      
      if (base64Data.startsWith('data:')) {
        // Extract MIME type from data URL
        const matches = base64Data.match(/^data:([^;]+);base64,/);
        if (matches) {
          mimeType = matches[1];
        }
        base64Data = base64Data.split(',')[1]; // Remove data URL prefix
      }

      if (!base64Data || base64Data.length === 0) {
        return res.status(400).json({ message: 'Invalid base64 image data' });
      }

      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload(
            `data:${mimeType};base64,${base64Data}`,
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
                console.log('✅ Profile picture uploaded to Cloudinary:', result.secure_url);
                resolve(result);
              }
            }
          );
        });

        profilePictureUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('❌ Failed to upload to Cloudinary:', uploadError);
        return res.status(500).json({ 
          message: 'Failed to upload profile picture to Cloudinary',
          error: uploadError.message 
        });
      }
    } else {
      return res.status(400).json({ message: 'No profile picture provided. Send either a file via multipart/form-data or base64 string in JSON body.' });
    }

    // Update user's profile picture using findByIdAndUpdate to avoid validation issues
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { profilePicture: profilePictureUrl } },
      { new: true, runValidators: false } // Don't run validators, just update the field
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Split name for response
    const nameParts = (updatedUser.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('✅ Profile picture updated successfully:', profilePictureUrl);

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: profilePictureUrl,
      user: {
        id: updatedUser._id,
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: updatedUser.phoneNumber,
        userType: updatedUser.userType || 'user',
        wallet: updatedUser.wallet || { balance: 0, pendingBalance: 0 },
        friends: updatedUser.friends || [],
        location: updatedUser.location || { isVisible: true },
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error('❌ Error updating profile picture:', error);
    res.status(500).json({ 
      message: 'Failed to update profile picture',
      error: undefined 
    });
  }
});

// Update current user profile (firstName, lastName, etc.) - must come after /me/profile-picture
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update object
    const updateData = {};
    
    // Update name if firstName or lastName provided
    if (firstName !== undefined || lastName !== undefined) {
      const currentNameParts = (user.name || '').split(' ');
      const newFirstName = firstName !== undefined ? firstName : (currentNameParts[0] || '');
      const newLastName = lastName !== undefined ? lastName : (currentNameParts.slice(1).join(' ') || '');
      updateData.name = `${newFirstName} ${newLastName}`.trim();
      
      // Ensure name is not empty (required field)
      if (!updateData.name || updateData.name.trim() === '') {
        updateData.name = user.name || `${newFirstName} ${newLastName}`.trim() || 'User';
      }
    }

    // Update phone number if provided
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
    }

    // Use findByIdAndUpdate to avoid validation issues
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, runValidators: true } // Run validators but ensure name exists
    ).select('-password');
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    // Split name for response
    const nameParts = (updatedUser.name || '').split(' ');
    const responseFirstName = nameParts[0] || '';
    const responseLastName = nameParts.slice(1).join(' ') || '';

    console.log('✅ User profile updated successfully');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        firstName: responseFirstName,
        lastName: responseLastName,
        phoneNumber: updatedUser.phoneNumber,
        userType: updatedUser.userType || 'user',
        wallet: updatedUser.wallet || { balance: 0, pendingBalance: 0 },
        friends: updatedUser.friends || [],
        location: updatedUser.location || { isVisible: true },
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: undefined 
    });
  }
});

// Update notification preferences
router.put('/me/notification-preferences', auth, async (req, res) => {
  try {
    const { notificationPreferences } = req.body;
    
    if (!notificationPreferences) {
      return res.status(400).json({ message: 'Notification preferences are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge with existing preferences (don't overwrite all preferences)
    const currentPrefs = user.notificationPreferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      ...notificationPreferences
    };

    user.notificationPreferences = updatedPrefs;
    await user.save();

    console.log('✅ Notification preferences updated successfully');

    res.json({
      message: 'Notification preferences updated successfully',
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('❌ Error updating notification preferences:', error);
    res.status(500).json({ 
      message: 'Failed to update notification preferences',
      error: undefined 
    });
  }
});

// Get persisted AI personalization signals
router.get('/me/ai-signals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('aiSignals');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const viewedProfileIds = (user.aiSignals?.viewedProfileIds || []).map(id => id.toString());
    const addedFriendIds = (user.aiSignals?.addedFriendIds || []).map(id => id.toString());

    return res.json({
      aiSignals: {
        viewedProfileIds,
        addedFriendIds,
        feedback: {
          helpfulCount: user.aiSignals?.feedback?.helpfulCount || 0,
          lessLikeThisCount: user.aiSignals?.feedback?.lessLikeThisCount || 0
        },
        updatedAt: user.aiSignals?.updatedAt || null
      }
    });
  } catch (error) {
    console.error('Error fetching AI signals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update persisted AI personalization signals
router.put('/me/ai-signals', auth, async (req, res) => {
  try {
    const { viewedProfileIds = [], addedFriendIds = [] } = req.body || {};

    const sanitizeIds = (ids) => {
      if (!Array.isArray(ids)) return [];
      const unique = [...new Set(ids.map(id => String(id).trim()))];
      // Keep only valid Mongo ObjectId strings and cap to last 50
      return unique.filter(id => /^[a-fA-F0-9]{24}$/.test(id)).slice(0, 50);
    };

    const safeViewed = sanitizeIds(viewedProfileIds);
    const safeAdded = sanitizeIds(addedFriendIds);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'aiSignals.viewedProfileIds': safeViewed,
          'aiSignals.addedFriendIds': safeAdded,
          'aiSignals.updatedAt': new Date()
        }
      },
      { new: true, runValidators: false }
    ).select('aiSignals');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'AI signals updated',
      aiSignals: {
        viewedProfileIds: (user.aiSignals?.viewedProfileIds || []).map(id => id.toString()),
        addedFriendIds: (user.aiSignals?.addedFriendIds || []).map(id => id.toString()),
        feedback: {
          helpfulCount: user.aiSignals?.feedback?.helpfulCount || 0,
          lessLikeThisCount: user.aiSignals?.feedback?.lessLikeThisCount || 0
        },
        updatedAt: user.aiSignals?.updatedAt || null
      }
    });
  } catch (error) {
    console.error('Error updating AI signals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record AI feedback for personalization quality
router.post('/me/ai-feedback', auth, async (req, res) => {
  try {
    const { feedbackType } = req.body || {};
    if (!feedbackType || !['helpful', 'less_like_this'].includes(feedbackType)) {
      return res.status(400).json({ message: 'Invalid feedbackType' });
    }

    const incUpdate = feedbackType === 'helpful'
      ? { 'aiSignals.feedback.helpfulCount': 1 }
      : { 'aiSignals.feedback.lessLikeThisCount': 1 };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $inc: incUpdate,
        $set: { 'aiSignals.updatedAt': new Date() }
      },
      { new: true, runValidators: false }
    ).select('aiSignals.feedback aiSignals.updatedAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'AI feedback recorded',
      feedback: {
        helpfulCount: user.aiSignals?.feedback?.helpfulCount || 0,
        lessLikeThisCount: user.aiSignals?.feedback?.lessLikeThisCount || 0
      }
    });
  } catch (error) {
    console.error('Error recording AI feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user (me) - must come after /me/profile-picture and PUT /me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password');
    
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
        profilePicture: user.profilePicture,
        notificationPreferences: user.notificationPreferences || {}
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
    const candidates = await User.find({
      _id: { $nin: friendIds },
      userType: { $ne: 'venue' } // Don't suggest venues
    })
    .select('email name phoneNumber profilePicture friends createdAt')
    .limit(50)
    .sort({ createdAt: -1 }); // Pull more, then AI-rank

    const currentFriendSet = new Set((currentUser.friends || []).map(id => id.toString()));
    const viewedSet = new Set((currentUser.aiSignals?.viewedProfileIds || []).map(id => id.toString()));
    const addedSet = new Set((currentUser.aiSignals?.addedFriendIds || []).map(id => id.toString()));
    const nowMs = Date.now();

    const ranked = candidates.map(user => {
      const candidateId = user._id.toString();
      const candidateFriendIds = (user.friends || []).map(id => id.toString());
      const mutualFriends = candidateFriendIds.filter(id => currentFriendSet.has(id));
      const mutualCount = mutualFriends.length;
      const viewedBoost = viewedSet.has(candidateId) ? 8 : 0;
      const builderHistoryBoost = addedSet.size > 0 && mutualCount > 0 ? 5 : 0;
      const recencyDays = Math.max(0, (nowMs - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const recencyBoost = Math.max(0, 12 - recencyDays); // Up to 12 points for newer users
      const aiScore = Math.round(50 + mutualCount * 10 + viewedBoost + builderHistoryBoost + recencyBoost);

      let aiReason = 'Great fit based on your activity';
      if (mutualCount > 0) {
        aiReason = `${mutualCount} mutual friend${mutualCount !== 1 ? 's' : ''}`;
      } else if (viewedBoost > 0) {
        aiReason = 'You viewed this profile recently';
      }

      return { user, mutualFriends, aiScore: Math.min(99, aiScore), aiReason };
    }).sort((a, b) => b.aiScore - a.aiScore);

    const transformedSuggestions = ranked.slice(0, 10).map(({ user, mutualFriends, aiScore, aiReason }) => {
      const nameParts = (user.name || '').split(' ');
      return {
        id: user._id,
        _id: user._id,
        email: user.email,
        name: user.name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        mutualFriends: mutualFriends.slice(0, 5),
        aiScore,
        aiReason
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

    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } },
        {
          $or: [
            { name: { $regex: safeQuery, $options: 'i' } },
            { email: { $regex: safeQuery, $options: 'i' } },
            { phoneNumber: { $regex: safeQuery, $options: 'i' } }
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
    
    const isSelf = req.user.userId === user._id.toString();

    // Own profile — return full data
    if (isSelf) {
      return res.json({
        user: {
          id: user._id,
          _id: user._id,
          email: user.email,
          name: user.name,
          firstName,
          lastName,
          phoneNumber: user.phoneNumber,
          userType: user.userType || 'user',
          wallet: user.wallet || { balance: 0, pendingBalance: 0 },
          friends: user.friends || [],
          location: user.location || { isVisible: true },
          profilePicture: user.profilePicture,
          points: user.points,
          checkInStreak: user.checkInStreak,
          stats: user.stats
        }
      });
    }

    // Another user — return only public fields (no wallet, phone, email, exact location)
    const isFriend = (user.friends || []).some(f => f.toString() === req.user.userId);
    res.json({
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        firstName,
        lastName,
        userType: user.userType || 'user',
        profilePicture: user.profilePicture,
        // Only expose location if user has it visible and is a friend
        ...(isFriend && user.location?.isVisible && {
          location: { isVisible: true, latitude: user.location.latitude, longitude: user.location.longitude }
        }),
        stats: user.stats,
        points: user.points,
        isFriend
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

    console.log('📝 Add friend request:', { userId, currentUserId });

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Cannot add yourself as a friend' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const friend = await User.findById(userId);
    if (!friend) {
      console.error('❌ Friend not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert to string for comparison
    const userIdStr = userId.toString();
    const currentUserIdStr = currentUserId.toString();
    const friendIds = user.friends.map(f => f.toString());

    if (friendIds.includes(userIdStr)) {
      return res.status(400).json({ message: 'User is already a friend' });
    }

    // Use findByIdAndUpdate to avoid full document validation
    await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { friends: userId } },
      { new: true, runValidators: false }
    );

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { friends: currentUserId } },
      { new: true, runValidators: false }
    );

    // Create notifications for both users
    const Notification = require('../models/Notification');
    const io = req.app.get('io');
    
    // Notify the friend that they were added
    const friendNotification = new Notification({
      recipient: userId,
      actor: currentUserId,
      type: 'friend_accepted',
      content: `${user.firstName || user.name} added you as a friend`
    });
    await friendNotification.save();
    
    // Notify the current user that friend was added
    const userNotification = new Notification({
      recipient: currentUserId,
      actor: userId,
      type: 'friend_accepted',
      content: `${friend.firstName || friend.name} is now your friend`
    });
    await userNotification.save();
    
    // Emit real-time notifications
    if (io) {
      io.to(`user-${userId.toString()}`).emit('new-notification', {
        notification: friendNotification,
        message: friendNotification.content
      });
      io.to(`user-${currentUserId.toString()}`).emit('new-notification', {
        notification: userNotification,
        message: userNotification.content
      });
    }

    console.log('✅ Friend added successfully:', { userId, currentUserId });
    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('❌ Error adding friend:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: undefined 
    });
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

// Get user status (online/away/offline)
router.get('/:userId/status', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await getUserStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get multiple users' statuses
router.post('/status/batch', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds must be an array' });
    }

    const mongoose = require('mongoose');
    const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return res.json({ statuses: {} });

    const users = await User.find({ _id: { $in: validIds } }).select('_id lastSeen status');

    const now = Date.now();
    const statuses = {};
    for (const user of users) {
      let calculatedStatus = 'offline';
      if (user.lastSeen) {
        const diffMinutes = (now - new Date(user.lastSeen).getTime()) / 60000;
        calculatedStatus = diffMinutes <= 5 ? 'online' : diffMinutes <= 30 ? 'away' : 'offline';
      }
      statuses[user._id.toString()] = { status: calculatedStatus, lastSeen: user.lastSeen };
    }

    // Fill in offline for any requested ids not found
    for (const id of validIds) {
      if (!statuses[id]) statuses[id] = { status: 'offline', lastSeen: null };
    }

    res.json({ statuses });
  } catch (error) {
    console.error('Error getting batch statuses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
