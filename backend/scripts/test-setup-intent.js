require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Test the setup-intent endpoint
async function testSetupIntent() {
  try {
    const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
    
    console.log('🧪 Testing Setup Intent Endpoint\n');
    console.log(`📍 API URL: ${BASE_URL}\n`);

    // Check if Stripe is configured
    console.log('1️⃣ Checking Stripe configuration...');
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('   ❌ STRIPE_SECRET_KEY is not set in .env file');
      console.log('   💡 Add STRIPE_SECRET_KEY=sk_test_... to backend/.env\n');
      return;
    }
    
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      console.log('   ⚠️  STRIPE_SECRET_KEY format looks invalid');
      console.log('   💡 Should start with sk_test_ or sk_live_\n');
    } else {
      console.log('   ✅ STRIPE_SECRET_KEY is set (format looks valid)\n');
    }

    // Get a test token (you'll need to login first to get a real token)
    console.log('2️⃣ Testing endpoint requires authentication...');
    console.log('   💡 To test with a real user:');
    console.log('   1. Login to the app to get a token');
    console.log('   2. Run: node test-setup-intent.js <token>');
    console.log('   3. Or test manually in the browser\n');

    // If token provided, test the endpoint
    const token = process.argv[2];
    if (token) {
      console.log('3️⃣ Testing setup-intent endpoint with token...\n');
      
      try {
        const response = await axios.post(
          `${BASE_URL}/payment-methods/setup-intent`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000,
            validateStatus: () => true // Don't throw on any status
          }
        );

        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));

        if (response.status === 200) {
          console.log('\n   ✅ Setup Intent created successfully!');
          if (response.data.clientSecret) {
            console.log(`   Client Secret: ${response.data.clientSecret.substring(0, 20)}...`);
          }
        } else if (response.status === 503) {
          console.log('\n   ❌ Stripe is not configured');
        } else if (response.status === 401) {
          console.log('\n   ❌ Authentication failed - invalid token');
        } else if (response.status === 500) {
          console.log('\n   ❌ Server error:', response.data.error || response.data.message);
          console.log('   💡 Check backend console logs for details');
        }
      } catch (error) {
        console.log('\n   ❌ Request failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
          console.log('   💡 Backend server is not running on port 5000');
        }
      }
    }

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSetupIntent();

