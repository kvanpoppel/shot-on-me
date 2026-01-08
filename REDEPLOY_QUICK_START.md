# ⚡ Quick Redeploy Guide - 10 Minutes

**Fastest way to redeploy to Render & Vercel**

---

## 🚀 STEP 1: Push to GitHub (2 min)

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
git add .
git commit -m "Ready for redeployment"
git push origin main
```

---

## 🔧 STEP 2: Deploy Backend to Render (5 min)

1. Go to: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repo: `shot-on-me-venue-portal`
4. Configure:
   - **Name:** `shot-on-me-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=[Your MongoDB connection string]
   JWT_SECRET=[Your JWT secret]
   FRONTEND_URL=https://shot-on-me-app.vercel.app
   [Add Stripe, Twilio, etc.]
   ```
6. Click **"Create Web Service"**
7. **Copy Backend URL:** `https://shot-on-me-backend.onrender.com`

---

## 🎨 STEP 3: Deploy Frontend to Vercel (3 min)

1. Go to: https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import: `shot-on-me-venue-portal`
4. Configure:
   - **Root Directory:** `shot-on-me`
   - **Framework:** Next.js
5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com
   ```
6. Click **"Deploy"**
7. **Copy Frontend URL:** `https://shot-on-me-venue-portal.vercel.app`

---

## ✅ STEP 4: Update & Test (2 min)

1. **Update Backend:**
   - Render → Service → Environment
   - Update: `FRONTEND_URL=https://shot-on-me-venue-portal.vercel.app`
   - Save (auto-redeploys)

2. **Test:**
   - Visit frontend URL
   - Test registration/login
   - Check console for errors

---

## ✅ DONE!

Your app is now live:
- **Backend:** https://shot-on-me-backend.onrender.com
- **Frontend:** https://shot-on-me-venue-portal.vercel.app

---

**For detailed guide, see:** `REDEPLOY_RENDER_VERCEL.md`

