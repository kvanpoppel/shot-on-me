const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user (me)
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
