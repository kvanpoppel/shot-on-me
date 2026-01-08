# ✅ Redeploy Checklist - Render & Vercel

**Follow this checklist step-by-step to redeploy your application**

---

## 📋 PRE-DEPLOYMENT

- [ ] All code changes committed to GitHub
- [ ] MongoDB Atlas connection string ready
- [ ] Stripe keys ready (if using)
- [ ] Twilio credentials ready (if using)
- [ ] Google Maps API key ready (if using)

---

## 🔧 BACKEND - RENDER

### Step 1: Create/Update Service
- [ ] Go to https://dashboard.render.com
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub: `shot-on-me-venue-portal`
- [ ] **Name:** `shot-on-me-backend`
- [ ] **Root Directory:** `backend`
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`

### Step 2: Environment Variables
Add these in Render dashboard:

- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `HOST=0.0.0.0`
- [ ] `MONGODB_URI=[Your MongoDB connection string]`
- [ ] `JWT_SECRET=[Strong random string, 32+ characters]`
- [ ] `FRONTEND_URL=[Will update after Vercel deploy]`
- [ ] `STRIPE_SECRET_KEY=[If using Stripe]`
- [ ] `STRIPE_PUBLISHABLE_KEY=[If using Stripe]`
- [ ] `TWILIO_ACCOUNT_SID=[If using Twilio]`
- [ ] `TWILIO_AUTH_TOKEN=[If using Twilio]`
- [ ] `TWILIO_PHONE_NUMBER=[If using Twilio]`

### Step 3: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] **Copy Backend URL:** `https://shot-on-me-backend.onrender.com`
- [ ] Check logs for "Server running" message
- [ ] Test: Visit backend URL in browser (should see response or error, not 404)

---

## 🎨 FRONTEND - VERCEL

### Step 1: Create/Update Project
- [ ] Go to https://vercel.com
- [ ] Click "Add New..." → "Project"
- [ ] Import: `shot-on-me-venue-portal`
- [ ] **Root Directory:** `shot-on-me`
- [ ] **Framework:** Next.js (auto-detected)

### Step 2: Environment Variables
Add these in Vercel dashboard:

- [ ] `NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api`
- [ ] `NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[If using Google Maps]`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[If using Stripe]`

### Step 3: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build (3-5 minutes)
- [ ] **Copy Frontend URL:** `https://shot-on-me-venue-portal.vercel.app`
- [ ] Check deployment status (should be "Ready")

---

## 🔄 POST-DEPLOYMENT UPDATES

### Update Backend (Render)
- [ ] Go to Render → Your service → Environment
- [ ] Update: `FRONTEND_URL=https://shot-on-me-venue-portal.vercel.app`
- [ ] Save (auto-redeploys)

### Update Frontend (Vercel) - If Needed
- [ ] Verify environment variables are correct
- [ ] Redeploy if needed: Deployments → "..." → "Redeploy"

---

## ✅ TESTING

### Backend Tests
- [ ] Visit: `https://shot-on-me-backend.onrender.com/api/venues`
- [ ] Should return JSON (data or error, not 404)
- [ ] Check Render logs for errors

### Frontend Tests
- [ ] Visit: `https://shot-on-me-venue-portal.vercel.app`
- [ ] App loads without errors
- [ ] Open browser console (F12)
- [ ] No CORS errors
- [ ] No 404 errors for API calls
- [ ] Test registration
- [ ] Test login
- [ ] Test wallet features

---

## 🎯 VENUE PORTAL (Optional)

If deploying venue portal separately:

- [ ] Vercel → "Add New..." → "Project"
- [ ] Import: `shot-on-me-venue-portal`
- [ ] **Root Directory:** `venue-portal`
- [ ] **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api`
  - `NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com`
- [ ] Deploy
- [ ] **Copy URL:** `https://venue-portal.vercel.app`

---

## ✅ FINAL VERIFICATION

- [ ] Backend is running (green status in Render)
- [ ] Frontend is deployed (green status in Vercel)
- [ ] Can access frontend URL
- [ ] Can register new user
- [ ] Can login
- [ ] Wallet features work
- [ ] Feed loads
- [ ] No console errors
- [ ] API calls work (check Network tab)

---

## 📝 YOUR DEPLOYMENT URLs

**Backend (Render):**
`https://shot-on-me-backend.onrender.com`

**Frontend (Vercel):**
`https://shot-on-me-venue-portal.vercel.app`

**Venue Portal (Vercel - Optional):**
`https://venue-portal.vercel.app`

---

## 🆘 IF SOMETHING GOES WRONG

**Backend won't start?**
- Check Render logs
- Verify environment variables
- Check MongoDB connection

**Frontend won't build?**
- Check Vercel build logs
- Fix TypeScript errors
- Check package.json

**API calls fail?**
- Verify `NEXT_PUBLIC_API_URL` in Vercel
- Check backend is running in Render
- Check CORS settings

**Need help?**
- See detailed guide: `REDEPLOY_RENDER_VERCEL.md`
- Check Render docs: https://render.com/docs
- Check Vercel docs: https://vercel.com/docs

---

**You're all set! Your app is now live on Render and Vercel! 🚀**

