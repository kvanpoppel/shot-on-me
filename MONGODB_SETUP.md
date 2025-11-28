# MongoDB Setup Guide

Two options for setting up MongoDB:

## Option 1: MongoDB Atlas (Cloud - Recommended) ⭐

**Best for:** Quick setup, no local installation needed

### Steps:

1. **Sign up for MongoDB Atlas**
   - Go to https://www.mongodb.com/cloud/atlas
   - Click "Try Free" and create an account
   - Free tier includes 512MB storage

2. **Create a Cluster**
   - Choose "Free" tier (M0)
   - Select a cloud provider and region
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Set up Database Access**
   - Go to "Database Access" in left menu
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set user privileges to "Atlas Admin"
   - Click "Add User"

4. **Set up Network Access**
   - Go to "Network Access" in left menu
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's IP address only
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Clusters" in left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `shotonme`

6. **Update backend/.env**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority
   ```

**Pros:**
- ✅ No local installation
- ✅ Free tier available
- ✅ Automatic backups
- ✅ Works from anywhere
- ✅ Easy to scale

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ Free tier has limitations

---

## Option 2: Local MongoDB

**Best for:** Offline development, full control

### Windows Installation:

1. **Download MongoDB**
   - Go to https://www.mongodb.com/try/download/community
   - Select Windows, MSI package
   - Download and run installer

2. **Installation Options**
   - Choose "Complete" installation
   - Install as Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)

3. **Verify Installation**
   ```powershell
   # Check if MongoDB service is running
   Get-Service MongoDB
   
   # Start MongoDB if not running
   Start-Service MongoDB
   ```

4. **Update backend/.env**
   ```env
   MONGODB_URI=mongodb://localhost:27017/shotonme
   ```

5. **Test Connection**
   ```powershell
   # Open MongoDB shell
   mongosh
   
   # Or use MongoDB Compass GUI
   # Connect to: mongodb://localhost:27017
   ```

**Pros:**
- ✅ Works offline
- ✅ No internet required
- ✅ Full control
- ✅ No usage limits

**Cons:**
- ⚠️ Requires installation
- ⚠️ Need to manage backups
- ⚠️ Only works on one machine

---

## Quick Test

After setup, test your connection:

```powershell
cd backend
npm run dev
```

Look for: `✅ Connected to MongoDB`

If you see: `❌ MongoDB connection error`
- Check your connection string
- Verify MongoDB is running (local) or accessible (Atlas)
- Check network access (Atlas)
- Verify username/password (Atlas)

---

## MongoDB Compass (GUI Tool)

**Recommended for beginners!**

1. Download: https://www.mongodb.com/try/download/compass
2. Connect using your connection string
3. Browse your database visually
4. See all collections, documents, and data

---

## Which Should You Choose?

- **Just starting?** → MongoDB Atlas (easier)
- **Need offline access?** → Local MongoDB
- **Production deployment?** → MongoDB Atlas
- **Learning/experimenting?** → Either works!

---

## Troubleshooting

**"Authentication failed"**
- Check username/password in connection string
- Verify database user exists in Atlas

**"Connection timeout"**
- Check network access in Atlas
- Verify IP is whitelisted
- Check firewall settings

**"Cannot connect to localhost"**
- Make sure MongoDB service is running
- Check port 27017 is not blocked
- Verify MongoDB is installed correctly


