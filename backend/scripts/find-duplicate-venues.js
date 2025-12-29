require('dotenv').config()
const mongoose = require('mongoose')
const Venue = require('../models/Venue')
const User = require('../models/User')

async function findDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme')
    console.log('✅ Connected to MongoDB\n')

    const venues = await Venue.find().populate('owner', 'email').lean()
    
    console.log(`📊 Total venues: ${venues.length}\n`)
    
    // Group by name (case-insensitive)
    const nameMap = new Map()
    venues.forEach(venue => {
      const normalizedName = (venue.name || '').toLowerCase().trim()
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, [])
      }
      nameMap.get(normalizedName).push(venue)
    })
    
    // Find duplicates
    const duplicates = []
    nameMap.forEach((venueList, name) => {
      if (venueList.length > 1) {
        duplicates.push({ name, venues: venueList })
      }
    })
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate venues found!')
    } else {
      console.log(`⚠️  Found ${duplicates.length} duplicate venue name(s):\n`)
      
      duplicates.forEach(({ name, venues: venueList }) => {
        console.log(`📌 "${name}" (${venueList.length} duplicates):`)
        venueList.forEach((venue, index) => {
          console.log(`   ${index + 1}. ID: ${venue._id}`)
          console.log(`      Owner: ${venue.owner?.email || venue.owner || 'N/A'}`)
          console.log(`      Created: ${venue.createdAt ? new Date(venue.createdAt).toLocaleString() : 'N/A'}`)
          console.log(`      Promotions: ${venue.promotions?.length || 0}`)
          console.log(`      Active: ${venue.isActive !== false ? 'Yes' : 'No'}`)
          console.log('')
        })
      })
      
      console.log('\n💡 To remove duplicates, you can:')
      console.log('   1. Keep the most recent one')
      console.log('   2. Keep the one with the most promotions')
      console.log('   3. Manually delete duplicates using MongoDB')
    }
    
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

findDuplicates()

