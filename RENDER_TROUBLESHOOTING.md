# 🔧 Render Troubleshooting Guide

**Fixing "Internal server error" when loading logs**

---

## 🚨 ISSUE: "Something went wrong while loading your logs - Internal server error"

This is a **Render platform issue**, not necessarily a problem with your deployment. Here's how to troubleshoot:

---

## ✅ QUICK FIXES

### Fix 1: Refresh and Retry
1. **Hard refresh the page:**
   - Windows: `Ctrl + F5`
   - Or: Clear browser cache
2. **Wait 30 seconds** and try again
3. **Try a different browser** (Chrome, Firefox, Edge)

### Fix 2: Check Service Status
1. Go to Render Dashboard
2. Look at your service status:
   - **Green dot** = Service is running (good!)
   - **Red dot** = Service is down (problem)
   - **Yellow dot** = Deploying (wait)

### Fix 3: Check Deployment Status
1. Go to your service in Render
2. Click **"Events"** tab (instead of Logs)
3. This shows deployment history and status
4. Look for recent deployments and their status

### Fix 4: Use Alternative Methods

**Method A: Check via API Endpoint**
- Visit your backend URL directly: `https://shot-on-me-backend.onrender.com/api/venues`
- If it responds (even with an error), service is running
- If 404 or connection refused, service might be down

**Method B: Check Service Metrics**
1. Render Dashboard → Your service
2. Click **"Metrics"** tab
3. Check:
   - CPU usage
   - Memory usage
   - Request count
   - If metrics show activity, service is running

**Method C: Test from Frontend**
1. Deploy frontend to Vercel
2. Try to make API calls
3. Check browser console (F12) → Network tab
4. See if API calls succeed or fail

---

## 🔍 DIAGNOSIS STEPS

### Step 1: Is Your Service Actually Running?

**Check Service Status:**
1. Render Dashboard → Your service
2. Look at the status indicator:
   - ✅ **Green** = Running
   - ❌ **Red** = Stopped/Crashed
   - 🟡 **Yellow** = Deploying

**If Red (Stopped):**
- Service crashed or failed to start
- Need to check why (see below)

**If Green (Running):**
- Service is working
- Logs error is just a Render UI issue
- Your service is fine!

### Step 2: Test Backend Directly

**Test API Endpoint:**
```
Visit: https://shot-on-me-backend.onrender.com/api/venues
```

**Expected Responses:**
- ✅ **200 OK with JSON** = Working perfectly
- ✅ **401/403 Error** = Working, just needs auth (normal)
- ✅ **500 Error** = Working, but has an error (check response)
- ❌ **404 Not Found** = Route not found (check server.js)
- ❌ **Connection Refused** = Service not running
- ❌ **Timeout** = Service sleeping (free tier)

### Step 3: Check Deployment History

1. Render Dashboard → Your service
2. Click **"Events"** tab
3. Look at recent deployments:
   - ✅ **Succeeded** = Deployment worked
   - ❌ **Failed** = Build or start failed
   - 🟡 **In Progress** = Still deploying

**If deployment failed:**
- Check the error message in Events
- Common issues:
  - Build command failed
  - Missing environment variables
  - MongoDB connection failed
  - Port conflict

---

## 🛠️ COMMON ISSUES & FIXES

### Issue 1: Service is "Sleeping" (Free Tier)

**Symptom:**
- First request takes 30-60 seconds
- Service appears stopped
- Logs show "Service is sleeping"

**Fix:**
- This is normal for Render free tier
- Service wakes up on first request
- Consider upgrading to paid tier for always-on

### Issue 2: Service Crashed on Startup

**Symptom:**
- Red status indicator
- Events show "Failed" deployment

**Common Causes:**
1. **Missing Environment Variables:**
   - Check all required vars are set
   - MONGODB_URI, JWT_SECRET, etc.

2. **MongoDB Connection Failed:**
   - Verify MONGODB_URI is correct
   - Check MongoDB Atlas network access
   - Ensure database user has permissions

3. **Port Conflict:**
   - Ensure PORT=5000 in environment
   - Check server.js uses process.env.PORT

4. **Build Failed:**
   - Check package.json
   - Verify all dependencies listed
   - Check Node version (should be 18+)

**Fix:**
- Check Events tab for specific error
- Fix the issue
- Redeploy manually

### Issue 3: Logs UI Error (But Service Works)

**Symptom:**
- Service shows green (running)
- API endpoints work
- But can't view logs

**Fix:**
- This is a Render platform bug
- Your service is fine
- Use alternative methods (see below)

---

## 🔄 ALTERNATIVE WAYS TO CHECK LOGS

### Method 1: Render CLI (If Available)

```bash
# Install Render CLI (if you have it)
render logs --service shot-on-me-backend
```

### Method 2: Check via API Response

**Add a health endpoint to see status:**

In `backend/server.js`, add:
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

Then visit: `https://shot-on-me-backend.onrender.com/health`

### Method 3: Check Deployment Events

1. Render Dashboard → Service → **"Events"**
2. Click on a deployment
3. View deployment logs (different from runtime logs)
4. This shows build and startup messages

### Method 4: Test from Frontend

1. Deploy frontend to Vercel
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Look for API errors
5. Go to **Network** tab
6. See actual API requests and responses

---

## 🚀 QUICK DIAGNOSIS CHECKLIST

Run through this to diagnose:

- [ ] **Service Status:** Green, Red, or Yellow?
- [ ] **Test API:** Visit `https://shot-on-me-backend.onrender.com/api/venues`
- [ ] **Check Events:** Look at deployment history
- [ ] **Check Metrics:** See if service is receiving requests
- [ ] **Browser Test:** Try accessing from frontend

---

## ✅ IF SERVICE IS RUNNING (Green Status)

**Your service is fine!** The logs error is just a Render UI bug.

**What to do:**
1. ✅ Service is working (green status)
2. ✅ API endpoints respond
3. ✅ Continue with deployment
4. ✅ Use Events tab to see deployment logs
5. ✅ Use Metrics tab to monitor

**You can proceed with frontend deployment!**

---

## ❌ IF SERVICE IS DOWN (Red Status)

**Service needs fixing.**

**Steps:**
1. Check **Events** tab for error message
2. Common issues:
   - Missing environment variables
   - MongoDB connection failed
   - Build failed
   - Port conflict
3. Fix the issue
4. Redeploy manually

---

## 🔄 MANUAL REDEPLOY

If you need to redeploy:

1. **Render Dashboard** → Your service
2. Click **"Manual Deploy"**
3. Select **"Deploy latest commit"**
4. Wait for deployment
5. Check Events tab for status

---

## 📞 RENDER SUPPORT

If issue persists:

1. **Render Status Page:** https://status.render.com
2. **Render Support:** support@render.com
3. **Render Docs:** https://render.com/docs
4. **Render Community:** https://community.render.com

---

## 🎯 NEXT STEPS

**If service is running (green):**
- ✅ Proceed with Vercel frontend deployment
- ✅ Update FRONTEND_URL in Render
- ✅ Test the full application

**If service is down (red):**
- ❌ Check Events tab for error
- ❌ Fix the issue
- ❌ Redeploy
- ❌ Then proceed with frontend

---

**The logs UI error is often just a Render platform issue. If your service shows green status and API endpoints work, you're good to go!**

---

*Last Updated: 2024*

