# 🔧 Render Manual Deployment Guide

**Issue:** Render did not automatically redeploy after GitHub push.

## 🚀 Manual Deployment Steps

### Option 1: Trigger Manual Deploy from Render Dashboard

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Log in to your account

2. **Navigate to Your Service:**
   - Click on your backend service (likely named "shot-on-me" or similar)
   - Or go to: https://dashboard.render.com/web/[your-service-name]

3. **Trigger Manual Deploy:**
   - Look for a **"Manual Deploy"** button or **"Deploy latest commit"** option
   - Click it to trigger a new deployment
   - Render will pull the latest code from your GitHub repository

### Option 2: Check Auto-Deploy Settings

1. **Go to Your Service Settings:**
   - Click on your backend service
   - Go to **"Settings"** tab

2. **Verify Auto-Deploy:**
   - Check if **"Auto-Deploy"** is enabled
   - It should be set to **"Yes"** for automatic deployments
   - If it's disabled, enable it and save

3. **Check Branch:**
   - Ensure the **"Branch"** is set to **"main"**
   - This should match your GitHub branch

### Option 3: Check GitHub Integration

1. **Go to Service Settings:**
   - Click on your backend service
   - Go to **"Settings"** → **"Source"**

2. **Verify Repository:**
   - Ensure the correct GitHub repository is connected
   - Repository should be: `kvanpoppel/shot-on-me` (or your repo name)
   - Branch should be: `main`

3. **Check Webhook:**
   - Render should have a webhook configured in your GitHub repository
   - If missing, you may need to reconnect the repository

## 🔍 Troubleshooting

### If Auto-Deploy is Not Working:

1. **Disconnect and Reconnect Repository:**
   - In Render service settings, disconnect the GitHub repository
   - Reconnect it to refresh the webhook

2. **Check Render Logs:**
   - Go to your service → **"Logs"** tab
   - Look for any error messages about deployments

3. **Verify GitHub Webhook:**
   - Go to your GitHub repository: https://github.com/kvanpoppel/shot-on-me
   - Go to **Settings** → **Webhooks**
   - Look for a Render webhook
   - If missing, Render may need to be reconnected

### Manual Deploy Command (Alternative)

If you have Render CLI installed:
```bash
render deploy
```

## ✅ Quick Fix: Manual Deploy Now

**Fastest Solution:**
1. Go to: https://dashboard.render.com
2. Click on your backend service
3. Click **"Manual Deploy"** or **"Deploy latest commit"**
4. Wait for deployment to complete (5-10 minutes)

## 📝 What Changed in Latest Commit

- **Commit:** `e990b085`
- **Changes:**
  - Venues default to list view
  - View toggle buttons added
  - Kate's Pub and Paige's Pub visibility fix

---

**After manual deployment, your changes will be live on:**
- Backend: `https://shot-on-me.onrender.com`
- Frontend: `https://www.shotonme.com` (Vercel - should auto-deploy)



