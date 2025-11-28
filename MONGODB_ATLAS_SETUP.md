# 🗄️ MongoDB Atlas Setup - Step by Step Guide

Follow these steps to set up MongoDB Atlas (cloud database) - it's free and takes about 10 minutes!

## Step 1: Sign Up / Log In

1. Go to: https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"** (if new) or **"Sign In"** (if you have an account)
3. Create an account or log in

## Step 2: Create a Free Cluster

1. After logging in, you'll see the **Atlas Dashboard**
2. Click **"Build a Database"** or **"Create"** button
3. Choose the **FREE** tier (M0 Sandbox)
4. **Cloud Provider:** Choose AWS (recommended) or any provider
5. **Region:** Choose closest to you (e.g., `US East (N. Virginia)`)
6. **Cluster Name:** Keep default `Cluster0` or change it
7. Click **"Create Cluster"**
8. ⏳ Wait 3-5 minutes for cluster to be created

## Step 3: Create Database User

1. After cluster is created, you'll see **"Database Access"** section
2. Click **"Create Database User"** button
   - Or go to: Left menu → **"Database Access"**
3. **Authentication Method:** Select **"Password"**
4. **Username:** Create a username (e.g., `shotonme_admin`)
5. **Password:** 
   - Click **"Autogenerate Secure Password"** OR
   - Create your own strong password (save it somewhere!)
6. **User Privileges:** Select **"Atlas Admin"**
7. Click **"Add User"**

**⚠️ IMPORTANT:** Save your username and password! You'll need them for the connection string.

## Step 4: Set Network Access (Allow Your IP)

1. Click **"Network Access"** in the left menu
2. Click **"Add IP Address"** button
3. For **development/testing:**
   - Click **"Allow Access from Anywhere"** 
   - This adds `0.0.0.0/0` (allows all IPs)
   - ⚠️ For production, only add your server's IP
4. Click **"Confirm"**

**Note:** If you clicked "Allow Access from Anywhere", you're done with this step. Otherwise, click "Add IP Address" and add your current IP.

## Step 5: Get Your Connection String

1. Go to **"Database"** in the left menu (or click on your cluster)
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver:** Select **"Node.js"**
5. **Version:** Select **"5.5 or later"**
6. You'll see a connection string that looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Copy this connection string**

## Step 6: Customize Connection String

Take your connection string and replace:

1. `<username>` → Your database username (from Step 3)
2. `<password>` → Your database password (from Step 3)
3. Add database name: After `mongodb.net/` add `shotonme?` 

**Final format should look like:**
```
mongodb+srv://shotonme_admin:YourPassword123@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority
```

**Example:**
```
mongodb+srv://shotonme_admin:MySecurePass123@cluster0.abc123.mongodb.net/shotonme?retryWrites=true&w=majority
```

## Step 7: Update Your .env File

1. Open `backend/.env` file
2. Find the line: `MONGODB_URI=mongodb://localhost:27017/shotonme`
3. Replace it with your connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority
   ```
4. Save the file

## ✅ Verify It Works

1. Start your backend:
   ```powershell
   cd backend
   npm run dev
   ```

2. Look for this message:
   ```
   ✅ Connected to MongoDB
   ```

3. If you see an error, check:
   - Username and password are correct (no spaces)
   - Database name is `shotonme`
   - Network access allows your IP
   - Connection string format is correct

## 🎉 Done!

Your MongoDB is now set up and ready to use!

**Free Tier Includes:**
- ✅ 512MB storage
- ✅ Shared RAM and vCPU
- ✅ Automatic backups
- ✅ Free forever (with some limitations)

## 🔒 Security Tips

1. **For Production:** Only allow specific IPs, not `0.0.0.0/0`
2. **Use Strong Passwords:** Generate secure passwords
3. **Don't Commit .env:** Never commit your `.env` file to Git
4. **Rotate Passwords:** Change passwords periodically

## 🆘 Troubleshooting

**"Authentication failed"**
- Check username/password are correct
- No special characters need encoding (except @ becomes %40)

**"Connection timeout"**
- Make sure Network Access includes your IP
- Check firewall settings

**"Invalid connection string"**
- Make sure database name is included: `/shotonme?`
- Check for typos in username/password
- Remove any extra spaces

## 📝 Quick Checklist

- [ ] Created MongoDB Atlas account
- [ ] Created free cluster
- [ ] Created database user (saved credentials)
- [ ] Set network access (Allow from anywhere for dev)
- [ ] Got connection string
- [ ] Updated `backend/.env` with connection string
- [ ] Tested connection (saw "✅ Connected to MongoDB")

You're all set! 🚀

