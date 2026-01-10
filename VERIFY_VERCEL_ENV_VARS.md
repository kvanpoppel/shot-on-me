# ✅ Verify Vercel Environment Variables Are Correct

## 🎯 Current Status

You have the environment variables set in Vercel! Now we need to verify they have **correct values** and that you've **redeployed** after setting them.

## ✅ Required Environment Variables (Already Set)

From your Vercel dashboard, I can see:
- ✅ `NEXT_PUBLIC_API_URL` - Set (Updated Jan 1)
- ✅ `NEXT_PUBLIC_SOCKET_URL` - Set (Added Jan 1)  
- ✅ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Set (Updated 12/28/25)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Set (Updated 2h ago)

## ⚠️ CRITICAL: Verify Values Are Correct

The variables are **obscured** in the Vercel dashboard, so we need to verify they have the correct values:

### Step 1: Verify NEXT_PUBLIC_API_URL

**Should be:**
```
https://shot-on-me.onrender.com/api
```

**NOT:**
- ❌ `http://localhost:5000/api` (wrong - local development)
- ❌ `https://shot-on-me.onrender.com` (missing `/api` suffix)
- ❌ Empty or undefined

**To verify in Vercel:**
1. Click on the `NEXT_PUBLIC_API_URL` variable in Vercel dashboard
2. Check the value matches: `https://shot-on-me.onrender.com/api`
3. If wrong, click "Edit" and update it

### Step 2: Verify NEXT_PUBLIC_SOCKET_URL

**Should be:**
```
https://shot-on-me.onrender.com
```

**NOT:**
- ❌ `http://localhost:5000` (wrong)
- ❌ `https://shot-on-me.onrender.com/api` (has `/api` suffix - wrong)
- ❌ `wss://shot-on-me.onrender.com` (should be `https://`, not `wss://`)

**Note:** The code will automatically convert `https://` to `wss://` for WebSocket connections when needed.

### Step 3: Verify Environment Scope

All variables should be set for:
- ✅ Production
- ✅ Preview
- ✅ Development

(Or "All Environments")

---

## 🔴 CRITICAL: Redeploy After Setting Variables

**Environment variables ONLY take effect after a new deployment!**

If you set the variables but haven't redeployed yet:

### Step 1: Go to Deployments
1. In Vercel dashboard, click **"Deployments"** tab (top menu)
2. Find the **latest deployment**
3. Look at the timestamp - is it **AFTER** you set the environment variables?

### Step 2: Redeploy if Needed
If the latest deployment is **BEFORE** you set the environment variables:

1. Click the **three dots (⋯)** menu on the latest deployment
2. Click **"Redeploy"**
3. Select **"Use existing Build Cache"** (faster)
4. Click **"Redeploy"**
5. Wait for deployment to complete (~2-3 minutes)

### Step 3: Verify New Deployment Has Environment Variables
1. After deployment completes, check the build logs
2. In the deployment details, verify environment variables are included
3. Look for any build warnings about missing variables

---

## 🧪 How to Test if Environment Variables Are Working

After redeploying, test your app:

### Test 1: Check Browser Console

1. Open your Vercel app in browser: `https://www.shotonme.com` (or your Vercel URL)
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Type this command:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
```

**Expected output:**
```
API URL: https://shot-on-me.onrender.com/api
```

**If you see:**
- `undefined` → Environment variable not set or not redeployed
- `http://localhost:5000/api` → Wrong value set in Vercel
- Different URL → Check if it's the correct Render backend URL

### Test 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Try to **login** or make any API call
4. Look for requests to `shot-on-me.onrender.com`

**Should see:**
- ✅ Requests to `https://shot-on-me.onrender.com/api/auth/login`
- ✅ Status 200 (OK) responses
- ❌ NO connection timeout errors
- ❌ NO "ERR_FAILED" errors
- ❌ NO CORS errors

### Test 3: Test Backend Health Endpoint

Open in browser:
```
https://shot-on-me.onrender.com/api/health
```

**Should return:**
```json
{
  "status": "OK",
  "database": "connected",
  "timestamp": "2026-01-10T...",
  "service": "Shot On Me API"
}
```

**If you get:**
- ❌ Connection timeout → Backend is sleeping (free tier on Render)
- ❌ 404 Not Found → Wrong URL configured
- ❌ 500 Error → Backend issue (check Render logs)

---

## 🔍 Troubleshooting

### Issue: Still Getting Connection Timeout

**Possible causes:**
1. **Environment variable value is wrong**
   - Check `NEXT_PUBLIC_API_URL` value in Vercel
   - Should be: `https://shot-on-me.onrender.com/api`

2. **Haven't redeployed after setting variables**
   - Variables only work after new deployment
   - Go to Deployments → Redeploy

3. **Render backend is sleeping** (Free tier)
   - Go to: https://dashboard.render.com
   - Check if `shot-on-me-backend` service shows "Sleeping"
   - Click "Manual Deploy" to wake it up
   - First request after waking up may take 30-60 seconds

4. **Wrong Render service URL**
   - Verify your Render service name is `shot-on-me-backend`
   - Check Render dashboard for the correct service URL
   - Should be: `https://shot-on-me.onrender.com` (or similar)

### Issue: CORS Errors Still Appearing

**Check:**
1. Backend has been redeployed after CORS fix (commit `88d78e80`)
2. Render deployment logs show successful deployment
3. Backend CORS config includes Vercel URL pattern

**Test CORS:**
Open browser console and test:
```javascript
fetch('https://shot-on-me.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('CORS OK:', d))
  .catch(e => console.error('CORS Error:', e))
```

Should succeed without CORS errors.

### Issue: manifest.json 401 Error

This should be fixed by the `vercel.json` update. If it persists:

1. Check `shot-on-me/vercel.json` exists in repo
2. Verify it includes the manifest.json rewrite rule
3. Try accessing `/manifest.json` directly in browser
4. Check if new Vercel deployment includes vercel.json changes

---

## ✅ Success Checklist

After redeploying, verify all of these:

- [ ] `NEXT_PUBLIC_API_URL` value is: `https://shot-on-me.onrender.com/api`
- [ ] `NEXT_PUBLIC_SOCKET_URL` value is: `https://shot-on-me.onrender.com`
- [ ] All variables set for "All Environments"
- [ ] **New deployment completed AFTER setting variables**
- [ ] Browser console shows correct API URL
- [ ] Network tab shows requests to `shot-on-me.onrender.com`
- [ ] Login functionality works
- [ ] No connection timeout errors
- [ ] No CORS errors
- [ ] Backend health endpoint responds: `https://shot-on-me.onrender.com/api/health`

---

## 📝 Quick Action Items

**If variables are correct but still not working:**

1. ✅ **Redeploy Vercel application** (Deployments → Redeploy)
2. ✅ **Wake up Render backend** (if sleeping: Render Dashboard → Manual Deploy)
3. ✅ **Test backend health endpoint** directly in browser
4. ✅ **Check browser console** for actual API URL being used
5. ✅ **Check Network tab** for failed requests and their errors

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Render Dashboard:** https://dashboard.render.com
- **Backend Health Check:** https://shot-on-me.onrender.com/api/health
- **Your Vercel App:** https://www.shotonme.com (or your Vercel URL)

---

**Next Step:** Redeploy your Vercel application if you haven't already, then test using the methods above!
