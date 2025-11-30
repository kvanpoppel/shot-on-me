# 🔍 MongoDB Setup Verification Guide

## Step 1: Verify Render Environment Variables

### Check in Render Dashboard:

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Log in to your account

2. **Find Your Backend Service:**
   - Look for service named: `shot-on-me-backend` or similar
   - Click on it

3. **Check Environment Variables:**
   - Click **"Environment"** tab (left sidebar)
   - Look for `MONGODB_URI` in the list
   - **Expected value:**
     ```
     mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority
     ```

4. **If MONGODB_URI is Missing:**
   - Click **"Add Environment Variable"**
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority`
   - Click **"Save Changes"**
   - **Redeploy** the service (Render will auto-redeploy)

---

## Step 2: Check Render Logs

1. **In Render Dashboard:**
   - Go to your backend service
   - Click **"Logs"** tab
   - Look for these messages:

   **✅ Good Signs:**
   ```
   🔄 Connecting to MongoDB...
   ✅ Connected to MongoDB
   📊 Database: shotonme
   🌐 Host: cluster0-shard-00-00.uoylpxu.mongodb.net
   ```

   **❌ Error Signs:**
   ```
   ❌ MongoDB connection error: ...
   💡 Make sure your IP is whitelisted in MongoDB Atlas
   💡 Check your MONGODB_URI in .env file
   ```

2. **If You See Errors:**
   - Copy the exact error message
   - Check the troubleshooting section below

---

## Step 3: Test API Health Endpoint

### Test from Browser or Terminal:

**URL:** `https://shot-on-me.onrender.com/api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-XX...",
  "database": "Connected",
  "mongodb": {
    "readyState": 1,
    "host": "cluster0-shard-00-00.uoylpxu.mongodb.net",
    "name": "shotonme"
  }
}
```

**If Database Shows "Disconnected":**
- MongoDB connection is not working
- Check Render environment variables
- Check MongoDB Atlas network access

---

## Step 4: Verify MongoDB Atlas Network Access

1. **Go to MongoDB Atlas:**
   - Visit: https://cloud.mongodb.com
   - Log in to your account

2. **Check Network Access:**
   - Click **"Network Access"** in left menu
   - Look for IP addresses listed

3. **For Render (Production):**
   - **Option A (Easiest):** Add `0.0.0.0/0` (Allow from anywhere)
     - ⚠️ Less secure, but works for all servers
   - **Option B (More Secure):** Add Render's IP ranges
     - Render IPs change, so this requires updates

4. **Verify Database User:**
   - Click **"Database Access"** in left menu
   - Confirm user `katevanpoppel_db_user` exists
   - Verify password is correct

---

## Step 5: Test Local Connection (Optional)

If you want to test MongoDB connection locally:

1. **Check Local .env File:**
   ```powershell
   cd backend
   Get-Content .env | Select-String "MONGODB_URI"
   ```

2. **Start Backend:**
   ```powershell
   npm run dev
   ```

3. **Look for Connection Message:**
   ```
   ✅ Connected to MongoDB
   ```

---

## 🆘 Troubleshooting

### Error: "Authentication failed"
- **Cause:** Wrong username or password
- **Fix:** 
  1. Go to MongoDB Atlas → Database Access
  2. Reset password for `katevanpoppel_db_user`
  3. Update `MONGODB_URI` in Render with new password

### Error: "Connection timeout"
- **Cause:** IP not whitelisted in MongoDB Atlas
- **Fix:**
  1. Go to MongoDB Atlas → Network Access
  2. Click "Add IP Address"
  3. Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
  4. Wait 1-2 minutes for changes to propagate

### Error: "getaddrinfo ENOTFOUND"
- **Cause:** Invalid connection string format
- **Fix:**
  - Verify connection string format:
  ```
  mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
  ```
  - Make sure no spaces or extra characters
  - Password should be URL-encoded if it has special characters

### Error: "MongoServerError: bad auth"
- **Cause:** Database user doesn't have correct permissions
- **Fix:**
  1. Go to MongoDB Atlas → Database Access
  2. Edit user `katevanpoppel_db_user`
  3. Set privileges to "Atlas Admin" or "Read and write to any database"

---

## ✅ Quick Checklist

- [ ] `MONGODB_URI` is set in Render environment variables
- [ ] Connection string format is correct
- [ ] MongoDB Atlas network access allows connections (0.0.0.0/0 or Render IPs)
- [ ] Database user `katevanpoppel_db_user` exists and has correct password
- [ ] Render logs show "✅ Connected to MongoDB"
- [ ] API health endpoint shows `"database": "Connected"`
- [ ] Can access database collections (if testing locally with MongoDB Compass)

---

## 📞 Next Steps

Once MongoDB is verified:
1. ✅ Test user registration/login
2. ✅ Test creating posts/feed items
3. ✅ Test payment/wallet functionality
4. ✅ Monitor Render logs for any connection issues

---

**Last Updated:** December 2024

