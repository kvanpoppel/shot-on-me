require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

async function updateVenues() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Default location (Indianapolis, IN - approximate center)
    const defaultCoords = [-86.1581, 39.7684]; // [longitude, latitude] for Indianapolis

    // Update Paige's Pub
    const paigesPub = await Venue.findOne({ name: "Paige's Pub" });
    if (paigesPub) {
      console.log('📝 Updating Paige\'s Pub...');
      
      // Update location if it's invalid (0, 0)
      if (!paigesPub.location?.coordinates || 
          (paigesPub.location.coordinates[0] === 0 && paigesPub.location.coordinates[1] === 0)) {
        paigesPub.location = {
          type: 'Point',
          coordinates: defaultCoords
        };
        console.log('   ✅ Updated location coordinates');
      }

      // Ensure address is properly structured
      if (!paigesPub.address || !paigesPub.address.city) {
        paigesPub.address = {
          street: paigesPub.address?.street || '1234 Main St',
          city: paigesPub.address?.city || 'Indianapolis',
          state: paigesPub.address?.state || 'IN',
          zipCode: paigesPub.address?.zipCode || '46202',
          country: 'US'
        };
        console.log('   ✅ Updated address');
      }

      // Set category if missing
      if (!paigesPub.category) {
        paigesPub.category = 'bar';
        console.log('   ✅ Set category to bar');
      }

      await paigesPub.save();
      console.log('   ✅ Paige\'s Pub updated successfully\n');
    }

    // Update Kate's Pub
    const katesPub = await Venue.findOne({ name: "Kate's Pub" });
    if (katesPub) {
      console.log('📝 Updating Kate\'s Pub...');
      
      // Add location if missing
      if (!katesPub.location || !katesPub.location.coordinates) {
        katesPub.location = {
          type: 'Point',
          coordinates: defaultCoords
        };
        console.log('   ✅ Added location coordinates');
      }

      // Add address if missing
      if (!katesPub.address) {
        katesPub.address = {
          street: '5678 Market St',
          city: 'Indianapolis',
          state: 'IN',
          zipCode: '46202',
          country: 'US'
        };
        console.log('   ✅ Added address');
      }

      // Set category if missing
      if (!katesPub.category) {
        katesPub.category = 'bar';
        console.log('   ✅ Set category to bar');
      }

      // Ensure isActive is true
      katesPub.isActive = true;
      
      await katesPub.save();
      console.log('   ✅ Kate\'s Pub updated successfully\n');
    }

    console.log('✅ All venues updated!');
    console.log('\n💡 Both venues should now be visible in the venue portal when you log in.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateVenues();


