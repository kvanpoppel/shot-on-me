import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'redeemed', 'expired', 'cancelled'],
    default: 'pending'
  },
  redemptionCode: {
    type: String,
    unique: true,
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: false
  },
  message: {
    type: String,
    default: ''
  },
  recipientName: {
    type: String,
    required: false
  },
  venueName: {
    type: String,
    required: false
  },
  venueAddress: {
    type: String,
    required: false
  },
  venuePlaceId: {
    type: String,
    required: false
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  redeemedAt: Date,
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default to 90 days from now
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  },
  smsSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique redemption code
paymentSchema.pre('save', async function(next) {
  if (!this.redemptionCode) {
    // Generate 8-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.redemptionCode = code;
  }
  next();
});

export default mongoose.model('Payment', paymentSchema);

