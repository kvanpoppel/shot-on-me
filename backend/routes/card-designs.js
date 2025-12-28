const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const VirtualCard = require('../models/VirtualCard');
const stripeUtils = require('../utils/stripe');
const cloudinary = require('cloudinary').v2;

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Upload custom card design image
 * User uploads their image, we overlay "Shot On Me" branding, then create Stripe design
 */
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    if (!stripeUtils.isStripeConfigured()) {
      return res.status(503).json({ 
        error: 'Stripe is not configured',
        message: 'Card design upload is currently unavailable'
      });
    }

    // Check if user has a virtual card
    const virtualCard = await VirtualCard.findOne({ user: userId });
    if (!virtualCard) {
      return res.status(400).json({ 
        message: 'You must have a virtual card before customizing its design',
        error: 'No virtual card found'
      });
    }

    // Upload image to Cloudinary with "Shot On Me" overlay
    // We'll create a design that includes the user's image with branding overlay
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'shot-on-me/card-designs',
          transformation: [
            { width: 672, height: 424, crop: 'fill', gravity: 'center' }, // Standard card size
            { overlay: 'shot-on-me:logo', width: 0.3, gravity: 'south_east', y: 20 }, // Shot On Me logo overlay
            { quality: 'auto', format: 'png' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Create Stripe Issuing Design
    // Note: Stripe Issuing Designs API requires the image to be hosted publicly
    // We'll use the Cloudinary URL
    const stripe = stripeUtils.stripe;
    
    // Create the design in Stripe
    const design = await stripe.issuing.personalizationDesigns.create({
      name: `Custom Design - ${user.name}`,
      physical: {
        // For physical cards (if you add them later)
      },
      virtual: {
        // For virtual cards - this is what we need
        card_art: uploadResult.secure_url, // User's image with branding overlay
      },
      metadata: {
        userId: userId.toString(),
        app: 'shot-on-me',
        cloudinaryPublicId: uploadResult.public_id
      }
    });

    // Update virtual card with design ID
    virtualCard.customDesignId = design.id;
    virtualCard.customDesignUrl = uploadResult.secure_url;
    await virtualCard.save();

    res.json({
      success: true,
      designId: design.id,
      designUrl: uploadResult.secure_url,
      message: 'Custom card design uploaded successfully! Your card will use this design.'
    });

  } catch (error) {
    console.error('Error uploading card design:', error);
    res.status(500).json({ 
      message: 'Failed to upload card design',
      error: error.message 
    });
  }
});

/**
 * Get user's custom card design
 */
router.get('/my-design', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const virtualCard = await VirtualCard.findOne({ user: userId });
    
    if (!virtualCard || !virtualCard.customDesignId) {
      return res.json({ hasDesign: false });
    }

    res.json({
      hasDesign: true,
      designId: virtualCard.customDesignId,
      designUrl: virtualCard.customDesignUrl
    });
  } catch (error) {
    console.error('Error fetching card design:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Remove custom design (revert to default)
 */
router.delete('/my-design', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const virtualCard = await VirtualCard.findOne({ user: userId });
    
    if (virtualCard && virtualCard.customDesignId) {
      // Optionally delete from Cloudinary
      if (virtualCard.customDesignUrl) {
        try {
          const publicId = virtualCard.customDesignUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`shot-on-me/card-designs/${publicId}`);
        } catch (cloudinaryError) {
          console.warn('Could not delete from Cloudinary:', cloudinaryError);
        }
      }

      virtualCard.customDesignId = undefined;
      virtualCard.customDesignUrl = undefined;
      await virtualCard.save();
    }

    res.json({ 
      success: true,
      message: 'Custom design removed. Card will use default design.'
    });
  } catch (error) {
    console.error('Error removing card design:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

