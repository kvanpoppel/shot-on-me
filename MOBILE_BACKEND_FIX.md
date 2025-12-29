# 🔧 Mobile Device Backend Connection Fix

## ⚠️ Issue: Mobile Device Says Backend Not Running

### Possible Causes:

1. **Backend URL Configuration**
   - Mobile app might be trying wrong URL
   - Production domain detection not working

2. **Render Service Status**
   - Service might be "Sleeping" (free tier)
   - Service might not be running

3. **CORS Issues**
   - Backend not allowing requests from www.shotonme.com

4. **API URL Detection**
   - Code might be detecting wrong environment

---

## ✅ What We Know:

- ✅ **Vercel**: Deployed successfully
- ✅ **Render PORT**: Fixed to 5000 ✅
- ✅ **Environment Variables**: All set correctly
- ⚠️ **Mobile**: Can't connect to backend

---

## 🔍 Diagnostic Steps:

### Step 1: Check Render Service Status
1. Go to: https://dashboard.render.com
2. Check your service: `shot-on-me`
3. **Status should be "Live"** (not "Sleeping")
4. If "Sleeping", click "Manual Deploy" to wake it up

### Step 2: Test Backend Directly
Try these URLs in your mobile browser:
- `https://api.shotonme.com/api/health`
- `https://shot-on-me.onrender.com/api/health`

**Expected:** Should return `{"status":"ok"}` or similar

### Step 3: Check What URL Mobile is Using
Open browser console on mobile (if possible) and check:
- What API URL is being used?
- Any CORS errors?
- Network request failures?

---

## 🔧 Quick Fixes:

### Fix 1: Wake Up Render Service (If Sleeping)
1. Go to Render Dashboard
2. Click your service
3. If status is "Sleeping", click "Manual Deploy"
4. Wait for it to become "Live"

### Fix 2: Verify Backend URL in Code
The code should detect `www.shotonme.com` and use `https://api.shotonme.com/api`

### Fix 3: Check CORS Settings
Backend should allow:
- `https://www.shotonme.com`
- `https://shotonme.com`

---

## 🚀 Next Steps:

1. **Check Render service status** (is it "Live"?)
2. **Test backend URL directly** on mobile
3. **Check browser console** for errors
4. **Verify API URL** the app is trying to use

Let me know what you find!

