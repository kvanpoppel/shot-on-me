/**
 * Quick password reset script for development
 * Usage: node reset-password.js <email> <newPassword>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function resetPassword(email, newPassword) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shot-on-me';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`   New password: ${newPassword}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get email and password from command line
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <newPassword>');
  console.log('Example: node reset-password.js kate@shotonme.com MyNewPassword123');
  process.exit(1);
}

resetPassword(email, newPassword);

