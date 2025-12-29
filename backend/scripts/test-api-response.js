require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function testAPIResponse() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a regular user (not a venue owner)
    let testUser = await User.findOne({ userType: { $ne: 'venue' } });
    if (!testUser) {
      console.log('⚠️  No regular user found. Creating one...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      testUser = new User({
        email: 'testuser@shotonme.com',
        password: hashedPassword,
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        userType: 'user'
      });
      await testUser.save();
    }

    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Generate token
    const token = jwt.sign(
      { userId: testUser._id, email: testUser.email, userType: testUser.userType || 'user' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    console.log(`📋 Testing API with user: ${testUser.email} (${testUser.userType || 'user'})\n`);

    // Test the venues API
    const API_URL = process.env.API_URL || 'http://localhost:5000/api';
    const response = await axios.get(`${API_URL}/venues`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📦 API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Venues Count: ${response.data.venues?.length || 0}\n`);

    if (response.data.venues && response.data.venues.length > 0) {
      console.log('🔍 Venue Details:\n');
      response.data.venues.forEach((venue, index) => {
        console.log(`${index + 1}. ${venue.name}`);
        console.log(`   ID: ${venue._id}`);
        console.log(`   Active: ${venue.isActive}`);
        console.log(`   Location Format:`);
        if (venue.location) {
          if (venue.location.latitude && venue.location.longitude) {
            console.log(`     ✅ Has latitude/longitude: ${venue.location.latitude}, ${venue.location.longitude}`);
          } else if (venue.location.coordinates) {
            console.log(`     ⚠️  Only has coordinates: ${venue.location.coordinates}`);
          } else {
            console.log(`     ❌ No location data`);
          }
        } else {
          console.log(`     ❌ No location object`);
        }
        console.log(`   Category: ${venue.category || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No venues returned from API');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAPIResponse();

