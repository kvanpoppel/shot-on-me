require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const User = require('../models/User');

async function getVenueDetails() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get Paige's Pub
    const paigesPub = await Venue.findOne({ name: "Paige's Pub" })
      .populate('owner', 'email firstName lastName name')
      .lean();
    
    // Get Kate's Pub
    const katesPub = await Venue.findOne({ name: "Kate's Pub" })
      .populate('owner', 'email firstName lastName name')
      .lean();

    console.log('📋 Venue Details:\n');
    console.log('─'.repeat(80));
    
    if (paigesPub) {
      console.log('\n1. PAIGE\'S PUB:');
      console.log(`   ID: ${paigesPub._id}`);
      console.log(`   Name: ${paigesPub.name}`);
      console.log(`   Owner: ${paigesPub.owner?.name || paigesPub.owner?.email}`);
      console.log(`   Owner Email: ${paigesPub.owner?.email}`);
      console.log(`   Active: ${paigesPub.isActive ? 'Yes' : 'No'}`);
      console.log(`   Address: ${JSON.stringify(paigesPub.address)}`);
      console.log(`   Location: ${paigesPub.location?.coordinates ? `[${paigesPub.location.coordinates[1]}, ${paigesPub.location.coordinates[0]}]` : 'N/A'}`);
      console.log(`   Category: ${paigesPub.category || 'N/A'}`);
      console.log(`   Description: ${paigesPub.description || 'N/A'}`);
      console.log(`   Promotions: ${paigesPub.promotions?.length || 0}`);
    } else {
      console.log('\n❌ Paige\'s Pub not found');
    }

    if (katesPub) {
      console.log('\n2. KATE\'S PUB:');
      console.log(`   ID: ${katesPub._id}`);
      console.log(`   Name: ${katesPub.name}`);
      console.log(`   Owner: ${katesPub.owner?.name || katesPub.owner?.email}`);
      console.log(`   Owner Email: ${katesPub.owner?.email}`);
      console.log(`   Active: ${katesPub.isActive ? 'Yes' : 'No'}`);
      console.log(`   Address: ${JSON.stringify(katesPub.address)}`);
      console.log(`   Location: ${katesPub.location?.coordinates ? `[${katesPub.location.coordinates[1]}, ${katesPub.location.coordinates[0]}]` : 'N/A'}`);
      console.log(`   Category: ${katesPub.category || 'N/A'}`);
      console.log(`   Description: ${katesPub.description || 'N/A'}`);
      console.log(`   Promotions: ${katesPub.promotions?.length || 0}`);
    } else {
      console.log('\n❌ Kate\'s Pub not found');
    }

    console.log('\n' + '─'.repeat(80));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getVenueDetails();


