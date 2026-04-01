const mongoose = require('mongoose');

const venueRequestSchema = new mongoose.Schema({
  venueName: { type: String, required: true, trim: true },
  venueType: {
    type: String,
    required: true,
    enum: ['Bar', 'Restaurant', 'Nightclub', 'Coffee Shop', 'Lounge']
  },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: {
    type: String,
    required: true,
    enum: ['IN', 'IL', 'KY', 'TN', 'MI', 'OH']
  },
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  website: { type: String, trim: true, default: '' },
  photoUrl: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },
  description: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  adminNote: { type: String, default: '' },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

venueRequestSchema.index({ status: 1, createdAt: -1 });
venueRequestSchema.index({ email: 1 });

module.exports = mongoose.model('VenueRequest', venueRequestSchema);
