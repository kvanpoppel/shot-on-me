require('dotenv').config()
const mongoose = require('mongoose')
const Venue = require('../models/Venue')
const User = require('../models/User')

async function cleanupDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme')
    console.log('✅ Connected to MongoDB\n')

    const venues = await Venue.find().populate('owner', 'email').lean()
    
    console.log(`📊 Total venues: ${venues.length}\n`)
    
    // Group by name and owner (case-insensitive)
    const venueMap = new Map()
    const duplicatesToDelete = []
    
    venues.forEach(venue => {
      const normalizedName = (venue.name || '').toLowerCase().trim()
      const ownerId = venue.owner?._id?.toString() || venue.owner?.toString() || 'unknown'
      const key = `${normalizedName}_${ownerId}`
      
      if (!venueMap.has(key)) {
        venueMap.set(key, venue)
      } else {
        // Compare with existing venue
        const existing = venueMap.get(key)
        const existingDate = existing.createdAt ? new Date(existing.createdAt) : new Date(0)
        const newDate = venue.createdAt ? new Date(venue.createdAt) : new Date(0)
        const existingPromos = existing.promotions?.length || 0
        const newPromos = venue.promotions?.length || 0
        
        // Keep the one with more promotions, or if equal, the most recent
        if (newPromos > existingPromos || (newPromos === existingPromos && newDate > existingDate)) {
          duplicatesToDelete.push(existing._id)
          venueMap.set(key, venue)
        } else {
          duplicatesToDelete.push(venue._id)
        }
      }
    })
    
    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicates to clean up!')
    } else {
      console.log(`⚠️  Found ${duplicatesToDelete.length} duplicate venue(s) to delete\n`)
      console.log('🗑️  Deleting duplicates...\n')
      
      // Delete duplicates
      const result = await Venue.deleteMany({ _id: { $in: duplicatesToDelete } })
      
      console.log(`✅ Deleted ${result.deletedCount} duplicate venue(s)`)
      console.log(`📊 Remaining venues: ${venues.length - result.deletedCount}`)
    }
    
    await mongoose.disconnect()
    console.log('\n✅ Cleanup complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

cleanupDuplicates()

