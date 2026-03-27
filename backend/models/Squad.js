const mongoose = require('mongoose');

const squadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 40
  },
  emoji: {
    type: String,
    default: '🔥',
    maxlength: 4
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Pending invites (user IDs who haven't accepted yet)
  pendingInvites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  city: {
    type: String,
    trim: true,
    default: ''
  },
  // All-time territory points per venue
  territory: [{
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    venueName: String,
    points: { type: Number, default: 0 },
    checkIns: { type: Number, default: 0 }
  }],
  // Weekly rolling points (reset every Monday)
  weeklyPoints: {
    type: Number,
    default: 0
  },
  weeklyPointsResetAt: {
    type: Date,
    default: () => getNextMonday()
  },
  // All-time total
  totalPoints: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  maxMembers: {
    type: Number,
    default: 10
  }
}, { timestamps: true });

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day; // days until next Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

squadSchema.index({ leader: 1 });
squadSchema.index({ members: 1 });
squadSchema.index({ city: 1, weeklyPoints: -1 });
squadSchema.index({ totalPoints: -1 });

module.exports = mongoose.model('Squad', squadSchema);
