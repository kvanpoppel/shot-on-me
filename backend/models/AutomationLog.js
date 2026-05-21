const mongoose = require('mongoose');

const automationLogSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  action: {
    type: String,
    enum: ['auto_flash_deal', 'auto_deal_posted', 'deal_expired', 'follower_notify'],
    required: true
  },
  detail: { type: String, required: true },
  promotionTitle: String,
  revenue: Number,
  redemptions: Number,
}, { timestamps: true });

automationLogSchema.index({ venue: 1, createdAt: -1 });

module.exports = mongoose.model('AutomationLog', automationLogSchema);
