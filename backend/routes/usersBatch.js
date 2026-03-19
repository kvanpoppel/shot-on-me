const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
router.get('/batch', auth, async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') return res.status(400).json({ error: 'ids query parameter is required' });
    const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idList.length === 0) return res.json({ users: [], userMap: {} });
    if (idList.length > 50) return res.status(400).json({ error: 'Maximum 50 IDs per request' });
    const users = await User.find({ _id: { $in: idList } }).select('_id firstName lastName profilePicture userType location').lean();
    const userMap = {};
    for (const user of users) { userMap[user._id.toString()] = user; }
    res.json({ users, userMap });
  } catch (error) {
    console.error('Batch user fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
module.exports = router;
