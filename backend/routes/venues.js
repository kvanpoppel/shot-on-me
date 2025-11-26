const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all venues (for app users) or user's venues (for venue owners)
router.get('/', auth, async (req, res) => {
  try {
    let venues;
    
    if (req.user.userType === 'venue') {
      // Venue owners see only their venues
      venues = await Venue.find({ owner: req.user.userId });
    } else {
      // App users see all active venues
      venues = await Venue.find({ isActive: true });
    }
    
    res.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
