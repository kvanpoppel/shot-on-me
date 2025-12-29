const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  media: [{
    url: String,
    type: { type: String, enum: ['image', 'video'] },
    publicId: String
  }],
  location: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      default: '❤️',
      enum: ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Keep likes for backward compatibility (will be migrated to reactions)
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost.comments',
      default: null
    },
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: {
        type: String,
        default: '❤️',
        enum: ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
feedPostSchema.index({ author: 1 });
feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ author: 1, createdAt: -1 }); // Compound index for author + time queries
feedPostSchema.index({ 'reactions.user': 1 }); // Index for reaction queries
feedPostSchema.index({ 'comments.user': 1 }); // Index for comment queries

module.exports = mongoose.model('FeedPost', feedPostSchema);
