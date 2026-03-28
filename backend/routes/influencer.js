const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const InfluencerOffer = require('../models/InfluencerOffer')
const User = require('../models/User')
const Venue = require('../models/Venue')
const Notification = require('../models/Notification')
const Payment = require('../models/Payment')

// GET /api/influencer/eligible — venue owner sees eligible influencers
router.get('/eligible', auth, async (req, res) => {
  try {
    const { venueId } = req.query
    if (!venueId) return res.status(400).json({ message: 'venueId is required' })

    const venue = await Venue.findOne({ _id: venueId, owner: req.user.userId })
    if (!venue) return res.status(403).json({ message: 'Not authorized for this venue' })

    const candidates = await User.find({
      totalCheckIns: { $gte: 3 },
      'stats.postsCount': { $gte: 2 }
    }).select('firstName lastName profilePicture totalCheckIns stats').lean()

    const influencers = candidates
      .map(u => ({
        ...u,
        engagementScore: (u.stats.postsCount * 2) + u.totalCheckIns + (u.stats.friendsCount / 10)
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 20)

    res.json({ influencers })
  } catch (err) {
    console.error('Error fetching eligible influencers:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/influencer/offer — venue creates offer for influencer
router.post('/offer', auth, async (req, res) => {
  try {
    const { influencerId, venueId, title, description, payout, requirements, deadline } = req.body

    if (!influencerId || !venueId || !title || !payout) {
      return res.status(400).json({ message: 'influencerId, venueId, title, and payout are required' })
    }

    const venue = await Venue.findOne({ _id: venueId, owner: req.user.userId })
    if (!venue) return res.status(403).json({ message: 'Not authorized for this venue' })

    const influencer = await User.findById(influencerId)
    if (!influencer) return res.status(404).json({ message: 'Influencer not found' })

    const offer = new InfluencerOffer({
      venueId,
      influencerId,
      title,
      description,
      payout,
      requirements,
      deadline
    })
    await offer.save()

    const notification = new Notification({
      recipient: influencerId,
      actor: req.user.userId,
      type: 'achievement',
      content: `${venue.name} wants to sponsor you for $${payout}`,
      relatedVenue: venueId
    })
    await notification.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`user-${influencerId.toString()}`).emit('influencer:offer', { offer, venueName: venue.name })
      io.to(`user-${influencerId.toString()}`).emit('new-notification', {
        type: 'achievement',
        message: notification.content
      })
    }

    res.status(201).json({ offer })
  } catch (err) {
    console.error('Error creating influencer offer:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/influencer/venue-offers — venue sees all their offers
router.get('/venue-offers', auth, async (req, res) => {
  try {
    const { venueId } = req.query
    if (!venueId) return res.status(400).json({ message: 'venueId is required' })

    const venue = await Venue.findOne({ _id: venueId, owner: req.user.userId })
    if (!venue) return res.status(403).json({ message: 'Not authorized for this venue' })

    const offers = await InfluencerOffer.find({ venueId })
      .populate('influencerId', 'firstName lastName profilePicture')
      .sort('-createdAt')

    res.json({ offers })
  } catch (err) {
    console.error('Error fetching venue offers:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/influencer/my-offers — influencer sees their own offers
router.get('/my-offers', auth, async (req, res) => {
  try {
    const offers = await InfluencerOffer.find({ influencerId: req.user.userId })
      .populate('venueId', 'name address')
      .sort('-createdAt')

    res.json({ offers })
  } catch (err) {
    console.error('Error fetching influencer offers:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/influencer/:id/respond — influencer accepts or declines
router.put('/:id/respond', auth, async (req, res) => {
  try {
    const { action } = req.body
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be accept or decline' })
    }

    const offer = await InfluencerOffer.findById(req.params.id)
    if (!offer) return res.status(404).json({ message: 'Offer not found' })
    if (offer.influencerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (offer.status !== 'pending') {
      return res.status(400).json({ message: 'Offer is no longer pending' })
    }

    offer.status = action === 'accept' ? 'accepted' : 'declined'
    await offer.save()

    if (action === 'accept') {
      const venue = await Venue.findById(offer.venueId).select('owner name')
      const io = req.app.get('io')
      if (io && venue) {
        io.to(`user-${venue.owner.toString()}`).emit('influencer:offer-accepted', { offerId: offer._id })
      }
    }

    res.json({ offer })
  } catch (err) {
    console.error('Error responding to offer:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/influencer/:id/complete — influencer marks offer complete
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { postUrls, influencerNote } = req.body

    const offer = await InfluencerOffer.findById(req.params.id)
    if (!offer) return res.status(404).json({ message: 'Offer not found' })
    if (offer.influencerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (offer.status !== 'accepted') {
      return res.status(400).json({ message: 'Offer must be accepted before completing' })
    }

    offer.status = 'completed'
    offer.completedAt = new Date()
    if (postUrls) offer.postUrls = postUrls
    if (influencerNote) offer.influencerNote = influencerNote
    await offer.save()

    const venue = await Venue.findById(offer.venueId).select('owner name')
    if (venue) {
      const notification = new Notification({
        recipient: venue.owner,
        actor: req.user.userId,
        type: 'achievement',
        content: `An influencer has completed their sponsored post for ${venue.name}`,
        relatedVenue: offer.venueId
      })
      await notification.save()

      const io = req.app.get('io')
      if (io) {
        io.to(`user-${venue.owner.toString()}`).emit('influencer:offer-completed', { offerId: offer._id })
        io.to(`user-${venue.owner.toString()}`).emit('new-notification', {
          type: 'achievement',
          message: notification.content
        })
      }
    }

    res.json({ offer })
  } catch (err) {
    console.error('Error completing offer:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/influencer/:id/approve — venue approves and pays influencer
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const offer = await InfluencerOffer.findById(req.params.id)
    if (!offer) return res.status(404).json({ message: 'Offer not found' })

    const venue = await Venue.findOne({ _id: offer.venueId, owner: req.user.userId })
    if (!venue) return res.status(403).json({ message: 'Not authorized for this venue' })

    if (offer.status !== 'completed') {
      return res.status(400).json({ message: 'Offer must be completed before approving' })
    }

    offer.status = 'paid'
    offer.approvedAt = new Date()
    await offer.save()

    await User.findByIdAndUpdate(offer.influencerId, {
      $inc: { 'wallet.balance': offer.payout, 'influencerStats.totalEarned': offer.payout, 'influencerStats.completedOffers': 1 }
    })

    const payment = new Payment({
      senderId: req.user.userId,
      recipientId: offer.influencerId,
      venueId: offer.venueId,
      amount: offer.payout,
      type: 'transfer',
      status: 'succeeded'
    })
    await payment.save()

    const notification = new Notification({
      recipient: offer.influencerId,
      actor: req.user.userId,
      type: 'payment_received',
      content: `You received $${offer.payout} influencer payout from ${venue.name}`,
      relatedVenue: offer.venueId
    })
    await notification.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`user-${offer.influencerId.toString()}`).emit('influencer:payout', {
        offerId: offer._id,
        payout: offer.payout,
        venueName: venue.name
      })
      io.to(`user-${offer.influencerId.toString()}`).emit('new-notification', {
        type: 'payment_received',
        message: notification.content
      })
    }

    res.json({ offer, payout: offer.payout })
  } catch (err) {
    console.error('Error approving offer:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
