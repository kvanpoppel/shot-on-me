const mongoose = require('mongoose')
const loyaltyPartnershipSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 300 },
  venueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Venue' }],
  requiredVisits: { type: Number, default: 3, min: 2, max: 10 },
  reward: {
    type: { type: String, enum: ['discount', 'free_item', 'cash', 'points'], default: 'points' },
    value: { type: Number, required: true },
    description: { type: String, maxlength: 200 }
  },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })
loyaltyPartnershipSchema.index({ isActive: 1 })
loyaltyPartnershipSchema.index({ venueIds: 1 })
module.exports = mongoose.model('LoyaltyPartnership', loyaltyPartnershipSchema)
