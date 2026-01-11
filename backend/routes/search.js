const express = require('express');
const User = require('../models/User');
const Venue = require('../models/Venue');
const FeedPost = require('../models/FeedPost');
const auth = require('../middleware/auth');

const router = express.Router();

// Global search across users, venues, and posts
// GET /api/search?q=query&limit=10
router.get('/', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({
        users: [],
        venues: [],
        posts: []
      });
    }

    const searchQuery = q.trim();
    const limitNum = Math.min(parseInt(limit) || 10, 20); // Max 20 results per type

    // Search users
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.userId } },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { firstName: { $regex: searchQuery, $options: 'i' } },
            { lastName: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { username: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
      .select('-password')
      .limit(limitNum);

    // Search venues
    const venues = await Venue.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { 'address.city': { $regex: searchQuery, $options: 'i' } },
            { 'address.state': { $regex: searchQuery, $options: 'i' } },
            { 'address.street': { $regex: searchQuery, $options: 'i' } },
            { category: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
      .limit(limitNum);

    // Search posts (only from friends and user's own posts)
    const currentUser = await User.findById(req.user.userId).select('friends');
    const friendIds = currentUser?.friends || [];
    const postAuthorIds = friendIds.length > 0 
      ? [...friendIds, req.user.userId]
      : [req.user.userId];

    const posts = await FeedPost.find({
      $and: [
        { author: { $in: postAuthorIds } },
        {
          $or: [
            { content: { $regex: searchQuery, $options: 'i' } },
            { 'checkIn.venue.name': { $regex: searchQuery, $options: 'i' } },
            { 'location.venue.name': { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
      .populate('author', 'name firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limitNum);

    // Transform users
    const transformedUsers = users.map(user => {
      const nameParts = (user.name || '').split(' ');
      const isFriend = friendIds.includes(user._id.toString());
      
      return {
        _id: user._id,
        id: user._id,
        name: user.name,
        firstName: user.firstName || nameParts[0] || '',
        lastName: user.lastName || nameParts.slice(1).join(' ') || '',
        email: user.email,
        username: user.username,
        profilePicture: user.profilePicture,
        phoneNumber: user.phoneNumber,
        isFriend
      };
    });

    // Transform venues
    const transformedVenues = venues.map(venue => {
      const venueObj = venue.toObject ? venue.toObject() : venue;
      
      // Transform location format
      if (venueObj.location && venueObj.location.coordinates) {
        const [longitude, latitude] = venueObj.location.coordinates;
        venueObj.location = {
          ...venueObj.location,
          latitude,
          longitude,
          coordinates: venueObj.location.coordinates
        };
      }
      
      return venueObj;
    });

    // Transform posts
    const transformedPosts = posts.map(post => {
      const postObj = post.toObject ? post.toObject() : post;
      const author = postObj.author;
      
      if (author && author.name && !author.firstName) {
        const nameParts = author.name.split(' ');
        author.firstName = nameParts[0] || '';
        author.lastName = nameParts.slice(1).join(' ') || '';
      }
      
      return {
        ...postObj,
        author
      };
    });

    res.json({
      users: transformedUsers,
      venues: transformedVenues,
      posts: transformedPosts
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
