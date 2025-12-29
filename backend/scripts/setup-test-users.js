require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function setupTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // User 1: kate.vanpoppel@gmail.com (localhost:3001 - Shot On Me App)
    const email1 = 'kate.vanpoppel@gmail.com';
    const password1 = 'Password123!';
    
    let user1 = await User.findOne({ email: email1.toLowerCase() });
    
    if (user1) {
      // Update existing user
      const saltRounds = 12;
      const hashedPassword1 = await bcrypt.hash(password1, saltRounds);
      user1.password = hashedPassword1;
      await user1.save();
      console.log(`✅ Updated user: ${email1}`);
    } else {
      // Create new user
      const saltRounds = 12;
      const hashedPassword1 = await bcrypt.hash(password1, saltRounds);
      user1 = new User({
        email: email1.toLowerCase(),
        password: hashedPassword1,
        name: 'Kate VanPoppel',
        firstName: 'Kate',
        lastName: 'VanPoppel',
        userType: 'user',
        wallet: { balance: 0, pendingBalance: 0 },
        friends: [],
        location: { isVisible: true }
      });
      await user1.save();
      console.log(`✅ Created user: ${email1}`);
    }

    // User 2: shotonme@yahoo.com (localhost:3000 - Venue Portal)
    const email2 = 'shotonme@yahoo.com';
    const password2 = 'Password123!';
    
    let user2 = await User.findOne({ email: email2.toLowerCase() });
    
    if (user2) {
      // Update existing user
      const saltRounds = 12;
      const hashedPassword2 = await bcrypt.hash(password2, saltRounds);
      user2.password = hashedPassword2;
      user2.userType = 'venue'; // Make sure it's a venue user
      await user2.save();
      console.log(`✅ Updated user: ${email2}`);
    } else {
      // Create new user
      const saltRounds = 12;
      const hashedPassword2 = await bcrypt.hash(password2, saltRounds);
      user2 = new User({
        email: email2.toLowerCase(),
        password: hashedPassword2,
        name: 'Shot On Me Admin',
        firstName: 'Shot',
        lastName: 'On Me',
        userType: 'venue',
        wallet: { balance: 0, pendingBalance: 0 },
        friends: [],
        location: { isVisible: true }
      });
      await user2.save();
      console.log(`✅ Created user: ${email2}`);
    }

    console.log('\n🎉 Test users setup complete!\n');
    console.log('📋 Login Credentials:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 localhost:3001 (Shot On Me App)');
    console.log(`   Email: ${email1}`);
    console.log(`   Password: ${password1}`);
    console.log('');
    console.log('📍 localhost:3000 (Venue Portal)');
    console.log(`   Email: ${email2}`);
    console.log(`   Password: ${password2}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up test users:', error);
    process.exit(1);
  }
}

setupTestUsers();



