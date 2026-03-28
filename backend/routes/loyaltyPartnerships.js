const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const mongoose = require('mongoose')
const LoyaltyPartnership = require('../models/LoyaltyPartnership')
const User = require('../models/User')
const CheckIn = require('../models/CheckIn')
const Notification = require('../models/Notification')

// GET /api/loyalty-partnerships — list all active partnerships (public)
router.get('/', async (req, res) => {
  try {
    const now = new Date()
    const partnerships = await LoyaltyPartnership.find({
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }]
    }).populate('venueIds', 'name address')

    res.json({ partnerships })
  } catch (err) {
    console.error('Error fetching loyalty partnerships:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/loyalty-partnerships/progress — user progress across all active partnerships
router.get('/progress', auth, async (req, res) => {
  try {
    const now = new Date()
    const partnerships = await LoyaltyPartnership.find({
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }]
    }).populate('venueIds', 'name address')

    const user = await User.findById(req.user.userId).select('loyaltyProgress')

    const result = await Promise.all(partnerships.map(async (partnership) => {
      const venueIdStrings = partnership.venueIds.map(v => v._id.toString())

      const visitedCheckIns = await CheckIn.distinct('venue', {
        user: new mongoose.Types.ObjectId(req.user.userId),
        venue: { $in: partnership.venueIds.map(v => v._id) }
      })

      const visitedVenueIds = visitedCheckIns.map(id => id.toString()).filter(id => venueIdStrings.includes(id))
      const uniqueVisited = [...new Set(visitedVenueIds)]

      const progress = user.loyaltyProgress?.find(
        p => p.partnershipId?.toString() === partnership._id.toString()
      )

      return {
        partnership,
        visitedVenueIds: uniqueVisited,
        remainingCount: Math.max(0, partnership.requiredVisits - uniqueVisited.length),
        completed: uniqueVisited.length >= partnership.requiredVisits,
        rewardClaimed: progress?.rewardClaimed || false
      }
    }))

    res.json({ partnerships: result })
  } catch (err) {
    console.error('Error fetching partnership progress:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/loyalty-partnerships/claim/:id — user claims reward
router.post('/claim/:id', auth, async (req, res) => {
  try {
    const partnership = await LoyaltyPartnership.findById(req.params.id)
    if (!partnership || !partnership.isActive) {
      return res.status(404).json({ message: 'Partnership not found or inactive' })
    }

    const now = new Date()
    if (partnership.expiresAt && partnership.expiresAt < now) {
      return res.status(400).json({ message: 'This partnership has expired' })
    }

    const user = await User.findById(req.user.userId)
    const existingProgress = user.loyaltyProgress?.find(
      p => p.partnershipId?.toString() === partnership._id.toString()
    )

    if (existingProgress?.rewardClaimed) {
      return res.status(400).json({ message: 'Reward already claimed' })
    }

    const visitedCheckIns = await CheckIn.distinct('venue', {
      user: new mongoose.Types.ObjectId(req.user.userId),
      venue: { $in: partnership.venueIds }
    })

    const venueIdStrings = partnership.venueIds.map(v => v.toString())
    const uniqueVisited = [...new Set(visitedCheckIns.map(id => id.toString()).filter(id => venueIdStrings.includes(id)))]

    if (uniqueVisited.length < partnership.requiredVisits) {
      return res.status(400).json({
        message: `You need to visit ${partnership.requiredVisits - uniqueVisited.length} more partner venue(s)`,
        visited: uniqueVisited.length,
        required: partnership.requiredVisits
      })
    }

    const update = {}

    if (partnership.reward.type === 'cash') {
      update.$inc = { 'wallet.balance': partnership.reward.value }
    } else if (partnership.reward.type === 'points') {
      update.$inc = { points: partnership.reward.value, totalPointsEarned: partnership.reward.value }
    }

    const progressEntry = {
      partnershipId: partnership._id,
      visitedVenueIds: uniqueVisited.map(id => new mongoose.Types.ObjectId(id)),
      rewardClaimed: true,
      claimedAt: new Date()
    }

    if (existingProgress) {
      await User.updateOne(
        { _id: req.user.userId, 'loyaltyProgress.partnershipId': partnership._id },
        { $set: { 'loyaltyProgress.$': progressEntry }, ...update }
      )
    } else {
      await User.findByIdAndUpdate(req.user.userId, {
        $push: { loyaltyProgress: progressEntry },
        ...update
      })
    }

    const notification = new Notification({
      recipient: req.user.userId,
      actor: req.user.userId,
      type: 'achievement',
      content: `You claimed your reward from the "${partnership.name}" loyalty partnership!`
    })
    await notification.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`user-${req.user.userId.toString()}`).emit('new-notification', {
        type: 'achievement',
        message: notification.content
      })
    }

    res.json({ success: true, reward: partnership.reward })
  } catch (err) {
    console.error('Error claiming partnership reward:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/loyalty-partnerships — admin/owner creates a partnership
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('isOwner role')
    if (!user.isOwner && user.role !== 'admin') {
      return res.status(403).json({ message: 'Owner or admin access required' })
    }

    const { name, description, venueIds, requiredVisits, reward, expiresAt } = req.body

    if (!name || !reward?.value) {
      return res.status(400).json({ message: 'name and reward.value are required' })
    }

    const partnership = new LoyaltyPartnership({
      name,
      description,
      venueIds: venueIds || [],
      requiredVisits,
      reward,
      expiresAt,
      createdBy: req.user.userId
    })
    await partnership.save()

    res.status(201).json({ partnership })
  } catch (err) {
    console.error('Error creating loyalty partnership:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
