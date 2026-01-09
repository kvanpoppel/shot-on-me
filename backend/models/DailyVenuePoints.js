const mongoose = require('mongoose');

const dailyVenuePointsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  tapAndPayPoints: {
    type: Number,
    default: 0,
    min: 0,
    max: 2
  },
  checkInPoints: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  transactions: [{
    type: {
      type: String,
      enum: ['tap_and_pay', 'check_in'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      sparse: true // Only for tap_and_pay
    },
    checkInId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckIn',
      sparse: true // Only for check_in
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one record per user-venue-date
dailyVenuePointsSchema.index({ user: 1, venue: 1, date: 1 }, { unique: true });

// Helper method to get start of day
dailyVenuePointsSchema.statics.getStartOfDay = function(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMilliseconds(0);
  return d;
};

// Helper method to award points
dailyVenuePointsSchema.methods.awardPoints = function(type, points, referenceId) {
  // Validate type
  if (type !== 'tap_and_pay' && type !== 'check_in') {
    throw new Error('Invalid transaction type');
  }

  // Check daily limit first
  if (this.totalPoints >= 3) {
    return { awarded: 0, reason: 'Daily limit of 3 points per venue already reached' };
  }

  // Calculate points to award based on type and current state
  let pointsToAward = 0;

  if (type === 'tap_and_pay') {
    // Can only award 2 points for tap_and_pay
    if (this.tapAndPayPoints >= 2) {
      return { awarded: 0, reason: 'Tap n Pay points already awarded today' };
    }
    // Award up to 2 points, but respect daily limit of 3
    const availableForTapAndPay = Math.min(2 - this.tapAndPayPoints, 3 - this.totalPoints);
    pointsToAward = Math.min(points, availableForTapAndPay);
    
    if (pointsToAward > 0) {
      this.tapAndPayPoints += pointsToAward;
    }
  } else if (type === 'check_in') {
    // Can only award 1 point for check_in
    if (this.checkInPoints >= 1) {
      return { awarded: 0, reason: 'Check-in points already awarded today' };
    }
    // Award up to 1 point, but respect daily limit of 3
    const availableForCheckIn = Math.min(1 - this.checkInPoints, 3 - this.totalPoints);
    pointsToAward = Math.min(points, availableForCheckIn);
    
    if (pointsToAward > 0) {
      this.checkInPoints += pointsToAward;
    }
  }

  if (pointsToAward <= 0) {
    return { awarded: 0, reason: 'No points available to award' };
  }

  // Update total
  this.totalPoints += pointsToAward;

  // Add transaction record
  const transaction = {
    type,
    points: pointsToAward,
    timestamp: new Date()
  };
  
  if (type === 'tap_and_pay' && referenceId) {
    transaction.paymentId = referenceId;
  } else if (type === 'check_in' && referenceId) {
    transaction.checkInId = referenceId;
  }

  this.transactions.push(transaction);

  return { awarded: pointsToAward, reason: 'Points awarded successfully' };
};

module.exports = mongoose.model('DailyVenuePoints', dailyVenuePointsSchema);

