const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Venue = require('../models/Venue');
const VenueRequest = require('../models/VenueRequest');
const { sendVenueRequestAdminEmail, sendVenueApprovalEmail, sendVenueDenialEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/sms');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Admin-only middleware (reuses same pattern as owner.js)
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('role isOwner');
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.isOwner === true || user.role === 'admin' || user.role === 'owner') return next();
    res.status(403).json({ message: 'Access denied' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/venue-requests — public, submit a venue signup request
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { venueName, venueType, address, city, state, ownerName, email, phone, website, description } = req.body;

    if (!venueName || !venueType || !address || !city || !state || !ownerName || !email || !phone) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const ALLOWED_STATES = ['IN', 'IL', 'KY', 'TN', 'MI', 'OH'];
    if (!ALLOWED_STATES.includes(state)) {
      return res.status(400).json({ message: 'We are not yet available in that state.' });
    }

    // Check for duplicate pending/approved request
    const existing = await VenueRequest.findOne({ email: email.toLowerCase(), status: { $in: ['pending', 'approved'] } });
    if (existing) {
      return res.status(409).json({ message: 'A request with this email is already pending or approved.' });
    }

    let photoUrl = '';
    let photoPublicId = '';
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'shot-on-me/venue-requests', timeout: 60000 },
            (error, result) => { if (error) reject(error); else resolve(result); }
          ).end(req.file.buffer);
        });
        photoUrl = uploadResult.secure_url;
        photoPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.error('Photo upload failed (non-fatal):', uploadErr.message);
      }
    }

    const venueRequest = await VenueRequest.create({
      venueName, venueType, address, city, state, ownerName,
      email: email.toLowerCase(), phone, website: website || '',
      description: description || '', photoUrl, photoPublicId
    });

    // Notify admin via email + SMS (fire and forget)
    const adminEmail = process.env.ADMIN_EMAIL || 'shotonme@yahoo.com';
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    sendVenueRequestAdminEmail(adminEmail, venueRequest).catch(console.error);
    if (adminPhone) {
      sendSMS(adminPhone, `New venue request: ${venueName} in ${city}, ${state}. Log in to approve or deny.`).catch(console.error);
    }

    res.status(201).json({ message: 'Request submitted successfully', id: venueRequest._id });
  } catch (error) {
    console.error('Venue request error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// GET /api/venue-requests — admin only, list all requests
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const filter = status === 'all' ? {} : { status };
    const requests = await VenueRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await VenueRequest.countDocuments(filter);
    res.json({ requests, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Fetch venue requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/venue-requests/:id/approve — admin only
router.put('/:id/approve', auth, isAdmin, async (req, res) => {
  try {
    const venueReq = await VenueRequest.findById(req.params.id);
    if (!venueReq) return res.status(404).json({ message: 'Request not found' });
    if (venueReq.status === 'approved') return res.status(400).json({ message: 'Already approved' });

    // Create venue owner user account
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const nameParts = venueReq.ownerName.trim().split(' ');
    const firstName = nameParts[0] || venueReq.ownerName;
    const lastName = nameParts.slice(1).join(' ') || '';

    const fullName = `${firstName} ${lastName}`.trim();

    let ownerUser = await User.findOne({ email: venueReq.email.toLowerCase() });
    if (!ownerUser) {
      ownerUser = await User.create({
        name: fullName,
        firstName,
        lastName,
        email: venueReq.email.toLowerCase(),
        password: hashedPassword,
        phoneNumber: venueReq.phone,
        userType: 'venue',
        isVenueOwner: true
      });
    }

    // Create the Venue document
    const slugBase = venueReq.venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // Map venue type to existing category enum
    const categoryMap = {
      'Bar': 'bar', 'Restaurant': 'restaurant', 'Nightclub': 'club',
      'Coffee Shop': 'cafe', 'Lounge': 'bar'
    };

    const venue = await Venue.create({
      name: venueReq.venueName,
      slug,
      owner: ownerUser._id,
      address: {
        street: venueReq.address,
        city: venueReq.city,
        state: venueReq.state,
        country: 'US'
      },
      description: venueReq.description,
      category: categoryMap[venueReq.venueType] || 'bar',
      coverPhoto: venueReq.photoUrl,
      branding: { logoUrl: venueReq.photoUrl },
      isActive: true
    });

    // Mark request approved
    venueReq.status = 'approved';
    venueReq.venueId = venue._id;
    venueReq.reviewedAt = new Date();
    venueReq.reviewedBy = req.user.userId;
    await venueReq.save();

    // Generate a password-set token so the venue owner can set their password directly
    const resetToken = jwt.sign(
      { userId: ownerUser._id, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '72h' }
    );

    // Notify venue owner with set-password link
    sendVenueApprovalEmail(venueReq.email, firstName, venueReq.venueName, resetToken).catch(console.error);
    sendSMS(venueReq.phone, `Shot On Me: Your venue ${venueReq.venueName} has been approved! Sign in at venue.shotonme.com to get started.`).catch(console.error);

    res.json({ message: 'Venue approved', venueId: venue._id, userId: ownerUser._id });
  } catch (error) {
    console.error('Approve venue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/venue-requests/:id/deny — admin only
router.put('/:id/deny', auth, isAdmin, async (req, res) => {
  try {
    const { note = '' } = req.body;
    const venueReq = await VenueRequest.findById(req.params.id);
    if (!venueReq) return res.status(404).json({ message: 'Request not found' });
    if (venueReq.status === 'denied') return res.status(400).json({ message: 'Already denied' });

    venueReq.status = 'denied';
    venueReq.adminNote = note;
    venueReq.reviewedAt = new Date();
    venueReq.reviewedBy = req.user.userId;
    await venueReq.save();

    const nameParts = venueReq.ownerName.trim().split(' ');
    const firstName = nameParts[0] || venueReq.ownerName;

    sendVenueDenialEmail(venueReq.email, firstName, venueReq.venueName, note).catch(console.error);
    sendSMS(venueReq.phone, `Shot On Me: Unfortunately we were unable to approve your venue ${venueReq.venueName} at this time. Questions? Email shotonme@yahoo.com.`).catch(console.error);

    res.json({ message: 'Venue request denied' });
  } catch (error) {
    console.error('Deny venue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
