const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = null;
let testUserId = null;

// Test user credentials (you may need to adjust these)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123456';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logTest(message) {
  log(`🧪 ${message}`, 'blue');
}

async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    logTest(`Testing ${name}...`);
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    logSuccess(`${name}: Status ${response.status}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      logError(`${name}: Status ${error.response.status} - ${error.response.data?.message || error.message}`);
      return { success: false, status: error.response.status, error: error.response.data };
    } else {
      logError(`${name}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  log('\n🚀 Starting Engagement Features Test Suite\n', 'cyan');
  log('='.repeat(60), 'cyan');

  // 1. Health Check
  log('\n📋 1. Health Check', 'yellow');
  await testEndpoint('Health Check', 'GET', '/health');

  // 2. Authentication (Login or Register)
  log('\n📋 2. Authentication', 'yellow');
  const loginResult = await testEndpoint('Login', 'POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginResult.success) {
    authToken = loginResult.data.token;
    testUserId = loginResult.data.user?.id || loginResult.data.user?._id;
    logSuccess('Authentication successful!');
  } else {
    // Try to register
    logInfo('Login failed, attempting registration...');
    const registerResult = await testEndpoint('Register', 'POST', '/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+1234567890'
    });

    if (registerResult.success) {
      authToken = registerResult.data.token;
      testUserId = registerResult.data.user?.id || registerResult.data.user?._id;
      logSuccess('Registration successful!');
    } else {
      logError('Cannot proceed without authentication');
      return;
    }
  }

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // 3. Gamification - Stats
  log('\n📋 3. Gamification System', 'yellow');
  await testEndpoint('Get Stats', 'GET', '/gamification/stats', null, authHeaders);
  await testEndpoint('Get Badges', 'GET', '/gamification/badges', null, authHeaders);
  await testEndpoint('Check Badges', 'POST', '/gamification/check-badges', null, authHeaders);
  
  // Leaderboards
  await testEndpoint('Leaderboard - Generous', 'GET', '/gamification/leaderboards?type=generous', null, authHeaders);
  await testEndpoint('Leaderboard - Active', 'GET', '/gamification/leaderboards?type=active', null, authHeaders);
  await testEndpoint('Leaderboard - Points', 'GET', '/gamification/leaderboards?type=points', null, authHeaders);

  // 4. Referrals
  log('\n📋 4. Referral System', 'yellow');
  await testEndpoint('Get Referral Code', 'GET', '/referrals/code', null, authHeaders);
  await testEndpoint('Get Referral History', 'GET', '/referrals/history', null, authHeaders);

  // 5. Rewards
  log('\n📋 5. Rewards System', 'yellow');
  await testEndpoint('Get Rewards', 'GET', '/rewards', null, authHeaders);
  await testEndpoint('Get My Rewards', 'GET', '/rewards/my-rewards', null, authHeaders);

  // 6. Tonight Feature
  log('\n📋 6. Tonight Discovery', 'yellow');
  await testEndpoint('Tonight Feed', 'GET', '/tonight?latitude=40.7128&longitude=-74.0060', null, authHeaders);

  // 7. Events
  log('\n📋 7. Events System', 'yellow');
  await testEndpoint('Get Events', 'GET', '/events', null, authHeaders);
  await testEndpoint('Get Upcoming Events', 'GET', '/events?upcoming=true', null, authHeaders);
  await testEndpoint('Get Tonight Events', 'GET', '/events?tonight=true', null, authHeaders);

  // 8. Venue Analytics (if user has a venue)
  log('\n📋 8. Venue Analytics', 'yellow');
  logInfo('Skipping venue analytics (requires venue ownership)');

  // 9. Test Integration - Check if points are being tracked
  log('\n📋 9. Integration Test', 'yellow');
  const statsAfter = await testEndpoint('Get Stats Again', 'GET', '/gamification/stats', null, authHeaders);
  if (statsAfter.success) {
    logInfo(`Current Points: ${statsAfter.data.points || 0}`);
    logInfo(`Total Sent: $${statsAfter.data.totalSent || 0}`);
    logInfo(`Total Received: $${statsAfter.data.totalReceived || 0}`);
    logInfo(`Total Check-ins: ${statsAfter.data.totalCheckIns || 0}`);
    logInfo(`Badges Unlocked: ${statsAfter.data.badgesUnlocked || 0}`);
  }

  log('\n' + '='.repeat(60), 'cyan');
  log('\n🎉 Test Suite Complete!\n', 'green');
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});

