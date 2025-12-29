require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function findKateUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme');
    console.log('✅ Connected to MongoDB\n');

    // Search for users with "kate" in name or email (case-insensitive)
    const kateUsers = await User.find({
      $or: [
        { name: { $regex: /kate/i } },
        { email: { $regex: /kate/i } }
      ]
    }).select('_id email name userType createdAt phoneNumber');

    if (kateUsers.length === 0) {
      console.log('❌ No users found with "kate" in name or email');
      console.log('\n💡 You may need to register a new user or check the database directly.');
      process.exit(0);
    }

    console.log(`📋 Found ${kateUsers.length} user(s) with "kate" in name or email:\n`);
    
    kateUsers.forEach((user, index) => {
      console.log(`${index + 1}. User:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   User Type: ${user.userType}`);
      console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    console.log('💡 To check the password for a user, run:');
    console.log(`   node check-user-password.js <email>`);
    console.log('\n💡 To reset a password, you can use the forgot password feature or create a script to update it.');

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findKateUser();

