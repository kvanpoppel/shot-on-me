require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Venue = require('../models/Venue');
const User = require('../models/User');

/**
 * Seed script to ensure Kate's Pub and Paige's Pub are available for testing
 * This script:
 * 1. Creates venue owner users if they don't exist
 * 2. Creates the test venues if they don't exist
 * 3. Ensures venues are active and properly configured
 * 
 * Run with: node backend/scripts/seedTestVenues.js
 */

async function seedTestVenues() {
  try {
    // Only connect if not already connected (when running as standalone script)
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB\n');
    }

    // Default location (Indianapolis, IN - approximate center)
    const defaultCoords = [-86.1581, 39.7684]; // [longitude, latitude] for Indianapolis

    // Create or find venue owner users
    console.log('👤 Setting up venue owner users...\n');

    // Kate's Pub owner - find or create
    let kateOwner = await User.findOne({ email: 'kate@shotonme.com' });
    if (!kateOwner) {
      console.log('   Creating Kate (venue owner)...');
      // Try to find existing user with the phone number first
      let existingUser = await User.findOne({ phoneNumber: '+1234567890' });
      if (existingUser) {
        // Update existing user to be the venue owner
        existingUser.email = 'kate@shotonme.com';
        existingUser.name = 'Kate Owner';
        existingUser.firstName = 'Kate';
        existingUser.lastName = 'Owner';
        existingUser.userType = 'venue';
        await existingUser.save();
        kateOwner = existingUser;
        console.log('   ✅ Updated existing user to be Kate owner');
      } else {
        // Create new user with unique phone number
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        // Generate unique phone number
        let phoneNumber = '+1234567890';
        let counter = 0;
        while (await User.findOne({ phoneNumber })) {
          phoneNumber = `+123456789${counter}`;
          counter++;
        }
        kateOwner = new User({
          email: 'kate@shotonme.com',
          password: hashedPassword,
          name: 'Kate Owner',
          firstName: 'Kate',
          lastName: 'Owner',
          userType: 'venue',
          phoneNumber: phoneNumber
        });
        await kateOwner.save();
        console.log('   ✅ Kate owner created');
      }
    } else {
      // Ensure userType is set to venue
      if (kateOwner.userType !== 'venue') {
        kateOwner.userType = 'venue';
        await kateOwner.save();
        console.log('   ✅ Updated Kate owner to venue type');
      } else {
        console.log('   ✅ Kate owner already exists');
      }
    }

    // Paige's Pub owner - find or create
    let paigeOwner = await User.findOne({ email: 'paige@shotonme.com' });
    if (!paigeOwner) {
      console.log('   Creating Paige (venue owner)...');
      // Try to find existing user with the phone number first
      let existingUser = await User.findOne({ phoneNumber: '+1234567891' });
      if (existingUser) {
        // Update existing user to be the venue owner
        existingUser.email = 'paige@shotonme.com';
        existingUser.name = 'Paige Owner';
        existingUser.firstName = 'Paige';
        existingUser.lastName = 'Owner';
        existingUser.userType = 'venue';
        await existingUser.save();
        paigeOwner = existingUser;
        console.log('   ✅ Updated existing user to be Paige owner');
      } else {
        // Create new user with unique phone number
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        // Generate unique phone number
        let phoneNumber = '+1234567891';
        let counter = 0;
        while (await User.findOne({ phoneNumber })) {
          phoneNumber = `+123456789${counter}`;
          counter++;
        }
        paigeOwner = new User({
          email: 'paige@shotonme.com',
          password: hashedPassword,
          name: 'Paige Owner',
          firstName: 'Paige',
          lastName: 'Owner',
          userType: 'venue',
          phoneNumber: phoneNumber
        });
        await paigeOwner.save();
        console.log('   ✅ Paige owner created');
      }
    } else {
      // Ensure userType is set to venue
      if (paigeOwner.userType !== 'venue') {
        paigeOwner.userType = 'venue';
        await paigeOwner.save();
        console.log('   ✅ Updated Paige owner to venue type');
      } else {
        console.log('   ✅ Paige owner already exists');
      }
    }

    console.log('\n🏢 Setting up test venues...\n');

    // Create or update Kate's Pub
    let katesPub = await Venue.findOne({ name: "Kate's Pub" });
    if (!katesPub) {
      console.log('   Creating Kate\'s Pub...');
      katesPub = new Venue({
        name: "Kate's Pub",
        owner: kateOwner._id,
        address: {
          street: '5678 Market St',
          city: 'Indianapolis',
          state: 'IN',
          zipCode: '46202',
          country: 'US'
        },
        location: {
          type: 'Point',
          coordinates: defaultCoords
        },
        description: 'A cozy neighborhood pub perfect for testing the Shot On Me app. Great drinks, friendly atmosphere!',
        category: 'bar',
        isActive: true,
        promotions: []
      });
      await katesPub.save();
      console.log('   ✅ Kate\'s Pub created');
    } else {
      console.log('   Updating Kate\'s Pub...');
      
      // Update owner if needed
      if (katesPub.owner.toString() !== kateOwner._id.toString()) {
        katesPub.owner = kateOwner._id;
        console.log('   ✅ Updated owner');
      }

      // Ensure location is set
      if (!katesPub.location || !katesPub.location.coordinates || 
          (katesPub.location.coordinates[0] === 0 && katesPub.location.coordinates[1] === 0)) {
        katesPub.location = {
          type: 'Point',
          coordinates: defaultCoords
        };
        console.log('   ✅ Updated location');
      }

      // Ensure address is set
      if (!katesPub.address || !katesPub.address.city) {
        katesPub.address = {
          street: katesPub.address?.street || '5678 Market St',
          city: 'Indianapolis',
          state: 'IN',
          zipCode: '46202',
          country: 'US'
        };
        console.log('   ✅ Updated address');
      }

      // Ensure category is set
      if (!katesPub.category) {
        katesPub.category = 'bar';
        console.log('   ✅ Updated category');
      }

      // Ensure isActive is true
      if (!katesPub.isActive) {
        katesPub.isActive = true;
        console.log('   ✅ Set to active');
      }

      // Ensure description is set
      if (!katesPub.description) {
        katesPub.description = 'A cozy neighborhood pub perfect for testing the Shot On Me app. Great drinks, friendly atmosphere!';
        console.log('   ✅ Updated description');
      }

      await katesPub.save();
      console.log('   ✅ Kate\'s Pub updated');
    }

    // Create or update Paige's Pub
    let paigesPub = await Venue.findOne({ name: "Paige's Pub" });
    if (!paigesPub) {
      console.log('   Creating Paige\'s Pub...');
      paigesPub = new Venue({
        name: "Paige's Pub",
        owner: paigeOwner._id,
        address: {
          street: '1234 Main St',
          city: 'Indianapolis',
          state: 'IN',
          zipCode: '46202',
          country: 'US'
        },
        location: {
          type: 'Point',
          coordinates: defaultCoords
        },
        description: 'A vibrant bar and restaurant perfect for testing the Shot On Me app. Live music, great food, and amazing drinks!',
        category: 'bar',
        isActive: true,
        promotions: []
      });
      await paigesPub.save();
      console.log('   ✅ Paige\'s Pub created');
    } else {
      console.log('   Updating Paige\'s Pub...');
      
      // Update owner if needed
      if (paigesPub.owner.toString() !== paigeOwner._id.toString()) {
        paigesPub.owner = paigeOwner._id;
        console.log('   ✅ Updated owner');
      }

      // Ensure location is set
      if (!paigesPub.location || !paigesPub.location.coordinates || 
          (paigesPub.location.coordinates[0] === 0 && paigesPub.location.coordinates[1] === 0)) {
        paigesPub.location = {
          type: 'Point',
          coordinates: defaultCoords
        };
        console.log('   ✅ Updated location');
      }

      // Ensure address is set
      if (!paigesPub.address || !paigesPub.address.city) {
        paigesPub.address = {
          street: paigesPub.address?.street || '1234 Main St',
          city: 'Indianapolis',
          state: 'IN',
          zipCode: '46202',
          country: 'US'
        };
        console.log('   ✅ Updated address');
      }

      // Ensure category is set
      if (!paigesPub.category) {
        paigesPub.category = 'bar';
        console.log('   ✅ Updated category');
      }

      // Ensure isActive is true
      if (!paigesPub.isActive) {
        paigesPub.isActive = true;
        console.log('   ✅ Set to active');
      }

      // Ensure description is set
      if (!paigesPub.description) {
        paigesPub.description = 'A vibrant bar and restaurant perfect for testing the Shot On Me app. Live music, great food, and amazing drinks!';
        console.log('   ✅ Updated description');
      }

      await paigesPub.save();
      console.log('   ✅ Paige\'s Pub updated');
    }

    console.log('\n✅ Test venues seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Kate's Pub: ${katesPub._id} (Active: ${katesPub.isActive})`);
    console.log(`   - Paige's Pub: ${paigesPub._id} (Active: ${paigesPub.isActive})`);
    console.log('\n💡 These venues are now available for all test users in the Shot On Me app.');
    console.log('💡 Venue owners can log in to the venue portal with:');
    console.log('   - Kate: kate@shotonme.com / Password123!');
    console.log('   - Paige: paige@shotonme.com / Password123!');

    // Only disconnect if running as standalone script
    if (require.main === module) {
      await mongoose.disconnect();
      console.log('\n✅ Disconnected from MongoDB');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error seeding test venues:', error.message);
    // Don't exit if called from server.js (non-critical)
    if (require.main === module) {
      process.exit(1);
    }
    // If called from server, just throw so it can be caught
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTestVenues();
}

module.exports = { seedTestVenues };

