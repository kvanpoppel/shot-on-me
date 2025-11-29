const express = require('express');
const Venue = require('../models/Venue');
const User = require('../models/User');
const auth = require('../middleware/auth');
const stripeUtils = require('../utils/stripe');

const router = express.Router();

// Socket.io instance (set from server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// GET /api/venues
// - For venue owners: only their own venues
// - For regular users: all active venues
router.get('/', auth, async (req, res) => {
  try {
    let venues;

    if (req.user.userType === 'venue') {
      venues = await Venue.find({ owner: req.user.userId });
    } else {
      venues = await Venue.find({ isActive: true });
    }

    res.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/venues/:venueId
router.get('/:venueId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Regular users can only see active venues
    if (req.user.userType !== 'venue' && !venue.isActive) {
      return res.status(403).json({ message: 'Venue not available' });
    }

    res.json({ venue });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/venues/:venueId/promotions
router.post('/:venueId/promotions', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Only owner (or venue user) can create promotions
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to create promotions for this venue' });
    }

    const { title, description, type, startTime, endTime, discount, validUntil, schedule } = req.body;

    const newPromotion = {
      title,
      description,
      type: type || 'other',
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      discount,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      schedule,
      isActive: true
    };

    venue.promotions.push(newPromotion);
    await venue.save();

    if (io) {
      io.emit('new-promotion', {
        venueId: venue._id.toString(),
        promotion: newPromotion
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.status(201).json({
      message: 'Promotion created successfully',
      promotion: newPromotion,
      venue
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/venues/:venueId/promotions/:promotionId
router.put('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to update promotions for this venue' });
    }

    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const {
      title,
      description,
      type,
      startTime,
      endTime,
      discount,
      validUntil,
      schedule,
      isActive
    } = req.body;

    if (title !== undefined) promotion.title = title;
    if (description !== undefined) promotion.description = description;
    if (type !== undefined) promotion.type = type;
    if (startTime !== undefined) promotion.startTime = new Date(startTime);
    if (endTime !== undefined) promotion.endTime = new Date(endTime);
    if (discount !== undefined) promotion.discount = discount;
    if (validUntil !== undefined) promotion.validUntil = new Date(validUntil);
    if (schedule !== undefined) promotion.schedule = schedule;
    if (isActive !== undefined) promotion.isActive = isActive;

    await venue.save();

    if (io) {
      io.emit('promotion-updated', {
        venueId: venue._id.toString(),
        promotion
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.json({
      message: 'Promotion updated successfully',
      promotion,
      venue
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/venues/:venueId/promotions/:promotionId
router.delete('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to delete promotions for this venue' });
    }

    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.deleteOne();
    await venue.save();

    if (io) {
      io.emit('promotion-deleted', {
        venueId: venue._id.toString(),
        promotionId: req.params.promotionId
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue
      });
    }

    res.json({
      message: 'Promotion deleted successfully',
      venue
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug endpoint: list all venues (including inactive) – useful for checking Kate's Pub
router.get('/debug/all', auth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const venues = await Venue.find({}).select('name isActive location owner address');
    res.json({ venues, count: venues.length });
  } catch (error) {
    console.error('Error fetching all venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


