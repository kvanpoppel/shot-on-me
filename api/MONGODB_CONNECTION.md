# MongoDB Connection Guide

## Current Status

Your MongoDB Atlas connection is configured, but your current IP address is **not whitelisted** in your Atlas cluster.

**Your Current IP Address:** `208.103.51.3`

## How to Fix

### Option 1: Use Automated Script (Easiest) ⚡

I've created a script that can automatically whitelist your IP using the MongoDB Atlas API:

1. **Get your MongoDB Atlas API credentials:**
   - Go to: https://cloud.mongodb.com/v2#/account/apiKeys
   - Click **"Create API Key"**
   - Name it: "IP Whitelist Script"
   - Set permissions: **"Project IP Access List Admin"**
   - Copy the **Public Key** and **Private Key** (you'll only see the private key once!)

2. **Get your Project ID:**
   - Go to: https://cloud.mongodb.com/v2
   - Click on your project
   - The Project ID is in the URL (e.g., `https://cloud.mongodb.com/v2#/org/.../projects/1234567890abcdef`)
   - Or go to Project Settings → the ID is shown there

3. **Run the script:**
   ```bash
   cd backend
   node whitelist-ip-atlas.js <PUBLIC_KEY> <PRIVATE_KEY> <PROJECT_ID>
   ```

   Or set environment variables in your `.env`:
   ```env
   MONGODB_ATLAS_PUBLIC_KEY=your_public_key
   MONGODB_ATLAS_PRIVATE_KEY=your_private_key
   MONGODB_ATLAS_PROJECT_ID=your_project_id
   ```
   Then run:
   ```bash
   node whitelist-ip-atlas.js
   ```

4. **Test the connection:**
   ```bash
   node test-mongodb.js
   ```

### Option 2: Whitelist Your IP Manually in MongoDB Atlas (Recommended)

1. **Log in to MongoDB Atlas:**
   - Go to https://cloud.mongodb.com/
   - Sign in to your account

2. **Navigate to Network Access:**
   - Click on your cluster (e.g., `Cluster0`)
   - Go to **"Network Access"** in the left sidebar
   - Or go directly: https://cloud.mongodb.com/v2#/security/network/whitelist

3. **Add Your IP Address:**
   - Click **"Add IP Address"** button
   - Click **"Add Current IP Address"** (this will add `208.103.51.3`)
   - Or manually enter: `208.103.51.3`
   - Click **"Confirm"**

4. **For Development (Allow All IPs - Easiest):**
   - If you want to allow access from any IP (for development only):
   - Click **"Add IP Address"**
   - Click **"Allow Access from Anywhere"** button (this adds `0.0.0.0/0`)
   - Click **"Confirm"**
   - ⚠️ **Warning:** Only use this for development, not production!
   - ✅ **This is the easiest option** - no need to whitelist individual IPs!

5. **Wait for Changes:**
   - It may take 1-2 minutes for the changes to take effect

6. **Test the Connection:**
   ```bash
   cd backend
   node test-mongodb.js
   ```

### Option 2: Use Local MongoDB (Alternative)

If you prefer to use a local MongoDB instance instead of Atlas:

1. **Install MongoDB locally:**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo`

2. **Update your `.env` file:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/shotonme
   ```

3. **Test the connection:**
   ```bash
   cd backend
   node test-mongodb.js
   ```

## Test Connection

After whitelisting your IP, test the connection:

```bash
cd backend
node test-mongodb.js
```

You should see:
```
✅ MongoDB Connected Successfully!
📊 Database: shotonme
🌐 Host: ...
✅ Database ping successful!
```

## Troubleshooting

### Error: "Could not connect to any servers"
- **Cause:** IP not whitelisted or MongoDB not running
- **Fix:** Add your IP to Atlas Network Access whitelist

### Error: "Authentication failed"
- **Cause:** Wrong username/password in connection string
- **Fix:** Check your `.env` file for correct `MONGODB_URI`

### Error: "ECONNREFUSED" (local MongoDB)
- **Cause:** MongoDB service not running
- **Fix:** Start MongoDB service or Docker container

## Quick Commands

```bash
# Test MongoDB connection
cd backend
node test-mongodb.js

# Start backend server (will also test connection)
cd backend
npm start
```

