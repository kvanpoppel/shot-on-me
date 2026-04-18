const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/saved-venues — get all saved Google venues for the user (in order)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('savedGoogleVenues');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const sorted = [...(user.savedGoogleVenues || [])].sort((a, b) => a.order - b.order);
    res.json({ venues: sorted });
  } catch (error) {
    console.error('Error fetching saved venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/saved-venues — save a Google venue
router.post('/', auth, async (req, res) => {
  try {
    const { placeId, name, address, website, googleMapsUrl, rating, lat, lng, coverPhoto } = req.body;
    if (!placeId || !name) return res.status(400).json({ message: 'placeId and name are required' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Don't duplicate
    const exists = user.savedGoogleVenues.find(v => v.placeId === placeId);
    if (exists) return res.json({ venue: exists, alreadySaved: true });

    const order = user.savedGoogleVenues.length; // append at end
    const newVenue = { placeId, name, address: address || {}, website: website || '', googleMapsUrl: googleMapsUrl || '', rating, lat, lng, coverPhoto: coverPhoto || '', isFavorite: false, order, savedAt: new Date() };
    user.savedGoogleVenues.push(newVenue);
    await user.save();

    res.json({ venue: newVenue, alreadySaved: false });
  } catch (error) {
    console.error('Error saving venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/saved-venues/:placeId — remove a saved venue
router.delete('/:placeId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.savedGoogleVenues = user.savedGoogleVenues.filter(v => v.placeId !== req.params.placeId);
    // Re-index order
    user.savedGoogleVenues.forEach((v, i) => { v.order = i; });
    await user.save();

    res.json({ message: 'Venue removed' });
  } catch (error) {
    console.error('Error removing venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/saved-venues/:placeId/favorite — toggle favorite
router.patch('/:placeId/favorite', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const venue = user.savedGoogleVenues.find(v => v.placeId === req.params.placeId);
    if (!venue) return res.status(404).json({ message: 'Saved venue not found' });

    venue.isFavorite = !venue.isFavorite;
    await user.save();

    res.json({ isFavorite: venue.isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/saved-venues/reorder — save new order
router.patch('/reorder', auth, async (req, res) => {
  try {
    const { placeIds } = req.body; // ordered array of placeIds
    if (!Array.isArray(placeIds)) return res.status(400).json({ message: 'placeIds must be an array' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    placeIds.forEach((placeId, index) => {
      const venue = user.savedGoogleVenues.find(v => v.placeId === placeId);
      if (venue) venue.order = index;
    });
    await user.save();

    res.json({ message: 'Order saved' });
  } catch (error) {
    console.error('Error reordering venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
