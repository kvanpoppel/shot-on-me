# 🔍 Backend Connectivity Investigation Report

## 📋 Issues Identified:

### ✅ **Issue #1: Hardcoded URLs in invite.ts** - FIXED
**Location:** `shot-on-me/app/utils/invite.ts` (lines 141, 149)
**Problem:** Still using `https://api.shotonme.com/api` (custom domain not configured)
**Fix Applied:** Changed to `https://shot-on-me.onrender.com/api`

### ✅ **Issue #2: Vercel Environment Variable Priority**
**Status:** Environment variable `NEXT_PUBLIC_API_URL` is set correctly in Vercel
**Current Value:** `https://api.shotonme.com/api` (needs verification)
**Action:** Should be `https://shot-on-me.onrender.com/api` OR keep as is if custom domain works

### ⚠️ **Issue #3: Render Service Sleeping (Free Tier)**
**Problem:** Free tier services sleep after 15 minutes of inactivity
**Impact:** First request takes 30-60 seconds to wake up service
**Solution Options:**
1. Upgrade Render plan (paid plans don't sleep)
2. Implement keep-alive ping every 10 minutes
3. Accept the delay (normal for free tier)

### ✅ **Issue #4: CORS Configuration**
**Status:** ✅ Correctly configured
- Includes `https://www.shotonme.com`
- Includes `https://shot-on-me.onrender.com`
- Includes localhost for development

---

## 🔧 Fixes Applied:

### 1. Fixed invite.ts URLs
- Changed from `api.shotonme.com` to `shot-on-me.onrender.com`
- Ensures invite email functionality works

### 2. Verified API URL Detection Logic
- ✅ Main `api.ts` uses Render URL correctly
- ✅ Socket URL uses Render URL correctly
- ✅ CORS includes Render URL

---

## 📊 Current Configuration Status:

### Frontend (Vercel):
- ✅ **API URL Detection**: Uses `getApiUrl()` function
- ✅ **Environment Variable**: `NEXT_PUBLIC_API_URL` set in Vercel
- ⚠️ **Value**: Need to verify if it's `api.shotonme.com` or `shot-on-me.onrender.com`

### Backend (Render):
- ✅ **PORT**: Set to 5000 ✅
- ✅ **CORS**: Configured correctly
- ✅ **MongoDB**: Connected
- ⚠️ **Service Status**: May be sleeping (free tier)

---

## 🚀 Recommended Actions:

### Immediate (Critical):
1. ✅ **Fix invite.ts** - DONE
2. ⚠️ **Verify Vercel Environment Variable**:
   - Check if `NEXT_PUBLIC_API_URL` is set to `https://shot-on-me.onrender.com/api`
   - If it's `api.shotonme.com`, either:
     - Change to Render URL, OR
     - Configure custom domain in Render

### Short-term:
3. **Test Backend Directly**:
   - Try: `https://shot-on-me.onrender.com/api/health`
   - Should return: `{"status":"ok"}` or similar
   - If it works, backend is running (may take 30-60 seconds first time)

4. **Check Render Service Status**:
   - Go to Render Dashboard
   - Check if service is "Live" or "Sleeping"
   - If sleeping, first request will wake it up

### Long-term:
5. **Consider Upgrading Render Plan**:
   - Paid plans don't sleep
   - Instant responses
   - Better for production

6. **Implement Keep-Alive** (if staying on free tier):
   - Ping service every 10 minutes
   - Prevents sleeping

---

## 🔍 Diagnostic Steps:

### Step 1: Test Backend Health
```bash
curl https://shot-on-me.onrender.com/api/health
```
**Expected:** `{"status":"ok"}` or similar
**If fails:** Service might be sleeping or not deployed

### Step 2: Check Vercel Environment Variables
1. Go to: https://vercel.com/dashboard
2. Your Project → Settings → Environment Variables
3. Check `NEXT_PUBLIC_API_URL` value
4. Should be: `https://shot-on-me.onrender.com/api`

### Step 3: Check Render Service
1. Go to: https://dashboard.render.com
2. Check service status: "Live" or "Sleeping"
3. Check recent deployments
4. Check logs for errors

### Step 4: Test on Mobile
1. Open browser console (if possible)
2. Check network requests
3. Look for failed API calls
4. Check what URL is being used

---

## ✅ Summary of Fixes:

1. ✅ **Fixed invite.ts** - Changed to Render URL
2. ✅ **Verified main API URL logic** - Uses Render URL correctly
3. ✅ **Verified CORS** - Includes all necessary origins
4. ⚠️ **Need to verify** - Vercel environment variable value

---

## 🎯 Next Steps:

1. **Commit and deploy the invite.ts fix**
2. **Verify Vercel environment variable** is set correctly
3. **Test backend health endpoint** directly
4. **Check Render service status**
5. **Test on mobile** after deployment

---

## 📝 Questions to Answer:

1. What is the exact error message on mobile?
2. What URL is the mobile app trying to connect to? (check browser console)
3. What is the Render service status? (Live or Sleeping?)
4. Does `https://shot-on-me.onrender.com/api/health` work when tested directly?

With these answers, I can provide more specific fixes!

