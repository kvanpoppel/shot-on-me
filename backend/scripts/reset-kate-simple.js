require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: 'kate@shotonme.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    // Reset to a simple password
    const newPassword = 'Test123!';
    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();
    
    console.log('✅ Password reset successfully!');
    console.log('📋 New password: Test123!');
    
    // Verify
    const verify = await bcrypt.compare(newPassword, user.password);
    console.log('✅ Verification:', verify ? 'SUCCESS' : 'FAILED');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();

