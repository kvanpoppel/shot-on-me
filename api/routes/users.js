import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('friends', 'firstName lastName profilePicture username');
    
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Get friend suggestions (users you might know) - MUST be before /:id route
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends');
    const friendIds = [...(user.friends || []), user._id];

    // Find users who are friends with your friends (but not your friends yet)
    const suggestions = await User.find({
      _id: { $nin: friendIds },
      userType: 'user',
      isActive: true
    })
    .select('-password')
    .limit(10);

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Server error fetching suggestions' });
  }
});

// Search users - MUST be before /:id route
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    })
    .select('-password')
    .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error searching users' });
  }
});

// Get user by ID - MUST be last to avoid matching other routes
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -phoneNumber')
      .populate('friends', 'firstName lastName profilePicture username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('User error:', error);
    res.status(500).json({ error: 'Server error fetching user' });
  }
});

// Update profile
router.put('/me', authenticate, async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'username', 'profilePicture', 'location'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ error: 'Invalid updates' });
    }

    Object.assign(req.user, req.body);
    req.user.updatedAt = new Date();
    await req.user.save();

    const userObj = req.user.toObject();
    delete userObj.password;

    res.json({ user: userObj });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// Upload profile picture
router.put('/me/profile-picture', authenticate, async (req, res) => {
  try {
    // In production, you'd use multer or similar to handle file uploads
    // For now, we'll accept a URL or base64 string
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ error: 'Profile picture is required' });
    }

    req.user.profilePicture = profilePicture;
    req.user.updatedAt = new Date();
    await req.user.save();

    const userObj = req.user.toObject();
    delete userObj.password;

    res.json({ 
      success: true,
      profilePicture: req.user.profilePicture,
      user: userObj
    });
  } catch (error) {
    console.error('Profile picture error:', error);
    res.status(500).json({ error: 'Server error updating profile picture' });
  }
});

// Add friend
router.post('/friends/:id', authenticate, async (req, res) => {
  try {
    const friend = await User.findById(req.params.id);
    
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user._id.toString() === friend._id.toString()) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    if (req.user.friends.includes(friend._id)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    req.user.friends.push(friend._id);
    await req.user.save();

    // Also add current user to friend's friends list (mutual friendship)
    if (!friend.friends.includes(req.user._id)) {
      friend.friends.push(req.user._id);
      await friend.save();
    }

    res.json({ message: 'Friend added', friends: req.user.friends });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ error: 'Server error adding friend' });
  }
});

// Remove friend
router.delete('/friends/:id', authenticate, async (req, res) => {
  try {
    const friend = await User.findById(req.params.id);
    
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!req.user.friends.includes(friend._id)) {
      return res.status(400).json({ error: 'Not friends' });
    }

    req.user.friends = req.user.friends.filter(
      (id) => id.toString() !== friend._id.toString()
    );
    await req.user.save();

    // Also remove from friend's friends list
    friend.friends = friend.friends.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await friend.save();

    res.json({ message: 'Friend removed', friends: req.user.friends });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Server error removing friend' });
  }
});


export default router;

