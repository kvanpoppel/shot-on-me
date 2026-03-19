const mongoose = require('mongoose');

const ownerAIInsightEventSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    insightKey: {
      type: String,
      required: true,
      index: true
    },
    aiIntent: {
      type: String,
      default: ''
    },
    actionHref: {
      type: String,
      default: ''
    },
    eventType: {
      type: String,
      enum: ['apply'],
      default: 'apply',
      index: true
    }
  },
  {
    timestamps: true
  }
);

ownerAIInsightEventSchema.index({ ownerId: 1, createdAt: -1 });
ownerAIInsightEventSchema.index({ ownerId: 1, insightKey: 1, createdAt: -1 });

module.exports = mongoose.model('OwnerAIInsightEvent', ownerAIInsightEventSchema);
