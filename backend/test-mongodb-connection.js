/**
 * MongoDB Connection Test Script
 * Run this to verify MongoDB connection is working
 * 
 * Usage:
 *   cd backend
 *   node test-mongodb-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Get connection string from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';

console.log('🔍 Testing MongoDB Connection...\n');
console.log(`📋 Connection String: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}\n`);

// Connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
};

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect...');
    
    await mongoose.connect(MONGODB_URI, mongoOptions);
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port || 'N/A (SRV)'}`);
    console.log(`📈 Ready State: ${mongoose.connection.readyState} (1 = Connected)`);
    
    // List collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`\n📁 Collections (${collections.length}):`);
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } catch (err) {
      console.log('\n⚠️  Could not list collections (may be empty database)');
    }
    
    // Test a simple query
    try {
      const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const userCount = await User.countDocuments();
      console.log(`\n👥 Users in database: ${userCount}`);
    } catch (err) {
      console.log('\n⚠️  Could not count users (schema may not exist yet)');
    }
    
    console.log('\n✅ All tests passed! MongoDB is properly configured.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`\nError: ${error.message}\n`);
    
    // Provide helpful error messages
    if (error.message.includes('authentication')) {
      console.error('💡 Authentication Error:');
      console.error('   - Check username and password in connection string');
      console.error('   - Verify database user exists in MongoDB Atlas');
      console.error('   - Make sure password is correct (no extra spaces)\n');
    } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
      console.error('💡 Network Error:');
      console.error('   - Check if your IP is whitelisted in MongoDB Atlas');
      console.error('   - Go to Network Access → Add IP Address');
      console.error('   - For development: Add 0.0.0.0/0 (Allow from anywhere)');
      console.error('   - Wait 1-2 minutes after adding IP\n');
    } else if (error.message.includes('bad auth')) {
      console.error('💡 Authorization Error:');
      console.error('   - Database user may not have correct permissions');
      console.error('   - Go to Database Access → Edit user → Set to "Atlas Admin"\n');
    } else {
      console.error('💡 General Error:');
      console.error('   - Verify connection string format is correct');
      console.error('   - Check MongoDB Atlas cluster is running');
      console.error('   - Ensure connection string includes database name\n');
    }
    
    process.exit(1);
  }
}

// Run test
testConnection();

