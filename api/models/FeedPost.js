import mongoose from 'mongoose';

const feedPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'live']
    },
    url: String,
    thumbnail: String
  }],
  location: {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  checkIn: {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    },
    checkedInAt: {
      type: Date,
      default: Date.now
    }
  },
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
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isLive: {
    type: Boolean,
    default: false
  },
  liveStreamUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ author: 1 });

export default mongoose.model('FeedPost', feedPostSchema);

