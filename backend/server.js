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
    'https://www.shotonme.com', // Primary production domain (www only)
    'https://shotonme.com', // Production domain (without www)
    'https://venue.shotonme.com', // Venue portal production subdomain
    /^https:\/\/.*\.vercel\.app$/, // All Vercel deployment URLs (preview and production)
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Local network
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Local network
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/ // Local network
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  next();
});

// Stripe webhook route must be BEFORE express.json() middleware
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

// MongoDB Connection
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

mongoose.connection.on('error', (err) => { console.error('❌ MongoDB connection error:', err); });
mongoose.connection.on('disconnected', () => { console.log('⚠️ MongoDB disconnected. Attempting to reconnect...'); });
mongoose.connection.on('reconnected', () => { console.log('✅ MongoDB reconnected'); });
mongoose.connection.on('connected', () => { console.log('✅ MongoDB connected'); });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

connectDB();

// Initialize email service
const emailService = require('./utils/emailService');
setTimeout(() => { emailService.testEmailConnection(); }, 2000);

// Seed test venues (dev only)
if (process.env.SEED_TEST_VENUES === 'true') {
  const seedTestVenuesOnConnect = async () => {
    try {
      const { seedTestVenues } = require('./scripts/seedTestVenues');
      console.log('🌱 Seeding test venues...');
      await seedTestVenues();
      console.log('✅ Test venues seeded');
    } catch (error) {
      console.error('⚠️  Failed to seed test venues (non-critical):', error.message);
    }
  };
  if (mongoose.connection.readyState === 1) {
    setTimeout(seedTestVenuesOnConnect, 2000);
  } else {
    mongoose.connection.once('connected', () => { setTimeout(seedTestVenuesOnConnect, 2000); });
  }
}

// ─── NEW: Geo restriction + batch users ──────────────────────────────────────
const { geoRestrict } = require('./middleware/geoRestriction');
const usersBatchRouter = require('./routes/usersBatch');
// ─────────────────────────────────────────────────────────────────────────────

// Auth routes
const { authLimiter } = require('./middleware/rateLimiter');
if (process.env.NODE_ENV === 'production') {
  // Apply geo restriction to registration only, rate limit to all auth in prod
  app.use('/api/auth', authLimiter, (req, res, next) => {
    if (req.method === 'POST' && req.path === '/register') return geoRestrict(req, res, next);
    next();
  }, require('./routes/auth'));
} else {
  // Dev: no rate limiting, but still geo-restrict registration
  app.use('/api/auth', (req, res, next) => {
    if (req.method === 'POST' && req.path === '/register') return geoRestrict(req, res, next);
    next();
  }, require('./routes/auth'));
}

// Rate limiting for other routes
const { apiLimiter, mediaUploadLimiter } = require('./middleware/rateLimiter');
app.use('/api', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  if (req.path.startsWith('/auth')) return next();
  if (req.path.startsWith('/stories')) return next();
  if (req.path === '/payments/stripe-key') return next();
  if (req.path === '/payments/create-intent') return next();
  if (req.method === 'GET') {
    const readOnlyEndpoints = [
      '/users/me', '/venues', '/location/friends', '/location/check-proximity',
      '/venue-activity/trending/list', '/notifications/unread-count',
      '/messages/unread-count', '/virtual-cards/status', '/payments/history',
      '/gamification/stats', '/payment-methods',
    ];
    if (readOnlyEndpoints.some(e => req.path === e || req.path.startsWith(e + '/'))) return next();
  }
  apiLimiter(req, res, next);
});

// ─── NEW: Batch users route — must be registered BEFORE the generic /api/users
// route so that /api/users/batch is matched before /api/users/:id ─────────────
app.use('/api/users', usersBatchRouter);
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/users', require('./routes/users'));

// Featured/analytics venue routes BEFORE generic /:venueId
const venuesFeaturedRouter = require('./routes/venues-featured');
app.use('/api/venues', venuesFeaturedRouter);
const venuesAnalyticsRouter = require('./routes/venues-analytics');
app.use('/api/venues', venuesAnalyticsRouter);

// Generic venues routes
const venuesRouter = require('./routes/venues');
venuesRouter.setIO(io);
app.use('/api/venues', venuesRouter);

const messagesRouter = require('./routes/messages');
messagesRouter.setIO(io);
app.use('/api/messages', messagesRouter);

const feedRouter = require('./routes/feed');
feedRouter.setIO(io);
app.use('/api/feed', feedRouter);

app.use('/api/feed-ai', require('./routes/feedAI'));
app.use('/api/stories', mediaUploadLimiter, require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/loyalty', require('./routes/loyalty'));

// ─── NEW: Geo restriction on money-movement payment endpoints ─────────────────
app.use('/api/payments', (req, res, next) => {
  const restricted = ['/send', '/add-funds', '/redeem'];
  if (req.method === 'POST' && restricted.some(p => req.path === p)) {
    return geoRestrict(req, res, next);
  }
  next();
}, require('./routes/payments'));
// ─────────────────────────────────────────────────────────────────────────────

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
app.use('/api/search', require('./routes/search'));

const tapAndPayRouter = require('./routes/tap-and-pay');
app.use('/api/owner', require('./routes/owner'));
tapAndPayRouter.setIO(io);
app.use('/api/tap-and-pay', tapAndPayRouter);

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Shot On Me API',
    status: 'Running',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health', auth: '/api/auth', users: '/api/users',
      venues: '/api/venues', dashboard: '/api/dashboard', payments: '/api/payments',
      notifications: '/api/notifications', checkins: '/api/checkins',
      loyalty: '/api/loyalty', rewards: '/api/rewards',
      virtualCards: '/api/virtual-cards', tapAndPay: '/api/tap-and-pay'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'Shot On Me API'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Shot On Me API Server',
    status: 'Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: ['/api/auth', '/api/users', '/api/venues', '/api/feed', '/api/payments', '/api/location', '/api/health']
  });
});

// Socket.io
const { updateUserActivity } = require('./utils/activityTracker');
const jwt = require('jsonwebtoken');

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.userId = decoded.userId;
      await updateUserActivity(decoded.userId);
      socket.join(decoded.userId.toString());
      console.log(`✅ User ${decoded.userId} authenticated and joined room`);
      const User = require('./models/User');
      const user = await User.findById(decoded.userId).select('friends');
      if (user && user.friends.length > 0) {
        io.to(user.friends.map(f => f.toString())).emit('user-status-update', {
          userId: decoded.userId, status: 'online', lastSeen: new Date()
        });
      }
      socket.emit('authenticated', { success: true });
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });

  socket.on('join-user-room', (userId) => {
    if (userId) { socket.join(userId.toString()); console.log(`✅ User ${userId} joined their notification room`); }
  });
  socket.on('leave-user-room', (userId) => {
    if (userId) { socket.leave(userId.toString()); console.log(`👋 User ${userId} left their notification room`); }
  });
  socket.on('activity-ping', async () => {
    if (socket.userId) await updateUserActivity(socket.userId);
  });
  socket.on('disconnect', async () => {
    console.log('👋 User disconnected:', socket.id);
    if (socket.userId) {
      const User = require('./models/User');
      const user = await User.findByIdAndUpdate(socket.userId, { status: 'away' }, { new: true }).select('friends');
      if (user && user.friends && user.friends.length > 0) {
        io.to(user.friends.map(f => f.toString())).emit('user-status-update', {
          userId: socket.userId, status: 'away', lastSeen: new Date()
        });
      }
    }
  });
});

// Error handling
app.use(logger.logError);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl, method: req.method });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  if (process.env.NODE_ENV !== 'production') process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.io enabled`);
  const accessUrl = HOST === '0.0.0.0' ? 'http://localhost' : `http://${HOST}`;
  console.log(`✅ Health check available at ${accessUrl}:${PORT}/health`);
  console.log(`   Also accessible at ${accessUrl}:${PORT}/api/health`);

  const { checkExpiringPromotions, checkLaunchingPromotions, checkPromotionObjectives } = require('./services/venuePromotionNotifications');
  const { runAiAutomationSchedulerCycle } = require('./services/aiAutomationScheduler');

  setInterval(() => { checkExpiringPromotions(io); checkLaunchingPromotions(io); }, 30 * 60 * 1000);
  setInterval(() => { checkPromotionObjectives(io); }, 60 * 60 * 1000);

  const aiSchedulerIntervalMinutes = Math.max(10, Number(process.env.AI_AUTOMATION_SCHEDULER_INTERVAL_MINUTES || 60));
  setInterval(async () => {
    try {
      const result = await runAiAutomationSchedulerCycle();
      if (!result?.skipped) {
        console.log(`🤖 AI scheduler run: venues=${result.processed}/${result.totalEligibleVenues}, posted=${result.posted}, pending=${result.pending}, failures=${result.failures?.length || 0}`);
      }
    } catch (error) { console.error('❌ AI automation scheduler error:', error.message); }
  }, aiSchedulerIntervalMinutes * 60 * 1000);

  setTimeout(() => { checkExpiringPromotions(io); checkLaunchingPromotions(io); checkPromotionObjectives(io); }, 60000);
  setTimeout(async () => {
    try {
      const result = await runAiAutomationSchedulerCycle();
      if (!result?.skipped) {
        console.log(`🤖 Initial AI scheduler run: venues=${result.processed}/${result.totalEligibleVenues}, posted=${result.posted}, pending=${result.pending}, failures=${result.failures?.length || 0}`);
      }
    } catch (error) { console.error('❌ Initial AI automation scheduler error:', error.message); }
  }, 120000);

  console.log('📢 Venue promotion notification checks initialized');
  console.log(`🤖 AI automation scheduler initialized (${aiSchedulerIntervalMinutes} min interval)`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') console.error(`⚠️ Port ${PORT} is already in use`);
  process.exit(1);
});

module.exports = { app, server, io };
