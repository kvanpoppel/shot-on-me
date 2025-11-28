const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// Get Socket.io instance (will be set by server.js)
let io = null;
router.setIO = (socketIO) => {
  io = socketIO;
};

// Get all venues (for app users) or user's venues (for venue owners)
router.get('/', auth, async (req, res) => {
  try {
    let venues;
    
    if (req.user.userType === 'venue') {
      // Venue owners see only their venues
      venues = await Venue.find({ owner: req.user.userId });
    } else {
      // App users see all active venues with promotions
      venues = await Venue.find({ isActive: true });
    }
    
    // Return in format expected by frontend
    if (req.user.userType === 'venue') {
      res.json(venues); // Venue owners get array directly
    } else {
      res.json(venues); // App users also get array directly (frontend will handle)
    }
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single venue by ID
router.get('/:venueId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    // Check if user owns this venue or if venue is active
    if (req.user.userType !== 'venue' && !venue.isActive) {
      return res.status(403).json({ message: 'Venue not available' });
    }
    
    res.json({ venue });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create promotion for venue
router.post('/:venueId/promotions', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    // Check if user owns this venue
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
    
    // Emit Socket.io event for real-time update
    if (io) {
      io.emit('new-promotion', {
        venueId: venue._id.toString(),
        promotion: newPromotion
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue: venue
      });
    }
    
    console.log('✅ Promotion created for venue:', venue.name);
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

// Update promotion
router.put('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    // Check if user owns this venue
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to update promotions for this venue' });
    }
    
    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    const { title, description, type, startTime, endTime, discount, validUntil, schedule, isActive } = req.body;
    
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
    
    // Emit Socket.io event for real-time update
    if (io) {
      io.emit('promotion-updated', {
        venueId: venue._id.toString(),
        promotion: promotion
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue: venue
      });
    }
    
    console.log('✅ Promotion updated for venue:', venue.name);
    res.json({ 
      message: 'Promotion updated successfully',
      promotion: promotion,
      venue 
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete promotion
router.delete('/:venueId/promotions/:promotionId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    // Check if user owns this venue
    if (venue.owner.toString() !== req.user.userId && req.user.userType !== 'venue') {
      return res.status(403).json({ message: 'Not authorized to delete promotions for this venue' });
    }
    
    const promotion = venue.promotions.id(req.params.promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    promotion.deleteOne();
    await venue.save();
    
    // Emit Socket.io event for real-time update
    if (io) {
      io.emit('promotion-deleted', {
        venueId: venue._id.toString(),
        promotionId: req.params.promotionId
      });
      io.emit('venue-updated', {
        venueId: venue._id.toString(),
        venue: venue
      });
    }
    
    console.log('✅ Promotion deleted for venue:', venue.name);
    res.json({ 
      message: 'Promotion deleted successfully',
      venue 
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
