const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002', // Owner Portal
    'https://www.shotonme.com',
    'https://shotonme.com',
    'https://api.shotonme.com',
    'https://shot-on-me.onrender.com', // Render backend URL
    'https://shot-on-me-venue-portal.vercel.app', // Keep Vercel URL as fallback
    /^https:\/\/shotonme-.*\.vercel\.app$/, // Vercel preview deployments
    /^https:\/\/.*\.vercel\.app$/, // All Vercel deployments
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict transport security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  next();
});

// Stripe webhook route must be BEFORE express.json() middleware
// because Stripe requires raw body for signature verification
const paymentsRouter = require('./routes/payments');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter.webhook);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
const logger = require('./middleware/logger');
app.use(logger.logRequest);

// Socket.io setup
const io = socketIo(server, {
  cors: corsOptions
});

// MongoDB Connection with enhanced options
const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10,
  minPoolSize: 5,
  heartbeatFrequencyMS: 10000,
};

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme', mongoOptions);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Make sure your IP is whitelisted in MongoDB Atlas');
    console.error('💡 Check your MONGODB_URI in .env file');
    setTimeout(() => {
      console.log('🔄 Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

// MongoDB connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

// Health check endpoint (before DB connection for faster response)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Initialize DB connection
connectDB();

// Initialize email service
const emailService = require('./utils/emailService');
// Test email connection on startup (non-blocking)
setTimeout(() => {
  emailService.testEmailConnection();
}, 2000); // Wait 2 seconds for other services to initialize

// Seed test venues on startup (development/testing only)
// Disabled by default to prevent startup issues - enable with SEED_TEST_VENUES=true
if (process.env.SEED_TEST_VENUES === 'true') {
  const seedTestVenuesOnConnect = async () => {
    try {
      const { seedTestVenues } = require('./scripts/seedTestVenues');
      console.log('🌱 Seeding test venues...');
      await seedTestVenues();
      console.log('✅ Test venues seeded');
    } catch (error) {
      console.error('⚠️  Failed to seed test venues (non-critical):', error.message);
      // Don't exit - this is non-critical
    }
  };

  // Wait for MongoDB connection before seeding
  if (mongoose.connection.readyState === 1) {
    // Already connected, seed immediately
    setTimeout(seedTestVenuesOnConnect, 2000);
  } else {
    // Wait for connection event
    mongoose.connection.once('connected', () => {
      setTimeout(seedTestVenuesOnConnect, 2000);
    });
  }
}

// Routes - Auth routes first with their own rate limiter
const { authLimiter } = require('./middleware/rateLimiter');
// DISABLE auth rate limiting in development to prevent 429 errors during testing
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authLimiter, require('./routes/auth'));
} else {
  app.use('/api/auth', require('./routes/auth'));
}

// Apply rate limiting to all other routes EXCEPT frequently-called safe endpoints
const { apiLimiter, mediaUploadLimiter } = require('./middleware/rateLimiter');
app.use('/api', (req, res, next) => {
  // DISABLE rate limiting in development to prevent 429 errors during testing
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Skip rate limiting for auth routes (they have their own limiter)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  // Skip rate limiting for stories routes (they have their own limiter)
  if (req.path.startsWith('/stories')) {
    return next();
  }
  // Skip rate limiting for stripe-key endpoint (public key, called frequently)
  if (req.path === '/payments/stripe-key') {
    return next();
  }
  // Skip rate limiting for payment creation (critical user action, has its own validation)
  if (req.path === '/payments/create-intent') {
    return next();
  }
  // Skip rate limiting for read-only GET endpoints that are called frequently on page load
  // These are safe to exclude as they don't modify data
  if (req.method === 'GET') {
    const readOnlyEndpoints = [
      '/users/me',
      '/venues',
      '/location/friends',
      '/location/check-proximity',
      '/venue-activity/trending/list',
      '/notifications/unread-count',
      '/messages/unread-count',
      '/virtual-cards/status',
      '/payments/history',
      '/gamification/stats',
      '/payment-methods', // Read-only, just fetches saved payment methods
    ];
    
    // Check if this is a read-only endpoint
    const isReadOnly = readOnlyEndpoints.some(endpoint => {
      // Exact match or starts with endpoint (for paths with IDs)
      return req.path === endpoint || req.path.startsWith(endpoint + '/');
    });
    
    if (isReadOnly) {
      return next();
    }
  }
  apiLimiter(req, res, next);
});
app.use('/api/users', require('./routes/users'));
const venuesRouter = require('./routes/venues');
venuesRouter.setIO(io); // Pass Socket.io instance to venues router
app.use('/api/venues', venuesRouter);
const messagesRouter = require('./routes/messages');
messagesRouter.setIO(io); // Pass Socket.io instance to messages router
app.use('/api/messages', messagesRouter);
const feedRouter = require('./routes/feed');
feedRouter.setIO(io); // Pass Socket.io instance to feed router
app.use('/api/feed', feedRouter);
app.use('/api/feed-ai', require('./routes/feedAI'));
app.use('/api/stories', mediaUploadLimiter, require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/location', require('./routes/location'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/venue-activity', require('./routes/venue-activity'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/invites', require('./routes/invites'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/tonight', require('./routes/tonight'));
app.use('/api/events', require('./routes/events'));
app.use('/api/venue-analytics', require('./routes/venue-analytics'));
app.use('/api/promotion-analytics', require('./routes/promotion-analytics'));
app.use('/api/promotion-library', require('./routes/promotion-library'));
app.use('/api/payment-methods', require('./routes/payment-methods'));
app.use('/api/venue-payouts', require('./routes/venue-payouts'));
app.use('/api/venue-follows', require('./routes/venue-follows'));
app.use('/api/venue-reviews', require('./routes/venue-reviews'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/virtual-cards', require('./routes/virtual-cards'));
app.use('/api/card-designs', require('./routes/card-designs'));
app.use('/api/venue-referrals', require('./routes/venue-referrals'));
app.use('/api/ai-analytics', require('./routes/aiAnalytics'));
app.use('/api/personalized-promotions', require('./routes/personalizedPromotions'));
app.use('/api/predictive-analytics', require('./routes/predictiveAnalytics'));
app.use('/api/ai-automation', require('./routes/aiAutomation'));
const tapAndPayRouter = require('./routes/tap-and-pay');
app.use('/api/owner', require('./routes/owner'));
tapAndPayRouter.setIO(io); // Pass Socket.io instance
app.use('/api/tap-and-pay', tapAndPayRouter);

// Root API endpoint - provides API information
app.get('/api', (req, res) => {
  res.json({
    message: 'Shot On Me API',
    status: 'Running',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      venues: '/api/venues',
      dashboard: '/api/dashboard',
      payments: '/api/payments',
      notifications: '/api/notifications',
      checkins: '/api/checkins',
      loyalty: '/api/loyalty',
      rewards: '/api/rewards',
      virtualCards: '/api/virtual-cards',
      tapAndPay: '/api/tap-and-pay'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'Shot On Me API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Shot On Me API Server',
    status: 'Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: [
      '/api/auth',
      '/api/users', 
      '/api/venues',
      '/api/feed',
      '/api/payments',
      '/api/location',
      '/api/health'
    ]
  });
});

// Socket.io connection handling
const { updateUserActivity, getUserStatus } = require('./utils/activityTracker');
const jwt = require('jsonwebtoken');

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.userId = decoded.userId;
      
      // Update user activity to online
      await updateUserActivity(decoded.userId);
      
      // Join user's personal room for notifications
      socket.join(decoded.userId.toString());
      console.log(`✅ User ${decoded.userId} authenticated and joined room`);
      
      // Emit status update to friends
      const User = require('./models/User');
      const user = await User.findById(decoded.userId).select('friends');
      if (user && user.friends.length > 0) {
        io.to(user.friends.map(f => f.toString())).emit('user-status-update', {
          userId: decoded.userId,
          status: 'online',
          lastSeen: new Date()
        });
      }
      
      socket.emit('authenticated', { success: true });
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });
  
  // Join user's personal room for notifications
  socket.on('join-user-room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`✅ User ${userId} joined their notification room`);
    }
  });
  
  // Leave user room
  socket.on('leave-user-room', (userId) => {
    if (userId) {
      socket.leave(userId.toString());
      console.log(`👋 User ${userId} left their notification room`);
    }
  });
  
  // Handle activity ping (user is active)
  socket.on('activity-ping', async () => {
    if (socket.userId) {
      await updateUserActivity(socket.userId);
    }
  });
  
  socket.on('disconnect', async () => {
    console.log('👋 User disconnected:', socket.id);
    
    // Update user status to away when they disconnect
    if (socket.userId) {
      const User = require('./models/User');
      // Don't immediately set to offline, set to away
      // Status will be recalculated based on lastSeen
      const user = await User.findByIdAndUpdate(
        socket.userId,
        { status: 'away' },
        { new: true }
      ).select('friends');
      
      // Notify friends of status change
      if (user && user.friends && user.friends.length > 0) {
        io.to(user.friends.map(f => f.toString())).emit('user-status-update', {
          userId: socket.userId,
          status: 'away',
          lastSeen: new Date()
        });
      }
    }
  });
});

// Error handling middleware (with logging)
app.use(logger.logError);

// Error response middleware
app.use((err, req, res, next) => {
  // Error already logged by logger.logError
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Error handling for server startup
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit in production, let Render handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`✅ Health check available at http://${HOST}:${PORT}/health`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

module.exports = { app, server, io };
