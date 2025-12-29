require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetKatePassword() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB\n');
    }

    // Find Kate's user
    const kateUser = await User.findOne({ email: 'kate@shotonme.com' });
    
    if (!kateUser) {
      console.log('❌ User kate@shotonme.com not found!');
      console.log('💡 Creating new user...');
      
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const newUser = new User({
        email: 'kate@shotonme.com',
        password: hashedPassword,
        name: 'Kate Owner',
        firstName: 'Kate',
        lastName: 'Owner',
        userType: 'venue',
        phoneNumber: '+1234567890'
      });
      await newUser.save();
      console.log('✅ Created new user: kate@shotonme.com');
      console.log('✅ Password set to: Password123!');
    } else {
      console.log('✅ Found user: kate@shotonme.com');
      console.log(`   Current name: ${kateUser.name}`);
      console.log(`   Current userType: ${kateUser.userType}`);
      
      // Reset password
      const hashedPassword = await bcrypt.hash('Password123!', 10);
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

    console.log('\n📋 Login Credentials:');
    console.log('   Email: kate@shotonme.com');
    console.log('   Password: Password123!');
    console.log('\n✅ Done');

    // Disconnect
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetKatePassword();

