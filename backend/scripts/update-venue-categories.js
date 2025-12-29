require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

async function updateCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const katesPub = await Venue.findOne({ name: "Kate's Pub" });
    const paigesPub = await Venue.findOne({ name: "Paige's Pub" });

    if (katesPub) {
      katesPub.category = 'bar';
      await katesPub.save();
      console.log('✅ Updated Kate\'s Pub category to bar');
    } else {
      console.log('❌ Kate\'s Pub not found');
    }

    if (paigesPub) {
      paigesPub.category = 'bar';
      await paigesPub.save();
      console.log('✅ Updated Paige\'s Pub category to bar');
    } else {
      console.log('❌ Paige\'s Pub not found');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateCategories();

