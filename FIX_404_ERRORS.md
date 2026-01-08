# 🔧 FIX 404 ERRORS - Step-by-Step

**404 errors mean the frontend can't reach the backend. Let's fix it!**

---

## 🔍 STEP 1: Check What's Failing

**Open browser console (F12):**
1. Go to **Network** tab
2. Refresh the page
3. Look for failed requests (red)
4. Check which URL is failing

**Common failing URLs:**
- `/api/users/me` - User authentication check
- `/api/venues` - Loading venues
- `/api/auth/*` - Login/register

---

## ✅ STEP 2: Verify Backend is Running

### Test Backend Directly:

1. **Visit in browser:**
   ```
   https://shot-on-me.onrender.com/api/venues
   ```

2. **Expected results:**
   - ✅ **JSON response** (even if empty `[]`) = Backend is working!
   - ❌ **404 Not Found** = Backend route issue
   - ❌ **Connection refused** = Backend not running
   - ❌ **Timeout** = Backend sleeping (free tier)

3. **Also test:**
   ```
   https://shot-on-me.onrender.com/health
   ```
   - Should return: `{"status":"ok"}`

---

## ✅ STEP 3: Check Vercel Environment Variables

**Go to Vercel Dashboard:**
1. Your project → **Settings** → **Environment Variables**
2. **Verify these are set:**

### Required Variables:
- `NEXT_PUBLIC_API_URL` = `https://shot-on-me.onrender.com/api`
- `NEXT_PUBLIC_SOCKET_URL` = `https://shot-on-me.onrender.com`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_51SF1jnAFRpWPINtQ4SzB5vIXQoCsUw0vhD6qZFYi5Ljb5XC1ywZbBEoTovt0I8GAzNpyWsjWlwUcW5jgp0dZLWBu00i`

### Common Issues:
- ❌ Variable not set
- ❌ Wrong URL (missing `/api` at end)
- ❌ Using `http://` instead of `https://`
- ❌ Variables not checked for Production/Preview/Development

---

## ✅ STEP 4: Check API URL Format

**The API URL should be:**
```
https://shot-on-me.onrender.com/api
```

**NOT:**
- ❌ `https://shot-on-me.onrender.com` (missing `/api`)
- ❌ `https://shot-on-me.onrender.com/api/` (trailing slash is OK but not required)
- ❌ `http://shot-on-me.onrender.com/api` (must be HTTPS)

---

## ✅ STEP 5: Redeploy Vercel

**If you just added environment variables:**

1. **Vercel Dashboard** → Your project
2. **Deployments** tab
3. Click **"Redeploy"** on latest deployment
4. **OR** click **"..."** → **"Redeploy"**
5. Wait 3-5 minutes
6. Test again

**Why?**
- Environment variables are only loaded during build
- Adding variables after deployment requires redeploy

---

## ✅ STEP 6: Check Browser Console

**Open browser console (F12):**

1. **Console tab:**
   - Look for error messages
   - Check if API URL is correct

2. **Network tab:**
   - Find the failed request
   - Check the **Request URL**
   - Should be: `https://shot-on-me.onrender.com/api/...`
   - If it's `localhost` or wrong URL, environment variable is wrong

---

## 🔧 COMMON FIXES

### Fix 1: Backend Not Running

**Symptom:** Backend URL returns 404 or timeout

**Solution:**
1. **Render Dashboard** → Your service
2. Check service status:
   - 🟢 **Green** = Running
   - 🔴 **Red** = Stopped (check Events for error)
   - 🟡 **Yellow** = Deploying (wait)

3. **If Red:**
   - Go to **Events** tab
   - Check error message
   - Fix issue and redeploy

### Fix 2: Wrong API URL in Vercel

**Symptom:** Network tab shows wrong URL (localhost, etc.)

**Solution:**
1. **Vercel** → Settings → Environment Variables
2. Check `NEXT_PUBLIC_API_URL`
3. Should be: `https://shot-on-me.onrender.com/api`
4. **Redeploy** after fixing

### Fix 3: Environment Variables Not Loaded

**Symptom:** Variables are set but not working

**Solution:**
1. **Vercel** → Settings → Environment Variables
2. Verify variables are checked for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
3. **Redeploy** to load new variables

### Fix 4: CORS Error (Not 404, but related)

**Symptom:** CORS error in console

**Solution:**
1. **Render** → Environment tab
2. Check `FRONTEND_URL` is set to: `https://shot-on-me.vercel.app`
3. Service will auto-redeploy

---

## 🎯 QUICK DIAGNOSIS CHECKLIST

**Run through this:**

- [ ] Backend responds: `https://shot-on-me.onrender.com/api/venues` returns JSON
- [ ] Backend health: `https://shot-on-me.onrender.com/health` returns `{"status":"ok"}`
- [ ] Vercel env vars: All 4 variables are set correctly
- [ ] API URL format: `https://shot-on-me.onrender.com/api` (with `/api`)
- [ ] Vercel redeployed: After adding/changing variables
- [ ] Browser console: Check Network tab for actual failing URL

---

## 📋 TESTING STEPS

**After fixing, test:**

1. **Backend directly:**
   ```
   https://shot-on-me.onrender.com/api/venues
   ```

2. **Frontend app:**
   ```
   https://shot-on-me.vercel.app
   ```

3. **Check browser console:**
   - F12 → Network tab
   - Look for API calls
   - Should show 200 (success) not 404

4. **Try login/register:**
   - Should connect to backend
   - No 404 errors

---

## 🆘 STILL NOT WORKING?

**Check these:**

1. **Render service status:**
   - Is it green (running)?
   - Check Events tab for errors

2. **Vercel build logs:**
   - Go to Deployments → Click on deployment
   - Check build logs for errors

3. **Network tab:**
   - What exact URL is failing?
   - Copy the full URL and test in browser

4. **Environment variables:**
   - Double-check all values
   - Make sure no typos
   - Verify HTTPS (not HTTP)

---

**Most likely issue: Vercel environment variables not set or wrong API URL. Check that first!**

