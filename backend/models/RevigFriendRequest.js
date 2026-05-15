const mongoose = require('mongoose')

const revigFriendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
}, { timestamps: true })

revigFriendRequestSchema.index({ from: 1, to: 1 }, { unique: true })
revigFriendRequestSchema.index({ to: 1, status: 1 })

module.exports = mongoose.model('RevigFriendRequest', revigFriendRequestSchema)
