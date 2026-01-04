require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// You can pass the production MongoDB URI as an environment variable
// Or set it directly here for one-time use
const PRODUCTION_MONGODB_URI = process.env.PRODUCTION_MONGODB_URI || process.env.MONGODB_URI;

async function resetKatePasswordProduction() {
  try {
    if (!PRODUCTION_MONGODB_URI) {
      console.log('❌ Error: No MongoDB URI provided');
      console.log('💡 Set PRODUCTION_MONGODB_URI environment variable or update this script');
      console.log('   Example: PRODUCTION_MONGODB_URI="mongodb+srv://..." node scripts/reset-kate-production.js');
      process.exit(1);
    }

    console.log('🔌 Connecting to Production MongoDB...');
    console.log('   URI:', PRODUCTION_MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    // Find Kate's user
    const kateUser = await User.findOne({ email: 'kate@shotonme.com' });
    
    if (!kateUser) {
      console.log('❌ User kate@shotonme.com not found in production database!');
      console.log('💡 Creating new user...');
      
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      const newUser = new User({
        email: 'kate@shotonme.com',
        password: hashedPassword,
        name: 'Kate Owner',
        firstName: 'Kate',
        lastName: 'Owner',
        userType: 'venue',
        phoneNumber: '+1234567890',
        wallet: { balance: 0, pendingBalance: 0 }
      });
      await newUser.save();
      console.log('✅ Created new user: kate@shotonme.com');
      console.log('✅ Password set to: Password123!');
    } else {
      console.log('✅ Found user: kate@shotonme.com');
      console.log(`   Current name: ${kateUser.name}`);
      console.log(`   Current userType: ${kateUser.userType}`);
      
      // Reset password
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      kateUser.password = hashedPassword;
      kateUser.userType = 'venue'; // Ensure it's set to venue
      await kateUser.save();
      
      console.log('✅ Password reset successfully!');
      console.log('✅ New password: Password123!');
      console.log('✅ User type set to: venue');
    }

    // Verify the password works
    const verifyUser = await User.findOne({ email: 'kate@shotonme.com' });
    const isMatch = await bcrypt.compare('Password123!', verifyUser.password);
    
    if (isMatch) {
      console.log('\n✅ Password verification: SUCCESS');
    } else {
      console.log('\n❌ Password verification: FAILED');
    }

    console.log('\n📋 Production Login Credentials:');
    console.log('   Email: kate@shotonme.com');
    console.log('   Password: Password123!');
    console.log('\n✅ Done');

    // Disconnect
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('   💡 Check your MongoDB username and password');
    } else if (error.message.includes('timeout')) {
      console.error('   💡 Check your network connection and MongoDB IP whitelist');
    }
    process.exit(1);
  }
}

resetKatePasswordProduction();

