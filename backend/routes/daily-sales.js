const express = require('express');
const DailySales = require('../models/DailySales');
const Venue = require('../models/Venue');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/daily-sales — log today's sales
router.post('/', auth, async (req, res) => {
  try {
    const { totalSales, notes, date } = req.body;
    if (totalSales == null || totalSales < 0) {
      return res.status(400).json({ error: 'Total sales amount is required' });
    }

    // Find venue user owns or is staff on
    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    });
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    const salesDate = date || new Date().toISOString().split('T')[0];

    const entry = await DailySales.findOneAndUpdate(
      { venue: venue._id, date: salesDate },
      { totalSales, notes: notes || '', enteredBy: req.user.userId },
      { upsert: true, new: true }
    );

    res.json({ message: 'Sales logged', entry });
  } catch (err) {
    console.error('Log sales error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/daily-sales — get sales history + SOM revenue for comparison
router.get('/', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(90, Math.max(7, parseInt(days) || 30));

    const venue = await Venue.findOne({
      $or: [{ owner: req.user.userId }, { 'staff.user': req.user.userId }]
    });
    if (!venue) return res.status(404).json({ error: 'No venue found' });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    const startStr = startDate.toISOString().split('T')[0];

    // Get daily sales entries
    const sales = await DailySales.find({
      venue: venue._id,
      date: { $gte: startStr }
    }).sort({ date: -1 }).lean();

    // Get SOM/Revig revenue for same period (redeemed payments at this venue)
    const somRevenue = await Payment.aggregate([
      {
        $match: {
          venueId: venue._id,
          status: { $in: ['succeeded', 'redeemed'] },
          createdAt: { $gte: startDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalLogged = sales.reduce((sum, s) => sum + s.totalSales, 0);
    const somTotal = somRevenue[0]?.total || 0;

    res.json({
      sales,
      summary: {
        totalLogged,
        somRevenue: somTotal,
        somPercent: totalLogged > 0 ? Math.round((somTotal / totalLogged) * 100) : 0,
        daysLogged: sales.length,
        periodDays: daysNum
      }
    });
  } catch (err) {
    console.error('Get sales error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
