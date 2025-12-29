/**
 * Quick script to check if Stripe keys match
 * Run with: node backend/scripts/check-stripe-keys.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('\n🔍 Checking Stripe Keys...\n');

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!secretKey) {
  console.log('❌ STRIPE_SECRET_KEY is missing');
  process.exit(1);
}

if (!publishableKey) {
  console.log('❌ STRIPE_PUBLISHABLE_KEY is missing');
  process.exit(1);
}

// Extract account IDs (the part after sk_test_/pk_test_)
const secretMatch = secretKey.match(/sk_(test|live)_(\w+)/);
const publishableMatch = publishableKey.match(/pk_(test|live)_(\w+)/);

if (!secretMatch || !publishableMatch) {
  console.log('❌ Invalid key format');
  process.exit(1);
}

const secretAccountId = secretMatch[2].substring(0, 10);
const publishableAccountId = publishableMatch[2].substring(0, 10);
const secretMode = secretMatch[1];
const publishableMode = publishableMatch[1];

console.log(`Secret Key:      sk_${secretMode}_${secretAccountId}...`);
console.log(`Publishable Key: pk_${publishableMode}_${publishableAccountId}...`);
console.log('');

if (secretAccountId === publishableAccountId && secretMode === publishableMode) {
  console.log('✅ Keys are from the SAME account and mode!');
  console.log('✅ Everything looks good.');
  process.exit(0);
} else {
  console.log('❌ Keys are from DIFFERENT accounts or modes!');
  console.log('');
  console.log('TO FIX:');
  console.log('  1. Go to https://dashboard.stripe.com');
  console.log('  2. Get BOTH keys from the SAME account');
  console.log('  3. Update backend/.env');
  console.log('');
  console.log(`   Secret account ID:      ${secretAccountId}...`);
  console.log(`   Publishable account ID: ${publishableAccountId}...`);
  console.log(`   Secret mode:            ${secretMode}`);
  console.log(`   Publishable mode:       ${publishableMode}`);
  process.exit(1);
}

