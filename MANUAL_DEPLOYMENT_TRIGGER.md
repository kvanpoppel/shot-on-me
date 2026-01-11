# 🔄 Manual Deployment Trigger Guide

## ⚠️ Current Status

**Latest Commit:** `caed3c13` - Mobile layout improvements
**Status:** Pushed to GitHub, but deployments haven't updated

---

## 🚀 Manual Redeploy Instructions

### For Vercel (Frontend)

#### Option 1: Trigger via Dashboard (Easiest)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Log in if needed

2. **Find Your Project:**
   - Click on your project (likely `shot-on-me-venue-portal` or `www.shotonme.com`)

3. **Go to Deployments:**
   - Click the **"Deployments"** tab at the top

4. **Redeploy:**
   - Find the **latest deployment** (should show commit `caed3c13` or earlier)
   - Click the **three dots (⋯)** menu on the right of the deployment
   - Click **"Redeploy"**
   - Select **"Use existing Build Cache"** (faster)
   - Click **"Redeploy"**
   - Wait 3-5 minutes for deployment to complete

#### Option 2: Create Empty Commit to Trigger (If Option 1 doesn't work)

If auto-deployment isn't working, we can create an empty commit to trigger it:

```powershell
# Create an empty commit
git commit --allow-empty -m "Trigger deployment: Mobile layout improvements"

# Push to trigger deployment
git push origin main
```

---

### For Render (Backend)

#### Option 1: Manual Deploy via Dashboard

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Log in if needed

2. **Find Your Service:**
   - Click on `shot-on-me-backend` service

3. **Manual Deploy:**
   - Click **"Manual Deploy"** button
   - Select **"Deploy latest commit"**
   - Click **"Deploy"**
   - Wait 5-10 minutes for deployment to complete

#### Option 2: Check Auto-Deploy Settings

1. **In Render Dashboard:**
   - Go to your `shot-on-me-backend` service
   - Click **"Settings"** tab
   - Scroll to **"Auto-Deploy"** section
   - Ensure **"Auto-Deploy"** is **enabled**
   - Ensure **"Branch"** is set to **`main`**

---

## 🔍 Troubleshooting: Why Deployments Didn't Update

### Check 1: Verify Git Integration

**For Vercel:**
1. Go to: Vercel Dashboard → Your Project → Settings → Git
2. Verify:
   - ✅ Repository is connected correctly
   - ✅ Branch is set to `main`
   - ✅ Root Directory is set to `shot-on-me`
   - ✅ Production Branch is `main`

**For Render:**
1. Go to: Render Dashboard → Your Service → Settings
2. Verify:
   - ✅ Repository is connected correctly
   - ✅ Branch is set to `main`
   - ✅ Root Directory is set to `backend`
   - ✅ Auto-Deploy is enabled

### Check 2: Verify Latest Commit is Detected

**Check if Vercel/Render see the latest commit:**

1. **Vercel:**
   - Go to: Deployments tab
   - Look for commit hash: `caed3c13`
   - If you see older commits, deployments might not be detecting new commits

2. **Render:**
   - Go to: Events or Deployments tab
   - Look for commit hash: `caed3c13`
   - Check if there are any failed deployments

### Check 3: Check for Failed Deployments

**Vercel:**
- Look in Deployments tab for any deployments marked as **"Error"** or **"Failed"**
- Click on failed deployment to see build logs
- Common issues:
  - Build errors
  - Missing environment variables
  - Build timeout

**Render:**
- Look in Events/Logs tab for any errors
- Check build logs for issues
- Common issues:
  - Build errors
  - Missing environment variables
  - MongoDB connection issues

### Check 4: Verify Webhook Status

**Vercel:**
1. Go to: Settings → Git → Webhooks
2. Check if webhooks are active
3. If webhooks are failing, try:
   - Disconnect and reconnect the Git repository
   - Or use manual redeploy (Option 1 above)

**Render:**
- Render usually handles webhooks automatically
- If deployments aren't triggering, use Manual Deploy

---

## 🔧 Quick Fix: Trigger Deployment with Empty Commit

If auto-deployment isn't working, we can trigger it manually:

```powershell
# Create empty commit to trigger deployment
git commit --allow-empty -m "chore: trigger Vercel and Render redeployment"

# Push to trigger
git push origin main
```

This will:
- ✅ Create a new commit that Vercel/Render will detect
- ✅ Trigger automatic deployment on both platforms
- ✅ Use existing code (no changes, just triggers deployment)

---

## ✅ Verification After Manual Redeploy

After triggering redeploy, verify:

### Vercel:
1. ✅ Go to Deployments tab
2. ✅ See new deployment starting
3. ✅ Wait for status to change to **"Ready"**
4. ✅ Check build logs for any errors
5. ✅ Visit your app URL and verify changes are live

### Render:
1. ✅ Go to Events/Logs tab
2. ✅ See new deployment starting
3. ✅ Wait for status to change to **"Live"**
4. ✅ Check logs for any errors
5. ✅ Test backend health endpoint: `https://shot-on-me.onrender.com/api/health`

---

## 🚨 If Deployments Still Don't Work

### Common Issues:

1. **Git Integration Broken:**
   - Solution: Disconnect and reconnect Git repository in Vercel/Render

2. **Build Failures:**
   - Solution: Check build logs for errors and fix them

3. **Environment Variables Missing:**
   - Solution: Ensure all required environment variables are set

4. **Root Directory Incorrect:**
   - Solution: Verify Root Directory settings match project structure

5. **Branch Mismatch:**
   - Solution: Ensure both platforms are watching `main` branch

---

## 📝 Next Steps

1. **Try Manual Redeploy first** (easiest):
   - Vercel: Deployments → Redeploy
   - Render: Manual Deploy button

2. **If that doesn't work:**
   - Create empty commit (see above)
   - Or check troubleshooting steps above

3. **Verify deployments:**
   - Check both dashboards for deployment status
   - Test the deployed applications

---

**Quick Action:** Go to Vercel Dashboard → Deployments → Redeploy the latest deployment to trigger a fresh build with the latest code!
