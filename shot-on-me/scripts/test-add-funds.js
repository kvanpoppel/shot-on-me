/**
 * Smoke test for Add Funds flow
 * Tests that /api/payments/create-intent endpoint works correctly
 */

const axios = require('axios')

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const TEST_JWT = process.env.TEST_JWT || process.env.TEST_TOKEN

async function testCreateIntent() {
  console.log('🧪 Testing /api/payments/create-intent endpoint\n')
  console.log('Configuration:')
  console.log(`  API URL: ${API_URL}`)
  console.log(`  JWT Token: ${TEST_JWT ? TEST_JWT.substring(0, 20) + '...' : 'NOT SET'}\n`)

  if (!TEST_JWT) {
    console.error('❌ Error: TEST_JWT or TEST_TOKEN environment variable is not set.')
    console.error('Please set $env:TEST_JWT="<your_jwt_token>" or $env:TEST_TOKEN="<your_jwt_token>"')
    return { success: false, error: 'JWT token missing' }
  }

  try {
    const response = await axios.post(
      `${API_URL}/payments/create-intent`,
      {
        amount: 10,
        savePaymentMethod: false
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_JWT}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('✅ Create Intent request successful!')
    console.log('Response Status:', response.status)
    console.log('Response Data:', JSON.stringify({
      hasClientSecret: !!response.data.clientSecret,
      status: response.data.status,
      amount: response.data.amount
    }, null, 2))

    if (response.data.clientSecret) {
      console.log('\n✅ SUCCESS: clientSecret is present in response')
      return {
        success: true,
        sent: true,
        status: response.status,
        response: {
          hasClientSecret: true,
          status: response.data.status,
          amount: response.data.amount
        }
      }
    } else {
      console.error('\n❌ FAILURE: clientSecret is missing from response')
      return {
        success: false,
        sent: true,
        status: response.status,
        response: response.data,
        error: 'clientSecret missing'
      }
    }
  } catch (error) {
    console.error('❌ Create Intent request failed!')
    if (error.response) {
      console.error('Error Status:', error.response.status)
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2))
      return {
        success: false,
        sent: true,
        status: error.response.status,
        response: error.response.data,
        error: error.response.data?.message || error.response.data?.error || 'Request failed'
      }
    } else if (error.request) {
      console.error('No response received:', error.request)
      return {
        success: false,
        sent: false,
        error: 'No response from server'
      }
    } else {
      console.error('Error Message:', error.message)
      return {
        success: false,
        sent: false,
        error: error.message
      }
    }
  }
}

// Run test
testCreateIntent()
  .then(result => {
    process.exit(result.success ? 0 : 1)
  })
  .catch(err => {
    console.error('Unexpected error:', err)
    process.exit(1)
  })
