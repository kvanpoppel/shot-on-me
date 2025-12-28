const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PromotionLibrary = require('../models/PromotionLibrary');
const Venue = require('../models/Venue');
const mongoose = require('mongoose');

// GET /api/promotion-library
// Get all saved promotions for the user's venue
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Get user's venue - handle both populated and non-populated owner
    let venue = await Venue.findOne({ owner: req.user.userId });
    
    // If not found, try with ObjectId conversion
    if (!venue) {
      venue = await Venue.findOne({ 
        owner: new mongoose.Types.ObjectId(req.user.userId) 
      });
    }
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found. Please create a venue first.' });
    }

    // Build query
    const query = { venueId: venue._id };
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'promotionData.title': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } } // Search in tags array
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const savedPromotions = await PromotionLibrary.find(query)
      .sort(sortOptions)
      .lean();

    res.json({
      promotions: savedPromotions,
      count: savedPromotions.length
    });
  } catch (error) {
    console.error('Error fetching promotion library:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/promotion-library
// Save a promotion to the library
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, promotionData, performance, tags, category } = req.body;

    if (!name || !promotionData) {
      return res.status(400).json({ message: 'Name and promotion data are required' });
    }

    // Get user's venue - handle both populated and non-populated owner
    let venue = await Venue.findOne({ owner: req.user.userId });
    
    // If not found, try with ObjectId conversion
    if (!venue) {
      venue = await Venue.findOne({ 
        owner: new mongoose.Types.ObjectId(req.user.userId) 
      });
    }
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found. Please create a venue first.' });
    }

    // Check if a promotion with the same name already exists
    const existing = await PromotionLibrary.findOne({
      venueId: venue._id,
      name: name.trim()
    });

    if (existing) {
      return res.status(400).json({ message: 'A promotion with this name already exists in your library' });
    }

    // Validate category
    const validCategories = ['happy-hour', 'special', 'event', 'flash-deal', 'exclusive', 'other'];
    let finalCategory = category || promotionData?.type || 'other';
    if (!validCategories.includes(finalCategory)) {
      finalCategory = 'other';
    }

    // Ensure promotionData is an object
    const safePromotionData = promotionData && typeof promotionData === 'object' ? promotionData : {};

    const savedPromotion = new PromotionLibrary({
      userId: req.user.userId,
      venueId: venue._id,
      name: name.trim(),
      description: description || '',
      promotionData: safePromotionData,
      performance: performance || {},
      tags: Array.isArray(tags) ? tags : [],
      category: finalCategory
    });

    try {
      await savedPromotion.save();
    } catch (saveError) {
      console.error('Mongoose save error:', saveError);
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ 
          message: 'Validation error', 
          error: validationErrors 
        });
      }
      throw saveError;
    }

    res.status(201).json({
      message: 'Promotion saved to library',
      promotion: savedPromotion
    });
  } catch (error) {
    console.error('Error saving promotion to library:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/promotion-library/:id
// Get a specific saved promotion
router.get('/:id', auth, async (req, res) => {
  try {
    const savedPromotion = await PromotionLibrary.findById(req.params.id);
    
    if (!savedPromotion) {
      return res.status(404).json({ message: 'Saved promotion not found' });
    }

    // Check authorization
    if (savedPromotion.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ promotion: savedPromotion });
  } catch (error) {
    console.error('Error fetching saved promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/promotion-library/:id
// Update a saved promotion
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, tags, category } = req.body;

    const savedPromotion = await PromotionLibrary.findById(req.params.id);
    
    if (!savedPromotion) {
      return res.status(404).json({ message: 'Saved promotion not found' });
    }

    // Check authorization
    if (savedPromotion.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (name) savedPromotion.name = name.trim();
    if (description !== undefined) savedPromotion.description = description;
    if (tags) savedPromotion.tags = tags;
    if (category) savedPromotion.category = category;

    await savedPromotion.save();

    res.json({
      message: 'Saved promotion updated',
      promotion: savedPromotion
    });
  } catch (error) {
    console.error('Error updating saved promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/promotion-library/:id
// Delete a saved promotion
router.delete('/:id', auth, async (req, res) => {
  try {
    const savedPromotion = await PromotionLibrary.findById(req.params.id);
    
    if (!savedPromotion) {
      return res.status(404).json({ message: 'Saved promotion not found' });
    }

    // Check authorization
    if (savedPromotion.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await PromotionLibrary.findByIdAndDelete(req.params.id);

    res.json({ message: 'Saved promotion deleted' });
  } catch (error) {
    console.error('Error deleting saved promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/promotion-library/:id/use
// Mark a saved promotion as used (increment usage count)
router.post('/:id/use', auth, async (req, res) => {
  try {
    const savedPromotion = await PromotionLibrary.findById(req.params.id);
    
    if (!savedPromotion) {
      return res.status(404).json({ message: 'Saved promotion not found' });
    }

    // Check authorization
    if (savedPromotion.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    savedPromotion.usageCount = (savedPromotion.usageCount || 0) + 1;
    savedPromotion.lastUsed = new Date();

    await savedPromotion.save();

    res.json({
      message: 'Usage tracked',
      promotion: savedPromotion
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

