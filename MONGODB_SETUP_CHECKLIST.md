# ✅ MongoDB Atlas Setup - Your Checklist

Follow these steps and check them off as you go!

## Step 1: Sign Up / Log In
- [ ] Go to: https://www.mongodb.com/cloud/atlas
- [ ] Click "Try Free" (new account) or "Sign In" (existing)
- [ ] Create account or log in

## Step 2: Create Free Cluster
- [ ] Click "Build a Database" or "Create" button
- [ ] Choose **FREE** tier (M0 Sandbox)
- [ ] Cloud Provider: Choose AWS or any provider
- [ ] Region: Choose closest to you (e.g., US East)
- [ ] Cluster Name: Keep default or change
- [ ] Click "Create Cluster"
- [ ] ⏳ Wait 3-5 minutes (cluster is being created)

## Step 3: Create Database User
- [ ] Click "Create Database User" or go to "Database Access"
- [ ] Authentication Method: Select "Password"
- [ ] Username: Create one (e.g., `shotonme_admin`)
- [ ] Password: Click "Autogenerate Secure Password" OR create your own
- [ ] **⚠️ SAVE THE USERNAME AND PASSWORD!** (You'll need them!)
- [ ] User Privileges: Select "Atlas Admin"
- [ ] Click "Add User"

## Step 4: Set Network Access
- [ ] Go to "Network Access" in left menu
- [ ] Click "Add IP Address"
- [ ] Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
  - ⚠️ This is for development only. For production, use specific IPs.
- [ ] Click "Confirm"

## Step 5: Get Connection String
- [ ] Go to "Database" in left menu (or click your cluster)
- [ ] Click "Connect" button
- [ ] Choose "Connect your application"
- [ ] Driver: Select "Node.js"
- [ ] Version: Select "5.5 or later"
- [ ] **Copy the connection string** (it looks like: `mongodb+srv://<username>:<password>@cluster0...`)

## Step 6: Customize Connection String
- [ ] Replace `<username>` with your database username (from Step 3)
- [ ] Replace `<password>` with your database password (from Step 3)
- [ ] After `mongodb.net/` add `shotonme?`
- [ ] Final format: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority`

## Step 7: Update Your .env File
- [ ] Open `backend/.env` file
- [ ] Find: `MONGODB_URI=mongodb://localhost:27017/shotonme`
- [ ] Replace with your MongoDB Atlas connection string
- [ ] Save the file

## Step 8: Test Connection
- [ ] Open terminal in `backend` folder
- [ ] Run: `npm run dev`
- [ ] Look for: `✅ Connected to MongoDB`
- [ ] If error, check username/password and connection string format

## 🎉 Done!

If you see `✅ Connected to MongoDB`, you're all set!

---

## 📝 Your MongoDB Info (Fill this in as you go)

**Connection String:**
```
mongodb+srv://[username]:[password]@[cluster].mongodb.net/shotonme?retryWrites=true&w=majority
```

**Username:** _______________________

**Password:** _______________________

**Database Name:** `shotonme`

---

## 💬 Need Help?

If you get stuck at any step, just tell me:
- "I'm at Step X and..." → I'll help you with that specific step
- "I got my connection string: mongodb+srv://..." → I'll help you format it correctly
- "I see an error: ..." → I'll help troubleshoot

Ready to start? Let me know when you've completed a step or if you need help! 🚀

