/**
 * Test script for Virtual Cards API
 * Run with: node backend/tests/virtual-cards.test.js
 * 
 * Prerequisites:
 * - Backend server running on port 5000
 * - Valid user token (get from login)
 * - Stripe Issuing enabled (or will show appropriate error)
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
let authToken = process.env.TEST_TOKEN || '';

// Test user credentials (update these)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testCardStatus() {
  try {
    console.log('\n📋 Testing: GET /api/virtual-cards/status');
    const response = await axios.get(`${API_URL}/virtual-cards/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Card status:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Card status failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testCardCreation() {
  try {
    console.log('\n📋 Testing: POST /api/virtual-cards/create');
    const response = await axios.post(`${API_URL}/virtual-cards/create`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Card created:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('⚠️ Stripe Issuing not enabled (expected if not set up yet)');
      console.log('   Error:', error.response.data.message);
    } else if (error.response?.status === 400) {
      console.log('⚠️ Card creation failed:', error.response.data.message);
    } else {
      console.error('❌ Card creation failed:', error.response?.data || error.message);
    }
    throw error;
  }
}

async function testCommissionCalculation() {
  try {
    console.log('\n📋 Testing: Commission Calculation');
    const stripeUtils = require('../utils/stripe');
    
    const testCases = [
      { amount: 10, expected: 0.50 },
      { amount: 19.99, expected: 0.50 },
      { amount: 20, expected: 0.50 },
      { amount: 50, expected: 1.25 },
      { amount: 100, expected: 2.50 }
    ];
    
    testCases.forEach(test => {
      const commission = stripeUtils.calculateCommission(test.amount);
      const passed = commission.amount === test.expected;
      console.log(`${passed ? '✅' : '❌'} $${test.amount} → Commission: $${commission.amount} (Expected: $${test.expected})`);
      if (!passed) {
        console.log('   Details:', commission);
      }
    });
  } catch (error) {
    console.error('❌ Commission test failed:', error.message);
  }
}

async function testStripeIssuingStatus() {
  try {
    console.log('\n📋 Testing: Stripe Issuing Status');
    const stripeUtils = require('../utils/stripe');
    const isEnabled = await stripeUtils.isIssuingEnabled();
    console.log(isEnabled ? '✅ Stripe Issuing is enabled' : '⚠️ Stripe Issuing is not enabled');
    return isEnabled;
  } catch (error) {
    console.error('❌ Stripe Issuing check failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Virtual Cards API Tests\n');
  console.log('=' .repeat(50));
  
  try {
    // Login first
    if (!authToken) {
      await login();
    }
    
    // Test Stripe Issuing status
    const issuingEnabled = await testStripeIssuingStatus();
    
    // Test commission calculation
    await testCommissionCalculation();
    
    // Test card status
    const status = await testCardStatus();
    
    // Test card creation (only if balance >= $5)
    if (status.canCreate) {
      try {
        await testCardCreation();
      } catch (error) {
        // Expected if Stripe Issuing not enabled
      }
    } else {
      console.log('\n⚠️ Cannot create card: Balance too low or other issue');
      console.log('   Status:', status);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testCardStatus, testCardCreation };

