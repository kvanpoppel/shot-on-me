const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/batch', auth, async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') return res.status(400).json({ error: 'ids query parameter is required' });

    const rawList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (rawList.length === 0) return res.json({ users: [], userMap: {} });
    if (rawList.length > 50) return res.status(400).json({ error: 'Maximum 50 IDs per request' });

    // Reject non-ObjectId values to prevent injection / enumeration of arbitrary fields
    const validIds = rawList.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== rawList.length) {
      return res.status(400).json({ error: 'One or more IDs are invalid' });
    }

    const users = await User.find({ _id: { $in: validIds } })
      .select('_id firstName lastName profilePicture userType location')
      .lean();

    const userMap = {};
    for (const user of users) { userMap[user._id.toString()] = user; }
    res.json({ users, userMap });
  } catch (error) {
    console.error('Batch user fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
module.exports = router;
