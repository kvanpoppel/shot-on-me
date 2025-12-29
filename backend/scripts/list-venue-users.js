require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listVenueUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all venue users
    const venueUsers = await User.find({ userType: 'venue' })
      .select('email name firstName lastName phoneNumber createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (venueUsers.length === 0) {
      console.log('❌ No venue users found in the database.');
      console.log('\n💡 You can create a new venue account by:');
      console.log('   1. Going to http://localhost:3000');
      console.log('   2. Clicking "Register"');
      console.log('   3. Selecting "Venue Owner"');
      console.log('   4. Filling in your details\n');
    } else {
      console.log(`✅ Found ${venueUsers.length} venue user(s):\n`);
      console.log('─'.repeat(80));
      venueUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}`);
        if (user.phoneNumber) console.log(`   Phone: ${user.phoneNumber}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      });
      console.log('\n' + '─'.repeat(80));
      console.log('\n💡 To reset a password, you can:');
      console.log('   1. Use the "Forgot Password" feature on the login page');
      console.log('   2. Or create a new account with a different email');
      console.log('   3. Or contact support to reset your password\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listVenueUsers();


