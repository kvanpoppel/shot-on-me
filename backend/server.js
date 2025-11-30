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
    'https://www.shotonme.com',
    'https://shotonme.com',
    'https://shot-on-me-venue-portal.vercel.app',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Stripe webhook route must be BEFORE express.json() middleware
// because Stripe requires raw body for signature verification
const paymentsRouter = require('./routes/payments');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentsRouter.webhook);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
const venuesRouter = require('./routes/venues');
venuesRouter.setIO(io); // Pass Socket.io instance to venues router
app.use('/api/venues', venuesRouter);
const messagesRouter = require('./routes/messages');
messagesRouter.setIO(io); // Pass Socket.io instance to messages router
app.use('/api/messages', messagesRouter);
app.use('/api/feed', require('./routes/feed'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/location', require('./routes/location'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/venue-activity', require('./routes/venue-activity'));

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
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
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
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
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
