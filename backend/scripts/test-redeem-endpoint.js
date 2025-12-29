/**
 * Test script for /api/payments/redeem endpoint
 * 
 * Usage:
 *   node backend/scripts/test-redeem-endpoint.js
 * 
 * Prerequisites:
 *   - Backend server running on port 5000
 *   - Valid JWT token (replace TOKEN below)
 *   - Valid paymentId or redemptionCode
 *   - Valid venueId with Stripe Connect account
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const TOKEN = process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE';

// Test configuration
const testConfig = {
  paymentId: process.env.TEST_PAYMENT_ID || null, // Optional: use paymentId
  redemptionCode: process.env.TEST_REDEMPTION_CODE || null, // Optional: use redemptionCode
  venueId: process.env.TEST_VENUE_ID || null, // Required for venue redemption
  idempotencyKey: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

async function testRedeem() {
  console.log('🧪 Testing /api/payments/redeem endpoint\n');
  console.log('Configuration:');
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Payment ID: ${testConfig.paymentId || 'N/A'}`);
  console.log(`  Redemption Code: ${testConfig.redemptionCode || 'N/A'}`);
  console.log(`  Venue ID: ${testConfig.venueId || 'N/A'}`);
  console.log(`  Idempotency Key: ${testConfig.idempotencyKey}\n`);

  if (!testConfig.paymentId && !testConfig.redemptionCode) {
    console.error('❌ Error: Either paymentId or redemptionCode must be provided');
    console.log('\nSet environment variables:');
    console.log('  TEST_PAYMENT_ID=<paymentId>');
    console.log('  TEST_REDEMPTION_CODE=<code>');
    console.log('  TEST_VENUE_ID=<venueId>');
    console.log('  TEST_TOKEN=<jwt_token>');
    process.exit(1);
  }

  if (!testConfig.venueId) {
    console.warn('⚠️  Warning: venueId not provided. Redemption will fail if venue is required.');
  }

  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.error('❌ Error: JWT token not provided');
    console.log('\nSet TEST_TOKEN environment variable with a valid JWT token');
    process.exit(1);
  }

  try {
    const requestBody = {
      idempotencyKey: testConfig.idempotencyKey
    };

    if (testConfig.paymentId) {
      requestBody.paymentId = testConfig.paymentId;
    } else if (testConfig.redemptionCode) {
      requestBody.redemptionCode = testConfig.redemptionCode;
    }

    if (testConfig.venueId) {
      requestBody.venueId = testConfig.venueId;
    }

    console.log('📤 Sending POST request to /api/payments/redeem...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('');

    const response = await axios.post(
      `${API_URL}/payments/redeem`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Success!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // Test idempotency: send same request again
    console.log('\n🔄 Testing idempotency (sending same request again)...');
    const idempotentResponse = await axios.post(
      `${API_URL}/payments/redeem`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Idempotency test result:');
    console.log('Response status:', idempotentResponse.status);
    console.log('Response data:', JSON.stringify(idempotentResponse.data, null, 2));
    
    if (idempotentResponse.data.idempotent === true) {
      console.log('\n✅ Idempotency working correctly!');
    } else {
      console.log('\n⚠️  Warning: Idempotency may not be working as expected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the backend server running?');
    }
    process.exit(1);
  }
}

// Run test
testRedeem();



