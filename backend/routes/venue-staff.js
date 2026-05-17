const express = require('express');
const Venue = require('../models/Venue');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: check if user is venue owner
const isOwner = (venue, userId) => venue.owner.toString() === userId.toString();

// Helper: check if user has access (owner or staff)
const hasAccess = (venue, userId) => {
  if (isOwner(venue, userId)) return true;
  return venue.staff.some(s => s.user.toString() === userId.toString());
};

// GET /api/venues/:venueId/staff — list all staff (owner included as virtual entry)
router.get('/:venueId/staff', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId)
      .populate('owner', 'firstName lastName email')
      .populate('staff.user', 'firstName lastName email')
      .populate('staff.addedBy', 'firstName lastName');

    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!hasAccess(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build staff list with owner as first entry
    const ownerEntry = {
      _id: 'owner',
      user: venue.owner,
      role: 'owner',
      addedAt: venue._id.getTimestamp().toISOString(),
      addedBy: null
    };

    const staffEntries = venue.staff.map(s => ({
      _id: s._id.toString(),
      user: s.user,
      role: s.role,
      addedAt: s.addedAt,
      addedBy: s.addedBy
    }));

    res.json({ staff: [ownerEntry, ...staffEntries] });
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/venues/:venueId/staff — add staff by email (owner only)
router.post('/:venueId/staff', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!isOwner(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Only the owner can add staff' });
    }

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (role && !['manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }

    // Look up user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ error: 'No account found with that email. They need to create a venue account first.' });
    }

    if (targetUser.userType !== 'venue') {
      return res.status(400).json({ error: 'That user does not have a venue account. They need to register as a venue user.' });
    }

    // Check not adding self (owner)
    if (targetUser._id.toString() === venue.owner.toString()) {
      return res.status(400).json({ error: 'You are already the owner of this venue' });
    }

    // Check not already added
    const alreadyStaff = venue.staff.some(s => s.user.toString() === targetUser._id.toString());
    if (alreadyStaff) {
      return res.status(400).json({ error: 'This user is already a staff member' });
    }

    venue.staff.push({
      user: targetUser._id,
      role: role || 'staff',
      addedAt: new Date(),
      addedBy: req.user.userId
    });
    await venue.save();

    // Return populated staff entry
    const updated = await Venue.findById(venue._id)
      .populate('staff.user', 'firstName lastName email')
      .populate('staff.addedBy', 'firstName lastName');
    const newEntry = updated.staff[updated.staff.length - 1];

    res.status(201).json({
      message: 'Staff member added',
      staff: {
        _id: newEntry._id.toString(),
        user: newEntry.user,
        role: newEntry.role,
        addedAt: newEntry.addedAt,
        addedBy: newEntry.addedBy
      }
    });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/venues/:venueId/staff/:staffId — update staff role (owner only)
router.put('/:venueId/staff/:staffId', auth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (!isOwner(venue, req.user.userId)) {
      return res.status(403).json({ error: 'Only the owner can update roles' });
    }

    const { role } = req.body;
    if (!role || !['manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }

    const entry = venue.staff.id(req.params.staffId);
    if (!entry) return res.status(404).json({ error: 'Staff member not found' });

    entry.role = role;
    await venue.save();

    res.json({ message: 'Role updated', role });
  } catch (err) {
    console.error('Update staff role error:', err);
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
