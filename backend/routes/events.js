const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');

// Get events (all, by venue, or upcoming)
router.get('/', auth, async (req, res) => {
  try {
    const { venueId, upcoming, tonight } = req.query;
    const query = { isActive: true };

    if (venueId) {
      query.venue = venueId;
    }

    const now = new Date();
    if (upcoming === 'true') {
      query.startTime = { $gte: now };
    } else if (tonight === 'true') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.startTime = { $lte: tomorrow };
      query.endTime = { $gte: now };
    }

    const events = await Event.find(query)
      .populate('venue', 'name address location category')
      .populate('rsvps.user', 'name profilePicture')
      .sort({ startTime: 1 })
      .limit(50);

    // Check if user has RSVP'd
    const user = await User.findById(req.user.userId);
    const eventsWithRSVP = events.map(event => {
      const hasRSVPd = event.rsvps.some(r => r.user._id.toString() === user._id.toString());
      const isAttending = event.attendees.some(a => a.user.toString() === user._id.toString());
      return {
        ...event.toObject(),
        hasRSVPd,
        isAttending,
        rsvpCount: event.rsvps.length,
        attendeeCount: event.attendees.length
      };
    });

    res.json({ events: eventsWithRSVP });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create event (venue owner only)
router.post('/', auth, async (req, res) => {
  try {
    const { venueId, title, description, type, startTime, endTime, coverCharge, rsvpRequired, image } = req.body;

    if (!venueId || !title || !description || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is venue owner
    if (venue.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to create events for this venue' });
    }

    const event = new Event({
      venue: venueId,
      title,
      description,
      type: type || 'other',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      coverCharge: coverCharge || 0,
      rsvpRequired: rsvpRequired || false,
      image
    });

    await event.save();
    await event.populate('venue', 'name address location');

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// RSVP to event
router.post('/:eventId/rsvp', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already RSVP'd
    const existingRSVP = event.rsvps.find(r => r.user.toString() === req.user.userId);
    if (existingRSVP) {
      return res.status(400).json({ message: 'Already RSVP\'d to this event' });
    }

    event.rsvps.push({
      user: req.user.userId,
      rsvpedAt: new Date()
    });

    await event.save();
    await event.populate('venue', 'name address');

    res.json({
      message: 'RSVP successful',
      event
    });
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel RSVP
router.delete('/:eventId/rsvp', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.rsvps = event.rsvps.filter(r => r.user.toString() !== req.user.userId);
    await event.save();

    res.json({
      message: 'RSVP cancelled',
      event
    });
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check in to event (mark as attending)
router.post('/:eventId/checkin', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already checked in
    const existingCheckIn = event.attendees.find(a => a.user.toString() === req.user.userId);
    if (existingCheckIn) {
      return res.status(400).json({ message: 'Already checked in to this event' });
    }

    event.attendees.push({
      user: req.user.userId,
      checkedInAt: new Date()
    });

    await event.save();

    // Also create a regular check-in
    const venue = await Venue.findById(event.venue);
    if (venue) {
      const checkIn = new CheckIn({
        user: req.user.userId,
        venue: event.venue,
        points: 10,
        notes: `Attending: ${event.title}`
      });
      await checkIn.save();
    }

    res.json({
      message: 'Checked in to event',
      event
    });
  } catch (error) {
    console.error('Error checking in to event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

