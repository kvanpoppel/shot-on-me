# 🔴 CRITICAL: Vercel Environment Variables - MUST CONFIGURE NOW

## ⚠️ IMMEDIATE ACTION REQUIRED

Your Vercel deployment is failing because `NEXT_PUBLIC_API_URL` is **NOT SET** in Vercel environment variables!

## 🚨 Current Error

```
Connection timeout. The backend server may not be running or is not responding.
Login error: Cannot connect to server
```

**Root Cause:** Frontend deployed on Vercel doesn't know where the backend API is located.

---

## ✅ REQUIRED VERCEL ENVIRONMENT VARIABLES

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Add These Environment Variables:

1. **NEXT_PUBLIC_API_URL** (CRITICAL - REQUIRED)
   ```
   https://shot-on-me.onrender.com/api
   ```
   - **Apply to:** Production, Preview, Development (all environments)
   - **Why:** This tells your frontend where the Render backend API is located

2. **NEXT_PUBLIC_SOCKET_URL** (Optional but recommended)
   ```
   https://shot-on-me.onrender.com
   ```
   - **Apply to:** Production, Preview, Development
   - **Why:** For Socket.io WebSocket connections (real-time features)

3. **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** (Already configured - verify it exists)
   ```
   AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
   ```
   - **Apply to:** Production, Preview, Development
   - **Why:** Required for Google Maps to work

---

## 📋 Step-by-Step Instructions

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Log in to your account
3. Find your project: `shot-on-me-venue-portal` (or your project name)
4. Click on the project

### Step 2: Open Environment Variables
1. Click **"Settings"** tab at the top
2. Click **"Environment Variables"** in the left sidebar

### Step 3: Add NEXT_PUBLIC_API_URL
1. Click **"Add New"** button
2. **Key:** `NEXT_PUBLIC_API_URL`
3. **Value:** `https://shot-on-me.onrender.com/api`
4. **Environment:** Select **ALL** (Production, Preview, Development)
5. Click **"Save"**

### Step 4: Add NEXT_PUBLIC_SOCKET_URL (Optional but Recommended)
1. Click **"Add New"** button
2. **Key:** `NEXT_PUBLIC_SOCKET_URL`
3. **Value:** `https://shot-on-me.onrender.com`
4. **Environment:** Select **ALL** (Production, Preview, Development)
5. Click **"Save"**

### Step 5: Verify Google Maps API Key
1. Check if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists
2. If it exists, verify value is: `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`
3. If it doesn't exist, add it with the value above

### Step 6: Redeploy (CRITICAL!)
After adding environment variables, you **MUST** redeploy:

1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the **three dots (⋯)** menu on the right
4. Click **"Redeploy"**
5. Confirm the redeploy

**IMPORTANT:** Environment variables only take effect after a new deployment!

---

## ✅ Verification Checklist

After redeployment, verify:

- [ ] `NEXT_PUBLIC_API_URL` is set in Vercel
- [ ] `NEXT_PUBLIC_SOCKET_URL` is set in Vercel (optional)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel
- [ ] New deployment has completed successfully
- [ ] Visit your Vercel URL and check browser console - connection errors should be gone
- [ ] Login functionality works
- [ ] API calls succeed (check Network tab in DevTools)

---

## 🔍 How to Verify Environment Variables Are Working

After redeployment:

1. Open your Vercel app in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`
5. Should output: `https://shot-on-me.onrender.com/api`

**Note:** Environment variables with `NEXT_PUBLIC_` prefix are exposed to the browser. Variables without this prefix are only available server-side.

---

## 🚨 Troubleshooting

### Still Getting Connection Errors?

1. **Check Render Backend Status:**
   - Go to: https://dashboard.render.com
   - Check if `shot-on-me-backend` service is **"Live"** (not "Sleeping")
   - If sleeping, click **"Manual Deploy"** to wake it up

2. **Check CORS Configuration:**
   - Our CORS fix should allow Vercel URLs
   - Verify backend has been redeployed after CORS fix
   - Check Render deployment logs for errors

3. **Verify Backend URL:**
   - Test directly: `https://shot-on-me.onrender.com/api/health`
   - Should return: `{"status":"OK","database":"connected",...}`
   - If it fails, check Render service status

4. **Check Network Tab:**
   - Open DevTools → Network tab
   - Try to login
   - Look for failed requests to `shot-on-me.onrender.com`
   - Check the error message

### manifest.json 401 Error

This is a separate issue and should be fixed by the vercel.json update. If it persists:

1. Check that `public/manifest.json` exists in your repo
2. Verify vercel.json includes the manifest.json rewrite rule
3. Try accessing `/manifest.json` directly in browser
4. If still 401, check Vercel project settings for authentication requirements

---

## 📝 Summary

**What you need to do RIGHT NOW:**

1. ✅ Go to Vercel Dashboard → Settings → Environment Variables
2. ✅ Add `NEXT_PUBLIC_API_URL = https://shot-on-me.onrender.com/api`
3. ✅ Add `NEXT_PUBLIC_SOCKET_URL = https://shot-on-me.onrender.com` (optional)
4. ✅ Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists
5. ✅ Redeploy your Vercel application
6. ✅ Test login functionality

**This will fix the connection timeout errors immediately!**

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Render Dashboard:** https://dashboard.render.com
- **Test Backend Health:** https://shot-on-me.onrender.com/api/health

---

**Last Updated:** After CORS fix deployment
**Status:** 🔴 CRITICAL - Action Required
