# 🔧 Mobile Backend Connection Fix

## ✅ Good News:
- ✅ **Render PORT**: Fixed to 5000 ✅
- ✅ **Code Configuration**: Correctly uses `https://api.shotonme.com/api`
- ✅ **CORS**: Configured to allow `www.shotonme.com`

## ⚠️ Issue: Mobile Says Backend Not Running

### Most Likely Causes:

1. **Render Service is "Sleeping"** (Free Tier)
   - Free tier services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up

2. **Custom Domain Not Configured**
   - `api.shotonme.com` might not be pointing to Render
   - Need to use Render's direct URL instead

3. **DNS Not Propagated**
   - If `api.shotonme.com` was recently added, DNS might not be ready

---

## 🔍 Quick Diagnostic:

### Step 1: Check Render Service Status
1. Go to: https://dashboard.render.com
2. Click your service: `shot-on-me`
3. **Check Status:**
   - ✅ "Live" = Service is running
   - ⚠️ "Sleeping" = Service is asleep (needs to wake up)

### Step 2: Test Backend Directly
On your mobile device, try opening:
- `https://shot-on-me.onrender.com/api/health`
- OR: `https://api.shotonme.com/api/health`

**Expected:** Should return `{"status":"ok"}` or similar

**If it works:** Backend is running, just need to fix URL in code
**If it doesn't work:** Service might be sleeping or not deployed

---

## 🔧 Quick Fixes:

### Fix 1: Wake Up Render Service
If service is "Sleeping":
1. Go to Render Dashboard
2. Click your service
3. Click "Manual Deploy" or wait for first request (takes 30-60 seconds)

### Fix 2: Use Render URL Directly (If Custom Domain Not Working)
If `api.shotonme.com` isn't working, we can update code to use Render URL directly.

### Fix 3: Check Custom Domain in Render
1. Go to Render Dashboard → Your Service → Settings → Custom Domains
2. Verify `api.shotonme.com` is added
3. If not, add it and wait for DNS propagation

---

## 🚀 Immediate Action:

**Try this on your mobile device:**
1. Open: `https://shot-on-me.onrender.com/api/health`
2. Does it work? If yes, backend is running but URL config needs fix
3. Does it not work? Service might be sleeping

**Then check Render dashboard:**
- Is service status "Live" or "Sleeping"?
- If "Sleeping", click "Manual Deploy"

---

## 📋 What I Need From You:

1. **What's the exact error message** on mobile?
2. **What URL is the mobile app trying to use?** (check browser console if possible)
3. **What's the Render service status?** (Live or Sleeping?)
4. **Does `https://shot-on-me.onrender.com/api/health` work** on mobile?

With this info, I can provide the exact fix!

