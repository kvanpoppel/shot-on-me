require('dotenv').config();
const axios = require('axios');

// Use backend port directly
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const SERVER_URL = BASE_URL.replace('/api', '');

async function testAuth() {
  console.log('🧪 Testing Authentication System\n');
  console.log(`📍 API URL: ${BASE_URL}\n`);

  // Test 1: Check if server is running
  console.log('1️⃣ Testing server connection...');
  try {
    const healthCheck = await axios.get(`${BASE_URL.replace('/api', '')}/health`, { timeout: 3000 }).catch(() => null);
    if (healthCheck) {
      console.log('   ✅ Server is running\n');
    } else {
      console.log('   ⚠️  Health endpoint not available (this is okay)\n');
    }
  } catch (error) {
    console.log('   ⚠️  Could not reach server - make sure backend is running on port 5000\n');
  }

  // Test 2: Test login endpoint exists
  console.log('2️⃣ Testing login endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    }, { 
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.status === 401) {
      console.log('   ✅ Login endpoint is working (returned 401 for invalid credentials - expected)\n');
    } else if (response.status === 400) {
      console.log('   ✅ Login endpoint is working (returned 400 for missing fields - expected)\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Cannot connect to server - is backend running on port 5000?\n');
    } else {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
  }

  // Test 3: Test forgot password endpoint
  console.log('3️⃣ Testing forgot password endpoint...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: 'test@example.com'
    }, { 
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      console.log('   ✅ Forgot password endpoint is working');
      if (response.data.resetToken) {
        console.log(`   ✅ Reset token returned: ${response.data.resetToken.substring(0, 20)}...`);
        if (response.data.resetUrl) {
          console.log(`   ✅ Reset URL: ${response.data.resetUrl}`);
        }
      }
      console.log('');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Cannot connect to server - is backend running on port 5000?\n');
    } else {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
  }

  // Test 4: Check MongoDB connection (indirectly)
  console.log('4️⃣ Testing database connection (via login endpoint)...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'test'
    }, { 
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 503) {
      console.log('   ❌ Database not connected - check MongoDB connection\n');
    } else if (response.status === 401 || response.status === 400) {
      console.log('   ✅ Database is connected (endpoint responded, not 503)\n');
    } else {
      console.log(`   ⚠️  Status: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}\n`);
  }

  console.log('✅ Auth system test complete!\n');
  console.log('💡 If all tests passed, the system is ready.');
  console.log('   If any failed, check the error messages above.\n');
}

testAuth().catch(console.error);

