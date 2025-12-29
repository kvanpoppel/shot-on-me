require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const User = require('../models/User'); // Required for populate

async function checkVenues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const venues = await Venue.find({ isActive: true })
      .select('name isActive owner address location category')
      .populate('owner', 'email firstName lastName')
      .sort({ name: 1 });

    console.log(`📋 Found ${venues.length} active venue(s):\n`);
    venues.forEach((v, i) => {
      console.log(`${i + 1}. ${v.name}`);
      console.log(`   ID: ${v._id}`);
      console.log(`   Active: ${v.isActive}`);
      console.log(`   Owner: ${v.owner?.email || 'N/A'}`);
      console.log(`   Address: ${v.address?.street || 'N/A'}, ${v.address?.city || 'N/A'}, ${v.address?.state || 'N/A'}`);
      console.log(`   Category: ${v.category || 'N/A'}`);
      console.log('');
    });

    // Check specifically for test venues
    const katesPub = await Venue.findOne({ name: "Kate's Pub" });
    const paigesPub = await Venue.findOne({ name: "Paige's Pub" });
    
    console.log('🧪 Test Venues Status:');
    console.log(`   Kate's Pub: ${katesPub ? `✅ Found (Active: ${katesPub.isActive})` : '❌ NOT FOUND'}`);
    console.log(`   Paige's Pub: ${paigesPub ? `✅ Found (Active: ${paigesPub.isActive})` : '❌ NOT FOUND'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVenues();

