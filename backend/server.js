// Sentry must be initialized before any other imports
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');
const helmet = require('helmet');
require('dotenv').config();

// Fail fast — catch missing critical env vars before the server accepts traffic
const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Add them to backend/.env and restart.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// CORS Configuration
// Build Vercel origin regex from VERCEL_PROJECT_PATTERN env var (e.g. "shot-on-me")
// This allows all Vercel preview and production deployments for this project
const vercelPattern = process.env.VERCEL_PROJECT_PATTERN;
const vercelOriginRegex = vercelPattern
  ? new RegExp(`^https://${vercelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-zA-Z0-9\\-]*\\.vercel\\.app$`)
  : null;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3002',
      'https://www.shotonme.com',
      'https://shotonme.com',
      'https://venue.shotonme.com',
      'https://owner.shotonme.com',
      ...(process.env.VERCEL_ALLOWED_ORIGINS
        ? process.env.VERCEL_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
        : []
      ),
    ];

    if (allowed.includes(origin)) return callback(null, true);
    if (vercelOriginRegex && vercelOriginRegex.test(origin)) return callback(null, true);
    if (/^https:\/\/[a-zA-Z0-9\-]+\.vercel\.app$/.test(origin)) return callback(null, true);
    if (/^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\./.test(origin)) return callback(null, true);

    callback(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'https://res.cloudinary.com', 'data:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  frameguard: { action: 'deny' },
}));

// Stripe webhook routes must be BEFORE express.json() middleware (need raw body)
const paymentsRouter = require('./routes/payments');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter.webhook);

const kycRouter = require('./routes/kyc');
app.post('/api/kyc/webhook', express.raw({ type: 'application/json' }), kycRouter.kycWebhook);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// In production, strip internal error details from any 5xx JSON response.
// This covers all the res.status(500).json({ error: error.message }) calls
// across 100+ route files without touching each one individually.
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === 'object' && res.statusCode >= 500) {
        const { error, stack, ...safe } = body;
        return originalJson(safe);
      }
      return originalJson(body);
    };
    next();
  });
}

// Request logging middleware
const logger = require('./middleware/logger');
app.use(logger.logRequest);

// Socket.io setup
const io = socketIo(server, {
  cors: corsOptions
});
app.set('io', io);

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

// Hourly job: delete expired stories and their Cloudinary assets
const { cleanupExpiredStories } = require('./jobs/cleanupExpiredStories');
const startStoryCleanupJob = () => {
  setTimeout(async () => {
    try { await cleanupExpiredStories(); } catch (e) { console.error('Story cleanup error:', e.message); }
    setInterval(async () => {
      try { await cleanupExpiredStories(); } catch (e) { console.error('Story cleanup error:', e.message); }
    }, 60 * 60 * 1000); // every hour
  }, 30000); // 30s after boot
};
if (mongoose.connection.readyState === 1) {
  startStoryCleanupJob();
} else {
  mongoose.connection.once('connected', startStoryCleanupJob);
}

// Daily job: refund pending payments whose recipient never signed up
const { refundExpiredPendingPayments } = require('./jobs/refundExpiredPendingPayments');
const startRefundJob = () => {
  // Run once shortly after startup, then every 24 hours
  setTimeout(async () => {
    try { await refundExpiredPendingPayments(); } catch (e) { console.error('Refund job error:', e.message); }
    setInterval(async () => {
      try { await refundExpiredPendingPayments(); } catch (e) { console.error('Refund job error:', e.message); }
    }, 24 * 60 * 60 * 1000);
  }, 10000); // 10s after boot
};
if (mongoose.connection.readyState === 1) {
  startRefundJob();
} else {
  mongoose.connection.once('connected', startRefundJob);
}

// Weekly AI learning loop — runs every Monday at 3am (approximated via interval after boot)
const { runAiLearningLoop } = require('./services/aiLearningLoop');
const startAiLearningJob = () => {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const run = async () => {
    try {
      const result = await runAiLearningLoop();
      console.log(`[AILearning] Weekly run: ${result.venuesWithData} venues updated`);
    } catch (e) { console.error('AI learning loop error:', e.message); }
  };
  // First run: 2 min after boot, then weekly
  setTimeout(() => {
    run();
    setInterval(run, WEEK_MS);
  }, 2 * 60 * 1000);
};
if (mongoose.connection.readyState === 1) {
  startAiLearningJob();
} else {
  mongoose.connection.once('connected', startAiLearningJob);
}

// Every 15 minutes: scan for viral promotion moments
const { detectViralMoments } = require('./services/viralMomentDetector');
const startViralDetectorJob = () => {
  const run = async () => {
    try {
      const result = await detectViralMoments(io);
      if (result.detected > 0) {
        console.log(`[ViralDetector] Found ${result.detected} viral moment(s)`);
      }
    } catch (e) { console.error('Viral detector error:', e.message); }
  };
  setTimeout(() => {
    run();
    setInterval(run, 15 * 60 * 1000); // every 15 minutes
  }, 60000); // start 1 min after boot
};
if (mongoose.connection.readyState === 1) {
  startViralDetectorJob();
} else {
  mongoose.connection.once('connected', startViralDetectorJob);
}

// Every 5 minutes: expire promotions whose endTime (or flashDealEndsAt) has passed
const startPromotionExpiryJob = () => {
  const run = async () => {
    try {
      const Venue = require('./models/Venue');
      const now = new Date();
      // Expire standard promotions past endTime
      const r1 = await Venue.updateMany(
        { 'promotions': { $elemMatch: { isActive: true, isFlashDeal: { $ne: true }, endTime: { $lt: now } } } },
        { $set: { 'promotions.$[elem].isActive': false } },
        { arrayFilters: [{ 'elem.isActive': true, 'elem.isFlashDeal': { $ne: true }, 'elem.endTime': { $lt: now } }] }
      );
      // Expire flash deals past flashDealEndsAt
      const r2 = await Venue.updateMany(
        { 'promotions': { $elemMatch: { isActive: true, isFlashDeal: true, flashDealEndsAt: { $lt: now } } } },
        { $set: { 'promotions.$[elem].isActive': false } },
        { arrayFilters: [{ 'elem.isActive': true, 'elem.isFlashDeal': true, 'elem.flashDealEndsAt': { $lt: now } }] }
      );
      const total = (r1.modifiedCount || 0) + (r2.modifiedCount || 0);
      if (total > 0) console.log(`[PromotionExpiry] Expired ${total} stale promotion(s)`);
    } catch (e) { console.error('Promotion expiry job error:', e.message); }
  };
  setTimeout(() => {
    run();
    setInterval(run, 5 * 60 * 1000); // every 5 minutes
  }, 15000); // 15s after boot
};
if (mongoose.connection.readyState === 1) {
  startPromotionExpiryJob();
} else {
  mongoose.connection.once('connected', startPromotionExpiryJob);
}

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

// Fizz — separate social graph, wallet, feed, messages
const fizzRouter = require('./routes/fizz')
fizzRouter.setIO(io)
app.use('/api/fizz', fizzRouter);

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
app.use('/api/saved-venues', require('./routes/saved-venues'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/kyc', kycRouter);
app.use('/api/wallet-provisioning', require('./routes/wallet-provisioning'));
app.use('/api/squads', require('./routes/squads'));
app.use('/api/sms-bot', require('./routes/sms-bot'));
app.use('/api/busy-times', require('./routes/busyTimes'));
app.use('/api/loyalty-partnerships', require('./routes/loyaltyPartnerships'));

const tapAndPayRouter = require('./routes/tap-and-pay');
app.use('/api/owner', require('./routes/owner'));
app.use('/api/venue-requests', require('./routes/venue-requests'));
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

// Global error handler — must be registered AFTER all routes
// Strips internal error details in production to prevent information disclosure
app.use((err, req, res, next) => {
  // Mongoose CastError = invalid ObjectId in a route param → clean 400
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  // Mongoose duplicate key error → clean 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }
  console.error('Unhandled error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack })
  });
});

// Socket.io
const { updateUserActivity } = require('./utils/activityTracker');
const jwt = require('jsonwebtoken');

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      await updateUserActivity(decoded.userId);
      socket.join(`user-${decoded.userId.toString()}`);
      console.log(`✅ User ${decoded.userId} authenticated and joined room`);
      const User = require('./models/User');
      const user = await User.findById(decoded.userId).select('friends');
      if (user && user.friends.length > 0) {
        io.to(user.friends.map(f => `user-${f.toString()}`)).emit('user-status-update', {
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
    if (!socket.userId) return socket.emit('error', 'Not authenticated');
    if (!userId || userId.toString() !== socket.userId.toString()) return socket.emit('error', 'Unauthorized');
    socket.join(`user-${socket.userId.toString()}`);
    console.log(`User ${socket.userId} joined their notification room`);
  });
  socket.on('leave-user-room', (userId) => {
    if (!socket.userId) return;
    if (!userId || userId.toString() !== socket.userId.toString()) return;
    socket.leave(`user-${socket.userId.toString()}`);
  });
  socket.on('activity-ping', async () => {
    if (socket.userId) await updateUserActivity(socket.userId);
  });
  socket.on('disconnect', async () => {
    if (socket.userId) {
      // Update status in DB only — do not broadcast to all friends on every disconnect.
      // Friends will see the updated lastSeen/status on their next data fetch or
      // via the periodic activity-ping mechanism, avoiding expensive fan-out.
      const User = require('./models/User');
      await User.findByIdAndUpdate(socket.userId, { status: 'away', lastSeen: new Date() });
    }
  });
});

// Sentry error handler — must come before other error handlers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

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

  // Daily 8pm "Who's Out Tonight" notification job — polls every minute
  const { runWhoIsOutTonight } = require('./jobs/whoIsOutTonight');
  setInterval(() => { runWhoIsOutTonight().catch(e => console.error('WhoIsOutTonight error:', e.message)); }, 60 * 1000);
  console.log('🌙 Who\'s Out Tonight job initialized (polls every minute for 8pm window)');

  // Keep-alive ping — prevents Render free tier from spinning down
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const axios = require('axios');
    setInterval(async () => {
      try {
        await axios.get(`${process.env.RENDER_EXTERNAL_URL}/health`);
        console.log('💓 Keep-alive ping sent');
      } catch (e) { /* silent */ }
    }, 10 * 60 * 1000); // every 10 minutes
    console.log('💓 Keep-alive initialized');
  }
}).on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') console.error(`⚠️ Port ${PORT} is already in use`);
  process.exit(1);
});

module.exports = { app, server, io };
