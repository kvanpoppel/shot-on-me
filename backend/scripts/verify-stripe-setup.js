/**
 * Comprehensive Stripe Setup Verification Script
 * Run with: node backend/scripts/verify-stripe-setup.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function verifyStripeSetup() {
  console.log('\n🔍 VERIFYING STRIPE SETUP...\n');
  console.log('='.repeat(60));
  
  const issues = [];
  const warnings = [];
  const success = [];

  // 1. Check API Keys
  console.log('\n1️⃣  Checking API Keys...');
  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push('❌ STRIPE_SECRET_KEY is missing in backend/.env');
  } else if (process.env.STRIPE_SECRET_KEY.includes('sk_test_') || process.env.STRIPE_SECRET_KEY.includes('sk_live_')) {
    success.push('✅ STRIPE_SECRET_KEY is set');
    
    // Verify key is valid
    try {
      await stripe.account.retrieve();
      success.push('✅ Stripe API key is valid and working');
    } catch (error) {
      issues.push(`❌ Stripe API key is invalid: ${error.message}`);
    }
  } else {
    issues.push('❌ STRIPE_SECRET_KEY format is invalid (should start with sk_test_ or sk_live_)');
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    issues.push('❌ STRIPE_PUBLISHABLE_KEY is missing in backend/.env');
  } else if (process.env.STRIPE_PUBLISHABLE_KEY.includes('pk_test_') || process.env.STRIPE_PUBLISHABLE_KEY.includes('pk_live_')) {
    success.push('✅ STRIPE_PUBLISHABLE_KEY is set');
  } else {
    issues.push('❌ STRIPE_PUBLISHABLE_KEY format is invalid (should start with pk_test_ or pk_live_)');
  }

  // 2. Check if keys match (same account)
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
    const secretAccountId = process.env.STRIPE_SECRET_KEY.split('_')[2]?.substring(0, 10);
    const publishableAccountId = process.env.STRIPE_PUBLISHABLE_KEY.split('_')[2]?.substring(0, 10);
    
    if (secretAccountId && publishableAccountId && secretAccountId === publishableAccountId) {
      success.push('✅ Secret and Publishable keys are from the same Stripe account');
    } else {
      issues.push('❌ Secret and Publishable keys are from DIFFERENT Stripe accounts!');
      issues.push('   Both keys must start with the same account ID (e.g., sk_test_51XXXXX and pk_test_51XXXXX)');
    }
  }

  // 3. Check Stripe Issuing
  console.log('\n2️⃣  Checking Stripe Issuing...');
  try {
    await stripe.issuing.cardholders.list({ limit: 1 });
    success.push('✅ Stripe Issuing is ENABLED on your account');
  } catch (error) {
    if (error.code === 'resource_missing' || error.message?.includes('issuing')) {
      warnings.push('⚠️  Stripe Issuing is NOT enabled on your account');
      warnings.push('   → Virtual cards will NOT be created automatically');
      warnings.push('   → To enable: Go to Stripe Dashboard → Issuing → Enable Issuing');
    } else {
      issues.push(`❌ Error checking Issuing: ${error.message}`);
    }
  }

  // 4. Check Webhook Configuration
  console.log('\n3️⃣  Checking Webhook Configuration...');
  
  // Check if webhook secret is set
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('⚠️  STRIPE_WEBHOOK_SECRET is not set in backend/.env');
    warnings.push('   → Webhook signature verification will be disabled');
    warnings.push('   → Get secret from Stripe Dashboard → Webhooks → Your endpoint → Signing secret');
  } else if (process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    success.push('✅ STRIPE_WEBHOOK_SECRET is set');
  } else {
    warnings.push('⚠️  STRIPE_WEBHOOK_SECRET format is invalid (should start with whsec_)');
  }
  
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const webhookUrl = `${backendUrl}/api/payments/webhook`;
    
    const matchingWebhook = webhooks.data.find(w => 
      w.url === webhookUrl || 
      w.url.includes('localhost:5000') ||
      w.url.includes('/api/payments/webhook')
    );

    if (matchingWebhook) {
      success.push(`✅ Webhook endpoint found: ${matchingWebhook.url}`);
      
      // Check required events
      const requiredEvents = ['payment_intent.succeeded', 'payment_intent.payment_failed'];
      const configuredEvents = matchingWebhook.enabled_events;
      const missingEvents = requiredEvents.filter(e => !configuredEvents.includes(e));
      
      if (missingEvents.length === 0) {
        success.push('✅ All required webhook events are configured');
      } else {
        warnings.push(`⚠️  Missing webhook events: ${missingEvents.join(', ')}`);
        warnings.push('   → Wallet balance may not update automatically after payment');
      }
      
      // Check if webhook secret matches
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Note: We can't directly compare, but we can verify format
        success.push('✅ Webhook secret is configured (verify it matches the endpoint secret)');
      }
    } else {
      warnings.push('⚠️  Webhook endpoint NOT found in Stripe Dashboard');
      warnings.push(`   → Add webhook URL: ${webhookUrl}`);
      warnings.push('   → Required events: payment_intent.succeeded, payment_intent.payment_failed');
      warnings.push('   → After creating, copy the Signing secret to STRIPE_WEBHOOK_SECRET in .env');
    }
  } catch (error) {
    warnings.push(`⚠️  Could not check webhooks: ${error.message}`);
  }

  // 5. Check Account Status
  console.log('\n4️⃣  Checking Account Status...');
  try {
    const account = await stripe.account.retrieve();
    success.push(`✅ Account type: ${account.type}`);
    success.push(`✅ Country: ${account.country}`);
    
    if (account.charges_enabled) {
      success.push('✅ Account can accept charges');
    } else {
      warnings.push('⚠️  Account cannot accept charges yet (may need verification)');
    }
  } catch (error) {
    issues.push(`❌ Error checking account: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  
  if (success.length > 0) {
    console.log('✅ SUCCESS:');
    success.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (may affect functionality):');
    warnings.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (issues.length > 0) {
    console.log('❌ CRITICAL ISSUES (must fix):');
    issues.forEach(msg => console.log(`   ${msg}`));
    console.log('');
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('🎉 Everything looks good! Your Stripe setup is complete.\n');
    process.exit(0);
  } else if (issues.length === 0) {
    console.log('✅ No critical issues, but check warnings above.\n');
    process.exit(0);
  } else {
    console.log('❌ Please fix the critical issues above before proceeding.\n');
    process.exit(1);
  }
}

// Run verification
verifyStripeSetup().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
});

