import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';

console.log('🔍 Testing MongoDB Connection...');
console.log(`📍 Connection String: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Test a simple query
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ Database ping successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:');
    console.error(`   ${err.message}`);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n💡 MongoDB is not running or not accessible.');
      console.error('   Please ensure MongoDB is running on localhost:27017');
      console.error('   Or update MONGODB_URI in your .env file');
    }
    process.exit(1);
  });

