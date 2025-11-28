const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'reaction',      // Someone reacted to your post
      'comment',       // Someone commented on your post
      'follow',        // Someone followed you
      'mention',       // Someone mentioned you
      'message',      // New message received
      'friend_request', // Friend request
      'check_in',     // Friend checked in at venue
      'story_view',   // Someone viewed your story
      'payment',      // Payment received
      'venue_update'  // Venue you follow has new promotion
    ]
  },
  content: {
    type: String,
    required: true
  },
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeedPost'
  },
  relatedStory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  },
  relatedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  relatedVenue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

