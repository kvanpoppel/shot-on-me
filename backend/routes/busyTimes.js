const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Venue = require('../models/Venue')
const { predictBusyTimes } = require('../services/busyTimePrediction')

// GET /api/busy-times/:venueId
router.get('/:venueId', auth, async (req, res) => {
  try {
    const { venueId } = req.params

    const venue = await Venue.findOne({ _id: venueId, owner: req.user.userId })
    if (!venue) return res.status(403).json({ message: 'Not authorized for this venue' })

    const result = await predictBusyTimes(venueId)
    res.json(result)
  } catch (err) {
    console.error('Error predicting busy times:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
