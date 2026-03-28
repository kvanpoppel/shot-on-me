const mongoose = require('mongoose')
const influencerOfferSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500 },
  payout: { type: Number, required: true, min: 5, max: 500 },
  requirements: { type: String, trim: true, maxlength: 300 },
  deadline: { type: Date },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed', 'approved', 'paid', 'cancelled'], default: 'pending' },
  postUrls: [{ type: String }],
  influencerNote: { type: String, maxlength: 300 },
  venueNote: { type: String, maxlength: 300 },
  completedAt: { type: Date },
  approvedAt: { type: Date },
}, { timestamps: true })
influencerOfferSchema.index({ venueId: 1, status: 1 })
influencerOfferSchema.index({ influencerId: 1, status: 1 })
module.exports = mongoose.model('InfluencerOffer', influencerOfferSchema)
