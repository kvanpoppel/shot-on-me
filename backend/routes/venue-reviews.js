const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Venue = require('../models/Venue');
const VenueReview = require('../models/VenueReview');
const CheckIn = require('../models/CheckIn');

// Create or update review
router.post('/:venueId/review', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user has checked in (for verified reviews)
    const checkIn = await CheckIn.findOne({
      user: userId,
      venue: venueId
    }).sort({ createdAt: -1 });

    // Create or update review
    let venueReview = await VenueReview.findOne({
      venue: venueId,
      user: userId
    });

    if (venueReview) {
      // Update existing review
      venueReview.rating = rating;
      venueReview.review = review || '';
      venueReview.isVerified = !!checkIn;
      if (checkIn) {
        venueReview.checkInId = checkIn._id;
      }
      await venueReview.save();
    } else {
      // Create new review
      venueReview = new VenueReview({
        venue: venueId,
        user: userId,
        rating,
        review: review || '',
        isVerified: !!checkIn,
        checkInId: checkIn?._id
      });
      await venueReview.save();
    }

    // Update venue rating
    const allReviews = await VenueReview.find({ venue: venueId });
    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
    venue.rating = {
      average: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      count: allReviews.length
    };
    await venue.save();

    res.json({
      message: 'Review saved successfully',
      review: venueReview,
      venueRating: venue.rating
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reviews for a venue
router.get('/:venueId/reviews', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const reviews = await VenueReview.find({ venue: venueId })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Privacy: Don't expose full user details
    const sanitizedReviews = reviews.map(r => ({
      _id: r._id,
      rating: r.rating,
      review: r.review,
      isVerified: r.isVerified,
      user: {
        id: r.user._id,
        name: r.user.name,
        profilePicture: r.user.profilePicture
      },
      createdAt: r.createdAt
    }));

    res.json({ reviews: sanitizedReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's review for a venue
router.get('/:venueId/my-review', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const review = await VenueReview.findOne({
      venue: venueId,
      user: req.user.userId
    });

    res.json({ review: review || null });
  } catch (error) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete review
router.delete('/:venueId/review', auth, async (req, res) => {
  try {
    const { venueId } = req.params;
    const review = await VenueReview.findOneAndDelete({
      venue: venueId,
      user: req.user.userId
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Recalculate venue rating
    const allReviews = await VenueReview.find({ venue: venueId });
    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const venue = await Venue.findById(venueId);
    if (venue) {
      venue.rating = {
        average: Math.round(averageRating * 10) / 10,
        count: allReviews.length
      };
      await venue.save();
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


