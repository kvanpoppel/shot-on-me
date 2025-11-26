const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'US' }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  description: String,
  category: {
    type: String,
    enum: ['restaurant', 'bar', 'cafe', 'club', 'other'],
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  promotions: [{
    title: String,
    description: String,
    discount: Number,
    validUntil: Date,
    isActive: { type: Boolean, default: true }
  }],
  schedule: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  }
}, {\n  timestamps: true\n});\n\n// Index for geospatial queries\nvenueSchema.index({ location: '2dsphere' });\nvenueSchema.index({ owner: 1 });\nvenueSchema.index({ isActive: 1 });\n\nmodule.exports = mongoose.model('Venue', venueSchema);
