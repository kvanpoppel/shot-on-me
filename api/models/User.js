import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  stripeCustomerId: {
    type: String,
    sparse: true,
    unique: true
  },
  stripeConnectAccountId: {
    type: String,
    sparse: true,
    unique: true
  },
  paymentMethods: [{
    type: {
      type: String,
      enum: ['card'],
      default: 'card'
    },
    stripePaymentMethodId: String,
    last4: String,
    expiry: String,
    masked: String,
    brand: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date,
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followedVenues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  }],
  userType: {
    type: String,
    enum: ['user', 'venue', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);

