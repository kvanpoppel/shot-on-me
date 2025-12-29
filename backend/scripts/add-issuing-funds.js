require('dotenv').config();
const stripeUtils = require('../utils/stripe');

async function addIssuingFunds() {
  try {
    const stripe = stripeUtils.stripe;
    
    if (!stripe) {
      console.error('❌ Stripe is not configured. Check your STRIPE_SECRET_KEY in .env');
      process.exit(1);
    }

    // Amount to add (in cents) - $1000 = 100000 cents
    const amount = 100000; // $1000.00
    
    console.log('💰 Adding funds to Issuing balance...');
    console.log(`   Amount: $${amount / 100}`);
    
    // In test mode, you can't directly add funds to Issuing balance via API
    // You need to use the Dashboard or Stripe CLI
    console.log('⚠️  In test mode, funds must be added through the Dashboard.');
    console.log('   The API method is not available for test Issuing accounts.');
    console.log('\n📋 Steps to add funds:');
    console.log('   1. Go to: https://dashboard.stripe.com/test/issuing/balance');
    console.log('   2. Click "Add funds" or "Top up" button');
    console.log('   3. Enter amount (e.g., $1000)');
    console.log('   4. Confirm');
    console.log('\n💡 If the button is not available:');
    console.log('   - Your account may need Issuing activation');
    console.log('   - Complete your business profile first');
    console.log('   - Contact Stripe support to enable Issuing');
    
    // Try to check Issuing balance status
    try {
      const balance = await stripe.balance.retrieve();
      console.log('\n📊 Current Account Balance:');
      console.log('   Available:', `$${(balance.available[0]?.amount || 0) / 100}`);
      console.log('   Pending:', `$${(balance.pending[0]?.amount || 0) / 100}`);
    } catch (err) {
      console.log('\n⚠️  Could not retrieve balance');
    }
    
    // Check if Issuing is enabled
    try {
      const issuingEnabled = await stripe.issuing.cardholders.list({ limit: 1 });
      console.log('\n✅ Issuing is enabled on your account');
    } catch (err) {
      console.log('\n❌ Issuing may not be fully enabled:', err.message);
      console.log('   You may need to activate Issuing in your Stripe Dashboard');
    }

    console.log('✅ Top-up created:', topUp.id);
    console.log('   Status:', topUp.status);
    console.log('   Amount:', `$${(topUp.amount / 100).toFixed(2)}`);
    
    // Alternative: Use the Issuing API directly if available
    // Some accounts need to use the balance API
    try {
      const balance = await stripe.balance.retrieve();
      console.log('\n📊 Current Balance:');
      console.log('   Available:', `$${(balance.available[0]?.amount || 0) / 100}`);
      console.log('   Pending:', `$${(balance.pending[0]?.amount || 0) / 100}`);
    } catch (err) {
      console.log('⚠️  Could not retrieve balance:', err.message);
    }

    console.log('\n💡 Note: In test mode, funds may need to be added through the Dashboard.');
    console.log('   Go to: https://dashboard.stripe.com/test/issuing/balance');
    console.log('   Or use: https://dashboard.stripe.com/test/issuing/overview');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding funds:', error.message);
    console.error('\n💡 Alternative methods:');
    console.error('   1. Go to Stripe Dashboard → Issuing → Balance');
    console.error('   2. Click "Add funds" or "Top up"');
    console.error('   3. Or contact Stripe support if the option is not available');
    console.error('\n   The account may need:');
    console.error('   - Business profile completion');
    console.error('   - Issuing activation');
    console.error('   - Account verification');
    process.exit(1);
  }
}

addIssuingFunds();

