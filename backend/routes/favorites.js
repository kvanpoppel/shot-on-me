const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Venue = require('../models/Venue');
const FeedPost = require('../models/FeedPost');
const auth = require('../middleware/auth');

const router = express.Router();

// Toggle favorite venue
router.post('/venues/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: 'Invalid venue ID' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFavorite = user.favoriteVenues.some(
      fav => fav.toString() === venueId
    );

    if (isFavorite) {
      // Remove from favorites
      user.favoriteVenues = user.favoriteVenues.filter(
        fav => fav.toString() !== venueId
      );
      await user.save();
      res.json({ message: 'Venue removed from favorites', isFavorite: false });
    } else {
      // Add to favorites
      user.favoriteVenues.push(venueId);
      await user.save();
      res.json({ message: 'Venue added to favorites', isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling favorite venue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get favorite venues
router.get('/venues', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('favoriteVenues', 'name address location category promotions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ venues: user.favoriteVenues || [] });
  } catch (error) {
    console.error('Error fetching favorite venues:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle favorite post
router.post('/posts/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await FeedPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFavorite = user.favoritePosts.some(
      fav => fav.toString() === postId
    );

    if (isFavorite) {
      // Remove from favorites
      user.favoritePosts = user.favoritePosts.filter(
        fav => fav.toString() !== postId
      );
      await user.save();
      res.json({ message: 'Post removed from favorites', isFavorite: false });
    } else {
      // Add to favorites
      user.favoritePosts.push(postId);
      await user.save();
      res.json({ message: 'Post added to favorites', isFavorite: true });
    }
  } catch (error) {
    console.error('Error toggling favorite post:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get favorite posts
router.get('/posts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'favoritePosts',
        populate: {
          path: 'author',
          select: 'name firstName lastName profilePicture'
        }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ posts: user.favoritePosts || [] });
  } catch (error) {
    console.error('Error fetching favorite posts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get popular areas (location heatmap)
router.get('/popular-areas', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusMiles = parseFloat(radius);

    // Get all users with location history in the area
    const users = await User.find({
      'locationHistory.latitude': {
        $gte: userLat - (radiusMiles / 69), // Approximate degrees
        $lte: userLat + (radiusMiles / 69)
      },
      'locationHistory.longitude': {
        $gte: userLon - (radiusMiles / 69),
        $lte: userLon + (radiusMiles / 69)
      }
    }).select('locationHistory');

    // Aggregate location data to find popular areas
    const locationCounts = {};
    users.forEach(user => {
      if (user.locationHistory && user.locationHistory.length > 0) {
        user.locationHistory.forEach(loc => {
          // Round to 0.01 degrees (~0.7 miles) for clustering
          const latKey = Math.round(loc.latitude * 100) / 100;
          const lonKey = Math.round(loc.longitude * 100) / 100;
          const key = `${latKey},${lonKey}`;
          
          if (!locationCounts[key]) {
            locationCounts[key] = {
              latitude: latKey,
              longitude: lonKey,
              count: 0,
              venues: new Set()
            };
          }
          locationCounts[key].count++;
          if (loc.venueId) {
            locationCounts[key].venues.add(loc.venueId.toString());
          }
        });
      }
    });

    // Convert to array and sort by popularity
    const popularAreas = Object.values(locationCounts)
      .map(area => ({
        latitude: area.latitude,
        longitude: area.longitude,
        popularity: area.count,
        venueCount: area.venues.size
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10); // Top 10 popular areas

    res.json({ popularAreas });
  } catch (error) {
    console.error('Error fetching popular areas:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

