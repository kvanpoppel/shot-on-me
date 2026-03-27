const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Squad = require('../models/Squad');
const User = require('../models/User');
const Venue = require('../models/Venue');

// ─── Create squad ──────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, emoji, city, isPublic } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Squad name must be at least 2 characters' });
    }

    // User can only be in one squad at a time
    const existing = await Squad.findOne({ members: req.user.userId });
    if (existing) {
      return res.status(409).json({ message: 'You are already in a squad. Leave it before creating a new one.' });
    }

    const user = await User.findById(req.user.userId).select('location');
    const squad = new Squad({
      name: name.trim(),
      emoji: emoji || '🔥',
      leader: req.user.userId,
      members: [req.user.userId],
      city: city?.trim() || '',
      isPublic: isPublic !== false
    });
    await squad.save();

    res.status(201).json({ success: true, squad });
  } catch (error) {
    console.error('Error creating squad:', error);
    res.status(500).json({ message: 'Failed to create squad', error: undefined });
  }
});

// ─── Get my squad ───────────────────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const squad = await Squad.findOne({ members: req.user.userId })
      .populate('leader', 'name profilePicture')
      .populate('members', 'name profilePicture totalCheckIns points')
      .populate('territory.venueId', 'name address');

    if (!squad) return res.json({ success: true, squad: null });

    // Reset weekly points if Monday passed
    const now = new Date();
    if (squad.weeklyPointsResetAt && now >= squad.weeklyPointsResetAt) {
      squad.weeklyPoints = 0;
      squad.weeklyPointsResetAt = getNextMonday();
      await squad.save();
    }

    res.json({ success: true, squad });
  } catch (error) {
    console.error('Error fetching squad:', error);
    res.status(500).json({ message: 'Failed to fetch squad', error: undefined });
  }
});

// ─── Leaderboard ────────────────────────────────────────────────────────────────
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const { city, type = 'weekly', limit = 20 } = req.query;
    const safeLimit = Math.min(50, parseInt(limit) || 20);

    const filter = { isPublic: true };
    if (city) filter.city = new RegExp(city, 'i');

    const sortField = type === 'alltime' ? 'totalPoints' : 'weeklyPoints';

    const squads = await Squad.find(filter)
      .select('name emoji city weeklyPoints totalPoints members leader')
      .populate('leader', 'name profilePicture')
      .sort({ [sortField]: -1 })
      .limit(safeLimit)
      .lean();

    // Annotate with rank + member count
    const ranked = squads.map((s, i) => ({
      ...s,
      rank: i + 1,
      memberCount: s.members?.length || 0
    }));

    res.json({ success: true, leaderboard: ranked, type });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard', error: undefined });
  }
});

// ─── Invite member ───────────────────────────────────────────────────────────────
router.post('/invite', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const squad = await Squad.findOne({ leader: req.user.userId });
    if (!squad) return res.status(404).json({ message: 'You are not a squad leader' });

    if (squad.members.length >= squad.maxMembers) {
      return res.status(400).json({ message: `Squad is full (max ${squad.maxMembers} members)` });
    }

    if (squad.members.includes(userId) || squad.pendingInvites.includes(userId)) {
      return res.status(409).json({ message: 'User already in squad or already invited' });
    }

    const targetUser = await Squad.findOne({ members: userId });
    if (targetUser) return res.status(409).json({ message: 'User is already in another squad' });

    squad.pendingInvites.push(userId);
    await squad.save();

    // Notify invitee via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('squad:invited', {
        squadId: squad._id,
        squadName: squad.name,
        squadEmoji: squad.emoji
      });
    }

    res.json({ success: true, message: 'Invite sent' });
  } catch (error) {
    console.error('Error inviting to squad:', error);
    res.status(500).json({ message: 'Failed to invite', error: undefined });
  }
});

// ─── Accept / decline invite ────────────────────────────────────────────────────
router.post('/invite/respond', auth, async (req, res) => {
  try {
    const { squadId, accept } = req.body;
    if (!squadId) return res.status(400).json({ message: 'squadId is required' });

    const squad = await Squad.findById(squadId);
    if (!squad) return res.status(404).json({ message: 'Squad not found' });

    if (!squad.pendingInvites.includes(req.user.userId)) {
      return res.status(400).json({ message: 'No pending invite found' });
    }

    squad.pendingInvites = squad.pendingInvites.filter(id => id.toString() !== req.user.userId);

    if (accept) {
      // Check they're not in another squad
      const alreadyIn = await Squad.findOne({ members: req.user.userId });
      if (alreadyIn) {
        await squad.save();
        return res.status(409).json({ message: 'You are already in a squad' });
      }
      squad.members.push(req.user.userId);
    }
    await squad.save();

    res.json({ success: true, joined: !!accept, squad: accept ? squad : undefined });
  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({ message: 'Failed to respond to invite', error: undefined });
  }
});

// ─── Leave squad ────────────────────────────────────────────────────────────────
router.post('/leave', auth, async (req, res) => {
  try {
    const squad = await Squad.findOne({ members: req.user.userId });
    if (!squad) return res.status(404).json({ message: 'You are not in a squad' });

    if (squad.leader.toString() === req.user.userId) {
      // Leader leaving — transfer leadership or disband
      const remaining = squad.members.filter(m => m.toString() !== req.user.userId);
      if (remaining.length === 0) {
        await Squad.findByIdAndDelete(squad._id);
        return res.json({ success: true, message: 'Squad disbanded' });
      }
      squad.leader = remaining[0];
      squad.members = remaining;
    } else {
      squad.members = squad.members.filter(m => m.toString() !== req.user.userId);
    }
    await squad.save();
    res.json({ success: true, message: 'Left squad' });
  } catch (error) {
    console.error('Error leaving squad:', error);
    res.status(500).json({ message: 'Failed to leave squad', error: undefined });
  }
});

// ─── Award territory points (called from checkins.js) ──────────────────────────
// Not an HTTP route — exported function
async function awardSquadTerritoryPoints(userId, venueId, venueName, points = 5) {
  try {
    const squad = await Squad.findOne({ members: userId });
    if (!squad) return;

    const now = new Date();
    // Reset weekly if needed
    if (squad.weeklyPointsResetAt && now >= squad.weeklyPointsResetAt) {
      squad.weeklyPoints = 0;
      squad.weeklyPointsResetAt = getNextMonday();
    }

    squad.weeklyPoints += points;
    squad.totalPoints += points;

    // Update territory for this venue
    const territory = squad.territory.find(t => t.venueId?.toString() === venueId.toString());
    if (territory) {
      territory.points += points;
      territory.checkIns += 1;
    } else {
      squad.territory.push({ venueId, venueName, points, checkIns: 1 });
    }

    await squad.save();
  } catch (err) {
    console.error('Squad territory award error:', err.message);
  }
}

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = router;
module.exports.awardSquadTerritoryPoints = awardSquadTerritoryPoints;
