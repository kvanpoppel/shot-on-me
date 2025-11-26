import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

// Get your current IP
async function getCurrentIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

// Whitelist IP using MongoDB Atlas API
async function whitelistIP(ipAddress, apiKey, apiSecret, projectId) {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  
  const postData = JSON.stringify({
    ipAddress: ipAddress,
    comment: `Auto-added by script - ${new Date().toISOString()}`
  });

  const options = {
    hostname: 'cloud.mongodb.com',
    port: 443,
    path: `/api/atlas/v1.0/groups/${projectId}/accessList`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      'Authorization': `Basic ${auth}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          try {
            const error = JSON.parse(data);
            reject(new Error(error.detail || error.error || `HTTP ${res.statusCode}: ${data}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main function
async function main() {
  console.log('🔍 MongoDB Atlas IP Whitelisting Tool');
  console.log('=====================================\n');

  // Get API credentials from environment or prompt
  const apiKey = process.env.MONGODB_ATLAS_PUBLIC_KEY || process.argv[2];
  const apiSecret = process.env.MONGODB_ATLAS_PRIVATE_KEY || process.argv[3];
  const projectId = process.env.MONGODB_ATLAS_PROJECT_ID || process.argv[4];
  const ipToWhitelist = process.argv[5] || null;

  if (!apiKey || !apiSecret || !projectId) {
    console.error('❌ Missing required credentials!\n');
    console.log('Usage:');
    console.log('  node whitelist-ip-atlas.js <PUBLIC_KEY> <PRIVATE_KEY> <PROJECT_ID> [IP_ADDRESS]');
    console.log('\nOr set environment variables:');
    console.log('  MONGODB_ATLAS_PUBLIC_KEY=your_public_key');
    console.log('  MONGODB_ATLAS_PRIVATE_KEY=your_private_key');
    console.log('  MONGODB_ATLAS_PROJECT_ID=your_project_id');
    console.log('\n📖 How to get your API keys:');
    console.log('1. Go to: https://cloud.mongodb.com/v2#/account/apiKeys');
    console.log('2. Click "Create API Key"');
    console.log('3. Give it a name (e.g., "IP Whitelist Script")');
    console.log('4. Set permissions: "Project IP Access List Admin"');
    console.log('5. Copy the Public Key and Private Key');
    console.log('\n📖 How to get your Project ID:');
    console.log('1. Go to: https://cloud.mongodb.com/v2');
    console.log('2. Click on your project');
    console.log('3. The Project ID is in the URL or in the project settings');
    process.exit(1);
  }

  try {
    // Get IP address
    let ipAddress = ipToWhitelist;
    if (!ipAddress) {
      console.log('🌐 Getting your current IP address...');
      ipAddress = await getCurrentIP();
      console.log(`📍 Your IP: ${ipAddress}\n`);
    } else {
      console.log(`📍 Using IP: ${ipAddress}\n`);
    }

    // Whitelist the IP
    console.log('🔄 Whitelisting IP in MongoDB Atlas...');
    const result = await whitelistIP(ipAddress, apiKey, apiSecret, projectId);
    
    console.log('✅ Successfully whitelisted IP!');
    console.log(`   IP: ${ipAddress}`);
    console.log(`   Status: ${result.status || 'Active'}`);
    console.log('\n⏳ Please wait 1-2 minutes for changes to take effect.');
    console.log('🧪 Test connection: node test-mongodb.js\n');
    
  } catch (error) {
    console.error('❌ Error whitelisting IP:');
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   Authentication failed. Check your API keys.');
    } else if (error.message.includes('409') || error.message.includes('already exists')) {
      console.error(`   IP ${ipAddress} is already whitelisted.`);
      console.log('✅ You should be able to connect now!');
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

main();

