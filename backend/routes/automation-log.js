const express = require('express');
const AutomationLog = require('../models/AutomationLog');
const Venue = require('../models/Venue');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/automation-log — recent automation activity for venue
router.get('/', auth, async (req, res) => {
  try {
    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    });
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const logs = await AutomationLog.find({ venue: venue._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ logs });
  } catch (err) {
    console.error('Automation log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
