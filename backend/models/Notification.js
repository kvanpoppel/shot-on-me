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
      'reaction',           // Someone reacted to your post
      'comment',            // Someone commented on your post
      'comment_reply',      // Someone replied to your comment
      'follow',             // Someone followed you
      'friend_request',       // Friend request sent
      'friend_accepted',     // Friend request accepted
      'friend_post',         // Friend posted something new
      'mention',             // Someone mentioned you
      'message',             // New direct message received
      'group_message',       // New group message
      'group_invite',        // Invited to group
      'check_in',            // Friend checked in at venue
      'story_reaction',      // Someone reacted to your story
      'story_view',          // Someone viewed your story
      'story_mention',       // Mentioned in a story
      'payment_received',    // Payment received
      'payment_sent',        // Payment sent confirmation
      'venue_update',        // Venue you follow has new promotion
      'venue_follow',        // Someone followed a venue you follow
      'post_share',          // Someone shared your post
      'achievement',         // Achievement unlocked
      'birthday',            // Friend's birthday
      'milestone'            // Milestone reached (e.g., 100 followers)
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

