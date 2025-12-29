require('dotenv').config();
const stripeUtils = require('../utils/stripe');

async function testIssuing() {
  try {
    console.log('🔍 Testing Stripe Issuing Status...\n');
    
    // Check if Stripe is configured
    if (!stripeUtils.isStripeConfigured()) {
      console.log('❌ Stripe is not configured');
      console.log('   Check your STRIPE_SECRET_KEY in backend/.env');
      process.exit(1);
    }
    
    console.log('✅ Stripe is configured\n');
    
    // Test if Issuing is enabled
    let issuingEnabled = false;
    let errorDetails = null;
    
    try {
      issuingEnabled = await stripeUtils.isIssuingEnabled();
    } catch (err) {
      errorDetails = err;
    }
    
    // Also try direct API call to see the actual error
    const stripe = stripeUtils.stripe;
    try {
      await stripe.issuing.cardholders.list({ limit: 1 });
      issuingEnabled = true;
    } catch (apiError) {
      errorDetails = apiError;
      console.log('\n📋 API Error Details:');
      console.log('   Code:', apiError.code);
      console.log('   Type:', apiError.type);
      console.log('   Message:', apiError.message);
    }
    
    if (issuingEnabled) {
      console.log('✅ Stripe Issuing IS ENABLED!\n');
      
      // Try to list cardholders
      const stripe = stripeUtils.stripe;
      const cardholders = await stripe.issuing.cardholders.list({ limit: 1 });
      console.log(`📋 Found ${cardholders.data.length} cardholder(s)`);
      
      // Try to list cards
      const cards = await stripe.issuing.cards.list({ limit: 1 });
      console.log(`💳 Found ${cards.data.length} card(s)`);
      
      console.log('\n✅ Your backend can create virtual cards!');
      console.log('   New users will automatically get cards on signup.');
      
    } else {
      console.log('❌ Stripe Issuing is NOT enabled');
      console.log('\n💡 To enable:');
      console.log('   1. Go to: https://dashboard.stripe.com/test/issuing');
      console.log('   2. Complete the setup steps');
      console.log('   3. Or contact Stripe support');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing Issuing:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testIssuing();

