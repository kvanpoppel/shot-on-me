/**
 * Backfill Virtual Cards
 *
 * Finds all regular users who do not have an active virtual card
 * and creates one via Stripe Issuing.
 *
 * Run with: node backend/scripts/backfillVirtualCards.js
 *
 * Safe to re-run — skips users who already have a card.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const VirtualCard = require('../models/VirtualCard');
const stripeUtils = require('../utils/stripe');

const BATCH_SIZE = 10; // Process 10 users at a time to avoid Stripe rate limits
const DELAY_MS = 500; // 500ms delay between batches

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function backfill() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  // Check Stripe Issuing is enabled before doing anything
  const issuingEnabled = await stripeUtils.isIssuingEnabled();
  if (!issuingEnabled) {
    console.error('❌ Stripe Issuing is not enabled. Enable it at https://dashboard.stripe.com/issuing then re-run.');
    process.exit(1);
  }

  // Find all users who already have an active card
  const usersWithCards = await VirtualCard.distinct('user', { status: 'active' });
  console.log(`ℹ️  ${usersWithCards.length} users already have an active card — skipping them\n`);

  // Find all regular users without a card
  const users = await User.find({
    userType: 'user',
    _id: { $nin: usersWithCards }
  }).select('_id name email phoneNumber address').lean();

  console.log(`👥 ${users.length} users need a virtual card\n`);

  if (users.length === 0) {
    console.log('✅ Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(`⏳ Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (users ${i + 1}–${Math.min(i + BATCH_SIZE, users.length)})...`);

    await Promise.allSettled(batch.map(async (user) => {
      try {
        // Double-check no card was created in a concurrent run
        const existing = await VirtualCard.findOne({ user: user._id, status: 'active' });
        if (existing) {
          console.log(`  ⏭️  ${user.email} — already has card, skipping`);
          return;
        }

        const nameParts = (user.name || '').split(' ');
        const cardData = await stripeUtils.createVirtualCard(user._id.toString(), {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address
        });

        await VirtualCard.create({
          user: user._id,
          stripeCardId: cardData.cardId,
          stripeCardholderId: cardData.cardholderId,
          last4: cardData.last4,
          brand: cardData.brand,
          expirationMonth: cardData.expirationMonth,
          expirationYear: cardData.expirationYear,
          status: 'active',
          metadata: { createdAt: new Date(), source: 'backfill' }
        });

        console.log(`  ✅ ${user.email} — card created (****${cardData.last4})`);
        created++;
      } catch (err) {
        console.error(`  ❌ ${user.email} — failed: ${err.message}`);
        failed++;
      }
    }));

    if (i + BATCH_SIZE < users.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n🏁 Done. Created: ${created} | Failed: ${failed}`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
