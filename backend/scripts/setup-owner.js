const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const User = require('../models/User')

async function setupOwner() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme')
    console.log('✅ Connected to MongoDB')

    const email = 'shotonme@yahoo.com'
    const password = 'Stellabell11'

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Find or create the user
    let user = await User.findOne({ email: email.toLowerCase() })

    if (user) {
      // Update existing user
      user.password = hashedPassword
      user.isOwner = true
      user.role = 'owner'
      await user.save()
      console.log(`✅ Updated existing user: ${email}`)
      console.log(`   - Password updated`)
      console.log(`   - Owner access enabled`)
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: 'Platform Owner',
        firstName: 'Platform',
        lastName: 'Owner',
        userType: 'user',
        isOwner: true,
        role: 'owner',
        wallet: {
          balance: 0,
          pendingBalance: 0
        }
      })
      await user.save()
      console.log(`✅ Created new owner user: ${email}`)
    }

    console.log('')
    console.log('🎉 Owner setup complete!')
    console.log('')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('')
    console.log('💡 You can now login to the Owner Portal at: http://localhost:3002')
    console.log('')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting up owner:', error)
    process.exit(1)
  }
}

setupOwner()

