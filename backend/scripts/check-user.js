require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const userId = '6917ba7d804b98b33cf97a46';
    const user = await User.findById(userId).lean();

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('👤 User Details:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || user.firstName || 'N/A'}`);
    console.log(`   User Type: ${user.userType || 'user'}`);
    console.log(`   Is Venue Owner: ${user.userType === 'venue' ? 'YES ⚠️' : 'NO ✅'}`);

    if (user.userType === 'venue') {
      console.log('\n⚠️  WARNING: This user is a venue owner!');
      console.log('   Venue owners only see their own venues, not all active venues.');
      console.log('   To see Kate\'s Pub and Paige\'s Pub, you need to log in as a regular user.');
    } else {
      console.log('\n✅ This is a regular user - should see all active venues.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();

