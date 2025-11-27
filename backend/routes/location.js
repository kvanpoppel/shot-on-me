const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Update user location
router.put('/update', auth, async (req, res) => {
  try {
    const { latitude, longitude, isVisible } = req.body;
    
    // First check if user exists and get current location
    const user = await User.findById(req.user.userId).select('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build location update object
    const locationUpdate = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };

    // Preserve isVisible if not provided
    if (isVisible !== undefined) {
      locationUpdate.isVisible = isVisible;
    } else if (user.location && user.location.isVisible !== undefined) {
      locationUpdate.isVisible = user.location.isVisible;
    } else {
      locationUpdate.isVisible = true; // Default
    }

    // Update only the location field using findByIdAndUpdate to avoid validation issues
    await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { location: locationUpdate } },
      { runValidators: false } // Skip validation to avoid name field issues
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
