require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function testVenuesAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a test user (or create one)
    let testUser = await User.findOne({ email: 'shotonme@yahoo.com' });
    if (!testUser) {
      console.log('Creating test user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Paswword123!', 10);
      testUser = new User({
        email: 'shotonme@yahoo.com',
        password: hashedPassword,
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        userType: 'user'
      });
      await testUser.save();
    }

    // Generate token
    const token = jwt.sign(
      { userId: testUser._id, email: testUser.email, userType: testUser.userType || 'user' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log('📋 Testing venues API response format:\n');

    // Simulate what the API returns
    const venues = await Venue.find({ isActive: true }).lean();
    console.log(`Found ${venues.length} active venues:\n`);
    venues.forEach(v => {
      console.log(`  - ${v.name} (ID: ${v._id}, Active: ${v.isActive})`);
    });

    // Check response format
    const responseFormat = { venues: venues || [] };
    console.log(`\n📦 API Response Format:`);
    console.log(`   Type: ${Array.isArray(responseFormat.venues) ? 'Array' : 'Not Array'}`);
    console.log(`   Count: ${responseFormat.venues.length}`);
    console.log(`   Structure: { venues: [...] }`);

    // Check if venues have required fields
    console.log(`\n🔍 Venue Field Check:`);
    venues.forEach(v => {
      console.log(`\n   ${v.name}:`);
      console.log(`     - _id: ${v._id ? '✅' : '❌'}`);
      console.log(`     - name: ${v.name ? '✅' : '❌'}`);
      console.log(`     - isActive: ${v.isActive ? '✅' : '❌'}`);
      console.log(`     - address: ${v.address ? '✅' : '❌'}`);
      console.log(`     - location: ${v.location ? '✅' : '❌'}`);
      console.log(`     - category: ${v.category || 'N/A'}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testVenuesAPI();

