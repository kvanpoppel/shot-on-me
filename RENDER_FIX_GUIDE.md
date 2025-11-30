# 🔧 Render Backend 503 Error - Fix Guide

## Problem
The backend API on Render is returning **503 Service Unavailable** errors, preventing the frontend from authenticating users.

## Quick Fixes

### 1. Check Render Service Status
1. Go to https://dashboard.render.com
2. Find your backend service (`shot-on-me` or similar)
3. Check the **Status** - it should be "Live"
4. If it's "Sleeping" (free tier), click **Manual Deploy** → **Deploy latest commit**

### 2. Check Render Logs
1. In Render dashboard, click on your backend service
2. Go to **Logs** tab
3. Look for errors like:
   - MongoDB connection failures
   - Missing environment variables
   - Port binding errors
   - Module not found errors

### 3. Verify Environment Variables
In Render dashboard → Your service → **Environment** tab, ensure these are set:

**Required:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - A random secret string (32+ characters)
- `NODE_ENV` - Set to `production`
- `PORT` - Render sets this automatically, but verify it exists

**Optional but recommended:**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### 4. Test Health Endpoint
After deploying, test the health check:
```bash
curl https://shot-on-me.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "mongodb": "connected"
}
```

### 5. Common Issues & Solutions

#### Issue: Service keeps crashing
**Solution:** Check logs for:
- MongoDB connection timeout → Verify `MONGODB_URI` is correct
- Missing module → Run `npm install` in Render build
- Port binding error → Render sets PORT automatically, don't override

#### Issue: Service is sleeping (free tier)
**Solution:** 
- Upgrade to paid plan, OR
- Use a service like UptimeRobot to ping your service every 5 minutes
- Set up a cron job to keep it awake

#### Issue: MongoDB connection fails
**Solution:**
1. Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` (all IPs)
2. Check MongoDB connection string format
3. Verify database user has correct permissions

#### Issue: Build fails
**Solution:**
1. Check **Build Command** in Render settings:
   - Should be: `cd backend && npm install`
2. Check **Start Command**:
   - Should be: `cd backend && npm start`
3. Verify `package.json` has correct `start` script

### 6. Manual Restart
1. In Render dashboard → Your service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for build to complete
4. Check logs for startup messages

### 7. Verify Service is Running
Test the login endpoint:
```bash
curl -X POST https://shot-on-me.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

## Next Steps After Fix

1. ✅ Verify health endpoint responds
2. ✅ Test login endpoint
3. ✅ Check frontend can connect
4. ✅ Monitor logs for 24 hours
5. ✅ Set up uptime monitoring (if on free tier)

## Need More Help?

Check Render logs for specific error messages and share them for targeted troubleshooting.

