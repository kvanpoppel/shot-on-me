const express = require('express');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: check if user is venue owner
const isOwner = (venue, userId) => venue.owner.toString() === userId.toString();

// Helper: check if user has access (owner or staff)
const hasAccess = (venue, userId) => {
  if (isOwner(venue, userId)) return true;
  return venue.staff.some(s => s.user.toString() === userId.toString());
};

// POST /api/venues/join — join a venue using access code
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Access code is required' });

    const venue = await Venue.findOne({ staffCode: code.trim() });
    if (!venue) return res.status(404).json({ error: 'Invalid access code' });

    // Check not already owner
    if (isOwner(venue, req.user.userId)) {
      return res.status(400).json({ error: 'You are the owner of this venue' });
    }

    // Check not already staff
    const already = venue.staff.some(s => s.user.toString() === req.user.userId.toString());
    if (already) {
      return res.status(400).json({ error: 'You already have access to this venue' });
    }

    venue.staff.push({
      user: req.user.userId,
      role: 'staff',
      addedAt: new Date()
    });
    await venue.save();

    res.json({ message: 'Joined venue successfully', venueName: venue.name });
  } catch (err) {
    console.error('Join venue error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/venues/:venueId/staff-code — owner sets/changes the access code
router.put('/:venueId/staff-code', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!isOwner(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Only the owner can set the access code' });
    }

    const { code } = req.body;
    if (!code || code.trim().length < 4) {
      return res.status(400).json({ error: 'Code must be at least 4 characters' });
    }

    // Make sure code is unique across all venues
    const existing = await Venue.findOne({ staffCode: code.trim(), _id: { $ne: venue._id } });
    if (existing) {
      return res.status(400).json({ error: 'This code is already in use. Choose a different one.' });
    }

    venue.staffCode = code.trim();
    await venue.save();

    res.json({ message: 'Access code updated', code: venue.staffCode });
  } catch (err) {
    console.error('Set staff code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/venues/:venueId/staff-code — owner removes the access code
router.delete('/:venueId/staff-code', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!isOwner(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Only the owner can remove the access code' });
    }

    venue.staffCode = null;
    await venue.save();

    res.json({ message: 'Access code removed' });
  } catch (err) {
    console.error('Remove staff code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/venues/:venueId/staff — list all staff
router.get('/:venueId/staff', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId)
      .populate('owner', 'firstName lastName email')
      .populate('staff.user', 'firstName lastName email');

    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!hasAccess(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ownerEntry = {
      _id: 'owner',
      user: venue.owner,
      role: 'owner',
      addedAt: venue._id.getTimestamp().toISOString()
    };

    const staffEntries = venue.staff.map(s => ({
      _id: s._id.toString(),
      user: s.user,
      role: s.role,
      addedAt: s.addedAt
    }));

    // Only return staffCode to the owner
    const staffCode = isOwner(venue, req.user.userId) ? venue.staffCode : undefined;

    res.json({ staff: [ownerEntry, ...staffEntries], staffCode });
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/venues/:venueId/staff/:staffId — remove staff (owner only)
router.delete('/:venueId/staff/:staffId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!isOwner(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Only the owner can remove staff' });
    }

    const entry = venue.staff.id(req.params.staffId);
    if (!entry) return res.status(404).json({ error: 'Staff member not found' });

    venue.staff.pull(req.params.staffId);
    await venue.save();

    res.json({ message: 'Staff member removed' });
  } catch (err) {
    console.error('Remove staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
