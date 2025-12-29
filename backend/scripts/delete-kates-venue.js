require('dotenv').config()
const mongoose = require('mongoose')
const Venue = require('../models/Venue')
const Payment = require('../models/Payment')

async function deleteKatesVenue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme')
    console.log('✅ Connected to MongoDB\n')

    // Find all "Kate's Venue" entries (case-insensitive)
    const katesVenues = await Venue.find({
      name: { $regex: /^kate'?s venue$/i }
    })

    console.log(`📊 Found ${katesVenues.length} "Kate's Venue" entries\n`)

    if (katesVenues.length === 0) {
      console.log('✅ No "Kate\'s Venue" entries found!')
      await mongoose.disconnect()
      process.exit(0)
    }

    // Check if any have payments/transactions
    const venueIds = katesVenues.map(v => v._id)
    const payments = await Payment.find({ venueId: { $in: venueIds } })
    
    if (payments.length > 0) {
      console.log(`⚠️  Warning: Found ${payments.length} payment(s) associated with these venues`)
      console.log('   These payments will be orphaned if you delete the venues\n')
    }

    // Delete all "Kate's Venue" entries
    const result = await Venue.deleteMany({
      name: { $regex: /^kate'?s venue$/i }
    })

    console.log(`✅ Deleted ${result.deletedCount} "Kate's Venue" entry/entries`)
    console.log('\n💡 Real venues (Kate\'s Pub, Paige\'s Pub) are unaffected')
    
    await mongoose.disconnect()
    console.log('\n✅ Cleanup complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

deleteKatesVenue()

