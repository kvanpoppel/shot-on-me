const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment', 'user', 'venue'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

// Prevent the same user from reporting the same content twice
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });
// Auto-delete resolved reports after 1 year
reportSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60, partialFilterExpression: { status: { $in: ['resolved', 'dismissed'] } } });

module.exports = mongoose.model('Report', reportSchema);
