const mongoose = require('mongoose');
const Badge = require('../models/Badge');
require('dotenv').config();

const badges = [
  // Payment badges
  {
    name: 'First Shot',
    description: 'Send your first payment to a friend',
    icon: '🎯',
    category: 'payment',
    criteria: { type: 'total_sent', value: 1, description: 'Send $1 total' },
    rarity: 'common',
    pointsReward: 10
  },
  {
    name: 'Generous Friend',
    description: 'Send $100 total to friends',
    icon: '💰',
    category: 'payment',
    criteria: { type: 'total_sent', value: 100, description: 'Send $100 total' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Big Spender',
    description: 'Send $500 total to friends',
    icon: '💸',
    category: 'payment',
    criteria: { type: 'total_sent', value: 500, description: 'Send $500 total' },
    rarity: 'rare',
    pointsReward: 200
  },
  {
    name: 'Philanthropist',
    description: 'Send $1,000 total to friends',
    icon: '🏆',
    category: 'payment',
    criteria: { type: 'total_sent', value: 1000, description: 'Send $1,000 total' },
    rarity: 'epic',
    pointsReward: 500
  },
  {
    name: 'Lucky Recipient',
    description: 'Receive your first payment',
    icon: '🎁',
    category: 'payment',
    criteria: { type: 'total_received', value: 1, description: 'Receive $1 total' },
    rarity: 'common',
    pointsReward: 10
  },
  
  // Social badges
  {
    name: 'Social Butterfly',
    description: 'Add 10 friends',
    icon: '🦋',
    category: 'social',
    criteria: { type: 'friends', value: 10, description: 'Add 10 friends' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Popular',
    description: 'Add 50 friends',
    icon: '⭐',
    category: 'social',
    criteria: { type: 'friends', value: 50, description: 'Add 50 friends' },
    rarity: 'rare',
    pointsReward: 200
  },
  {
    name: 'Content Creator',
    description: 'Create 10 posts',
    icon: '📸',
    category: 'social',
    criteria: { type: 'posts', value: 10, description: 'Create 10 posts' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Influencer',
    description: 'Create 50 posts',
    icon: '📱',
    category: 'social',
    criteria: { type: 'posts', value: 50, description: 'Create 50 posts' },
    rarity: 'rare',
    pointsReward: 200
  },
  
  // Venue badges
  {
    name: 'Explorer',
    description: 'Check in at 5 different venues',
    icon: '🗺️',
    category: 'venue',
    criteria: { type: 'venue_visits', value: 5, description: 'Visit 5 different venues' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Nightlife Enthusiast',
    description: 'Check in 10 times',
    icon: '🌃',
    category: 'venue',
    criteria: { type: 'check_ins', value: 10, description: 'Check in 10 times' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Regular',
    description: 'Check in 50 times',
    icon: '🍻',
    category: 'venue',
    criteria: { type: 'check_ins', value: 50, description: 'Check in 50 times' },
    rarity: 'rare',
    pointsReward: 200
  },
  {
    name: 'Venue Hopper',
    description: 'Check in at 20 different venues',
    icon: '🎪',
    category: 'venue',
    criteria: { type: 'venue_visits', value: 20, description: 'Visit 20 different venues' },
    rarity: 'rare',
    pointsReward: 200
  },
  
  // Streak badges
  {
    name: 'On a Roll',
    description: 'Maintain a 3-day check-in streak',
    icon: '🔥',
    category: 'streak',
    criteria: { type: 'streak', value: 3, description: '3-day check-in streak' },
    rarity: 'uncommon',
    pointsReward: 50
  },
  {
    name: 'Dedicated',
    description: 'Maintain a 7-day check-in streak',
    icon: '💪',
    category: 'streak',
    criteria: { type: 'streak', value: 7, description: '7-day check-in streak' },
    rarity: 'rare',
    pointsReward: 200
  },
  {
    name: 'Unstoppable',
    description: 'Maintain a 30-day check-in streak',
    icon: '⚡',
    category: 'streak',
    criteria: { type: 'streak', value: 30, description: '30-day check-in streak' },
    rarity: 'epic',
    pointsReward: 500
  },
  
  // Milestone badges
  {
    name: 'Point Collector',
    description: 'Earn 1,000 points',
    icon: '💎',
    category: 'milestone',
    criteria: { type: 'points', value: 1000, description: 'Earn 1,000 points' },
    rarity: 'rare',
    pointsReward: 100
  },
  {
    name: 'Point Master',
    description: 'Earn 5,000 points',
    icon: '👑',
    category: 'milestone',
    criteria: { type: 'points', value: 5000, description: 'Earn 5,000 points' },
    rarity: 'epic',
    pointsReward: 500
  },
  
  // Referral badges
  {
    name: 'Referral Starter',
    description: 'Refer 1 friend',
    icon: '👥',
    category: 'social',
    criteria: { type: 'referrals', value: 1, description: 'Refer 1 friend' },
    rarity: 'common',
    pointsReward: 25
  },
  {
    name: 'Network Builder',
    description: 'Refer 5 friends',
    icon: '🌐',
    category: 'social',
    criteria: { type: 'referrals', value: 5, description: 'Refer 5 friends' },
    rarity: 'uncommon',
    pointsReward: 100
  },
  {
    name: 'Ambassador',
    description: 'Refer 20 friends',
    icon: '🎖️',
    category: 'social',
    criteria: { type: 'referrals', value: 20, description: 'Refer 20 friends' },
    rarity: 'epic',
    pointsReward: 500
  }
];

async function seedBadges() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shotonme');
    console.log('✅ Connected to MongoDB');

    // Clear existing badges (optional - comment out if you want to keep existing)
    // await Badge.deleteMany({});
    // console.log('🗑️  Cleared existing badges');

    let created = 0;
    let skipped = 0;

    for (const badgeData of badges) {
      const existing = await Badge.findOne({ name: badgeData.name });
      if (existing) {
        console.log(`⏭️  Skipping ${badgeData.name} (already exists)`);
        skipped++;
        continue;
      }

      const badge = new Badge(badgeData);
      await badge.save();
      console.log(`✅ Created badge: ${badgeData.name}`);
      created++;
    }

    console.log(`\n🎉 Badge seeding complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${badges.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding badges:', error);
    process.exit(1);
  }
}

seedBadges();

