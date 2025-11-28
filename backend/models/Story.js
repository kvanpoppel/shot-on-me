const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  media: {
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2200
  },
  expiresAt: {
    type: Date,
    required: true
  },
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      default: '❤️'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
storySchema.index({ author: 1, expiresAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion
storySchema.index({ 'views.user': 1 });

// Method to check if story is expired
storySchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if user has viewed this story
storySchema.methods.hasViewed = function(userId) {
  return this.views.some(view => view.user.toString() === userId.toString());
};

// Method to add a view
storySchema.methods.addView = function(userId) {
  if (!this.hasViewed(userId)) {
    this.views.push({ user: userId, viewedAt: new Date() });
    return true;
  }
  return false;
};

module.exports = mongoose.model('Story', storySchema);

