require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetPassword() {
  try {
    // Get email and new password from command line arguments
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.log('❌ Usage: node reset-venue-password.js <email> <new-password>');
      console.log('\nExample:');
      console.log('  node reset-venue-password.js venue@example.com MyNewPassword123');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters long');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      userType: 'venue'
    });

    if (!user) {
      console.log(`❌ No venue user found with email: ${email}`);
      console.log('\n💡 Make sure:');
      console.log('   1. The email is correct');
      console.log('   2. The user has userType: "venue"');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password reset successfully!');
    console.log(`\n📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name || 'N/A'}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log('\n💡 You can now log in with these credentials at http://localhost:3000');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();


