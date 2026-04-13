const mongoose = require('mongoose')

const fizzFriendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
}, { timestamps: true })

fizzFriendRequestSchema.index({ from: 1, to: 1 }, { unique: true })
fizzFriendRequestSchema.index({ to: 1, status: 1 })

module.exports = mongoose.model('FizzFriendRequest', fizzFriendRequestSchema)
