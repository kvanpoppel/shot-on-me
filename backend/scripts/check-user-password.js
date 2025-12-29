require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function checkUserPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line
    const email = process.argv[2];
    if (!email) {
      console.log('Usage: node check-user-password.js <email>');
      console.log('Example: node check-user-password.js user@example.com');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('_id email name password userType createdAt');
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('📋 User Information:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   User Type: ${user.userType}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
    console.log(`   Password Length: ${user.password ? user.password.length : 0}`);
    console.log(`   Password Starts with $2: ${user.password ? user.password.startsWith('$2') : 'No'}`);
    console.log('');

    // Test password if provided
    const testPassword = process.argv[3];
    if (testPassword) {
      if (!user.password) {
        console.log('❌ User has no password stored!');
        console.log('   This user needs to reset their password.');
      } else {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`🔐 Password Test: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        if (!isMatch) {
          console.log('   The password you provided does not match the stored password.');
          console.log('   User may need to reset their password.');
        }
      }
    } else {
      console.log('💡 To test a password, run:');
      console.log(`   node check-user-password.js ${email} <password>`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserPassword();

