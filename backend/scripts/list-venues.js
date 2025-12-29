require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const User = require('../models/User'); // Required for populate

async function listVenues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const venues = await Venue.find({})
      .select('name owner isActive address')
      .populate('owner', 'email name firstName lastName')
      .sort({ name: 1 })
      .lean();

    console.log(`Found ${venues.length} venue(s):\n`);
    
    if (venues.length === 0) {
      console.log('No venues found in database.');
    } else {
      venues.forEach((venue, index) => {
        console.log(`${index + 1}. ${venue.name}`);
        console.log(`   Owner: ${venue.owner?.email || venue.owner?.name || 'N/A'}`);
        console.log(`   Active: ${venue.isActive ? 'Yes' : 'No'}`);
        if (venue.address) {
          console.log(`   Address: ${venue.address.street || ''} ${venue.address.city || ''}, ${venue.address.state || ''}`);
        }
        console.log('');
      });
    }

    // Search for Kate's and Paige's specifically
    const katesPaiges = venues.filter(v => 
      v.name.toLowerCase().includes('kate') || 
      v.name.toLowerCase().includes('paige') ||
      v.name.toLowerCase().includes("kate's") ||
      v.name.toLowerCase().includes("paige's")
    );

    if (katesPaiges.length > 0) {
      console.log('\n🔍 Found venue(s) matching "Kate" or "Paige":');
      katesPaiges.forEach(v => {
        console.log(`   - ${v.name} (ID: ${v._id})`);
      });
    } else {
      console.log('\n❌ No venue found matching "Kate\'s and Paige\'s pub"');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listVenues();
