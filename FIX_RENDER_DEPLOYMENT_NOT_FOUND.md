# 🔧 FIX: Render "DEPLOYMENT_NOT_FOUND" Error

**This error means Render can't find your deployment. Let's fix it!**

---

## 🔍 WHAT THIS ERROR MEANS

**"404: NOT_FOUND - DEPLOYMENT_NOT_FOUND"**

This means:
- ❌ The deployment/service doesn't exist
- ❌ The service was deleted
- ❌ The URL is wrong
- ❌ The service failed to deploy

---

## ✅ STEP 1: Check Render Dashboard

### Go to Render Dashboard:

1. **Visit:** https://dashboard.render.com
2. **Check your services:**
   - Do you see a service named `shot-on-me`?
   - What status does it show?

### Service Status:

- 🟢 **Green dot** = Running (service exists, URL might be wrong)
- 🔴 **Red dot** = Stopped/Failed (service exists but not running)
- 🟡 **Yellow dot** = Deploying (wait for it to finish)
- ❌ **No service** = Service doesn't exist (need to create it)

---

## ✅ STEP 2: Verify Service URL

### If Service Exists:

1. **Render Dashboard** → Your service `shot-on-me`
2. **Check the URL:**
   - Should be: `https://shot-on-me.onrender.com`
   - OR: `https://[your-service-name].onrender.com`

3. **Copy the exact URL** from Render dashboard
4. **Test it:**
   - Visit: `https://shot-on-me.onrender.com/api/venues`
   - Should return JSON (not 404)

---

## ✅ STEP 3: Create Service (If Missing)

### If Service Doesn't Exist:

1. **Render Dashboard** → Click **"New +"** → **"Web Service"**

2. **Connect GitHub:**
   - Select: `kvanpoppel/shot-on-me-venue-portal` (or your repo)

3. **Configure:**
   - **Name:** `shot-on-me`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install` (or leave blank)
   - **Start Command:** `npm start`
   - **Region:** Oregon (US West) - or your preferred region

4. **Add Environment Variables:**
   - Go to **Environment** tab
   - Add all required variables (see RENDER_DEPLOY_EXACT_STEPS.md)

5. **Deploy:**
   - Click **"Create Web Service"**
   - Wait 5-10 minutes

---

## ✅ STEP 4: Check Service Events

### If Service Exists But Shows Error:

1. **Render Dashboard** → Your service
2. **Click "Events" tab**
3. **Look at recent deployments:**
   - ✅ **"Deploy succeeded"** = Service is working
   - ❌ **"Deploy failed"** = Check error message
   - 🟡 **"In progress"** = Wait for it to finish

4. **If deployment failed:**
   - Click on the failed deployment
   - Read the error message
   - Common issues:
     - Missing environment variables
     - Build command failed
     - MongoDB connection failed
     - Port conflict

---

## ✅ STEP 5: Verify Service is Running

### Test Backend:

1. **Get your service URL from Render dashboard**
2. **Test health endpoint:**
   ```
   https://shot-on-me.onrender.com/health
   ```
   - Should return: `{"status":"ok"}`

3. **Test API endpoint:**
   ```
   https://shot-on-me.onrender.com/api/venues
   ```
   - Should return JSON (even if empty `[]`)

4. **If both work:**
   - ✅ Backend is running!
   - The 404 error was from wrong URL or service not found

---

## 🔧 COMMON ISSUES & FIXES

### Issue 1: Service Was Deleted

**Symptom:** Service doesn't appear in dashboard

**Fix:**
- Create new service (Step 3 above)
- Use same configuration
- Add all environment variables

### Issue 2: Wrong Service URL

**Symptom:** Service exists but URL is different

**Fix:**
1. **Render Dashboard** → Your service
2. **Copy the exact URL** shown
3. **Update Vercel environment variables:**
   - `NEXT_PUBLIC_API_URL` = `[your-actual-render-url]/api`
   - `NEXT_PUBLIC_SOCKET_URL` = `[your-actual-render-url]`
4. **Redeploy Vercel**

### Issue 3: Service Failed to Deploy

**Symptom:** Service exists but shows red (failed)

**Fix:**
1. **Events tab** → Check error message
2. **Common fixes:**
   - Add missing environment variables
   - Fix build command
   - Check MongoDB connection
   - Verify PORT is set correctly

### Issue 4: Service is Sleeping (Free Tier)

**Symptom:** First request takes 30-60 seconds, might show 404

**Fix:**
- This is normal for free tier
- Service wakes up on first request
- Wait 30-60 seconds, then try again
- Consider upgrading to paid tier for always-on

---

## 📋 QUICK CHECKLIST

**Run through this:**

- [ ] Service exists in Render dashboard
- [ ] Service shows green status (running)
- [ ] Service URL is correct
- [ ] Health endpoint works: `/health`
- [ ] API endpoint works: `/api/venues`
- [ ] Vercel environment variables use correct Render URL
- [ ] Vercel redeployed after setting variables

---

## 🎯 NEXT STEPS

**After fixing:**

1. **Verify backend:**
   - Visit: `https://shot-on-me.onrender.com/api/venues`
   - Should return JSON

2. **Update Vercel:**
   - Use correct Render URL in environment variables
   - Redeploy Vercel

3. **Test frontend:**
   - Visit: `https://shot-on-me.vercel.app`
   - Check browser console (F12)
   - Should see successful API calls (200, not 404)

---

## 🆘 STILL NOT WORKING?

**Check these:**

1. **Render Dashboard:**
   - Does service exist?
   - What's the status?
   - What's the exact URL?

2. **Service Events:**
   - Any failed deployments?
   - What's the error message?

3. **Service Settings:**
   - Root Directory: `backend`
   - Build Command: `npm install` (or blank)
   - Start Command: `npm start`
   - Environment variables: All set?

4. **Test directly:**
   - Copy exact URL from Render
   - Test in browser
   - Does it work?

---

**Most likely: Service doesn't exist or URL is wrong. Check Render dashboard first!**

