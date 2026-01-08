# 🚀 Complete Redeployment Guide - Render & Vercel

**Step-by-Step Guide to Redeploy Shot On Me to Production**

This guide will help you redeploy your application to Render (backend) and Vercel (frontend).

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before redeploying, ensure you have:

- [ ] All code committed to GitHub
- [ ] Render account (free at render.com)
- [ ] Vercel account (free at vercel.com)
- [ ] MongoDB Atlas connection string
- [ ] All API keys ready (Stripe, Twilio, etc.)
- [ ] Domain ready (if using custom domain)

---

## 🔧 PART 1: BACKEND DEPLOYMENT TO RENDER

### Step 1: Prepare Your Code

1. **Ensure all changes are committed:**
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal
   git add .
   git commit -m "Preparing for redeployment"
   git push origin main
   ```

2. **Verify backend structure:**
   - `backend/server.js` exists
   - `backend/package.json` has correct start script
   - `render.yaml` is in root (optional, for blueprint)

### Step 2: Deploy to Render

#### Option A: Using Render Dashboard (Recommended)

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Sign in or create account

2. **Create New Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository: `shot-on-me-venue-portal`

3. **Configure Service:**
   - **Name:** `shot-on-me-backend`
   - **Region:** Choose closest to you (US East recommended)
   - **Branch:** `main` (or your default branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

4. **Set Environment Variables:**
   Click "Advanced" → "Add Environment Variable" and add:

   **Required Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   MONGODB_URI=[Your MongoDB Atlas connection string]
   JWT_SECRET=[Your JWT secret - generate a strong random string]
   FRONTEND_URL=https://shot-on-me-app.vercel.app
   ```

   **Stripe (if using):**
   ```
   STRIPE_SECRET_KEY=[Your Stripe secret key]
   STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]
   ```

   **Twilio (if using):**
   ```
   TWILIO_ACCOUNT_SID=[Your Twilio Account SID]
   TWILIO_AUTH_TOKEN=[Your Twilio Auth Token]
   TWILIO_PHONE_NUMBER=[Your Twilio phone number, e.g., +18664819511]
   ```

   **Cloudinary (if using):**
   ```
   CLOUDINARY_CLOUD_NAME=[Your Cloudinary cloud name]
   CLOUDINARY_API_KEY=[Your Cloudinary API key]
   CLOUDINARY_API_SECRET=[Your Cloudinary API secret]
   ```

   **CORS (if needed):**
   ```
   CORS_ORIGIN=https://shot-on-me-app.vercel.app,https://venue-portal.vercel.app
   ```

5. **Create Service:**
   - Click **"Create Web Service"**
   - Render will start building and deploying
   - Wait 5-10 minutes for first deployment

6. **Get Your Backend URL:**
   - Once deployed, you'll get a URL like: `https://shot-on-me-backend.onrender.com`
   - **Save this URL** - you'll need it for frontend

#### Option B: Using render.yaml (Blueprint)

If you have `render.yaml` in your repo:

1. Go to Render Dashboard
2. Click **"New +"** → **"Blueprint"**
3. Connect repository
4. Render will auto-detect `render.yaml`
5. Review and deploy
6. **Still need to add environment variables manually in dashboard**

### Step 3: Verify Backend Deployment

1. **Test Backend URL:**
   - Visit: `https://shot-on-me-backend.onrender.com/api/health` (if you have health endpoint)
   - Or: `https://shot-on-me-backend.onrender.com/api/venues` (should return data or error, not 404)

2. **Check Logs:**
   - Render Dashboard → Your service → "Logs"
   - Look for errors or "Server running on port 5000"

3. **Common Issues:**
   - **Build fails:** Check package.json, ensure all dependencies are listed
   - **Server crashes:** Check logs, verify environment variables
   - **MongoDB connection fails:** Verify MONGODB_URI is correct

---

## 🎨 PART 2: FRONTEND DEPLOYMENT TO VERCEL

### Step 1: Deploy Shot On Me App

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Sign in or create account

2. **Import Project:**
   - Click **"Add New..."** → **"Project"**
   - Import from GitHub: `shot-on-me-venue-portal`

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `shot-on-me`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Set Environment Variables:**
   Click "Environment Variables" and add:

   **Required:**
   ```
   NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com
   ```

   **Google Maps (if using):**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[Your Google Maps API key]
   ```

   **Stripe (if using):**
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]
   ```

5. **Deploy:**
   - Click **"Deploy"**
   - Wait 3-5 minutes for build
   - Vercel will provide URL: `https://shot-on-me-venue-portal.vercel.app`

6. **Get Your Frontend URL:**
   - Save this URL: `https://shot-on-me-venue-portal.vercel.app`
   - Update backend `FRONTEND_URL` environment variable with this URL

### Step 2: Deploy Venue Portal (Optional)

If you want to deploy the venue portal separately:

1. **Add Another Project in Vercel:**
   - Click **"Add New..."** → **"Project"**
   - Import same repository: `shot-on-me-venue-portal`

2. **Configure:**
   - **Root Directory:** `venue-portal`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com
   ```

4. **Deploy:**
   - Click **"Deploy"**
   - Get URL: `https://venue-portal.vercel.app`

---

## 🔄 PART 3: UPDATE ENVIRONMENT VARIABLES

### Update Backend (Render)

After frontend is deployed, update backend environment variables:

1. **Go to Render Dashboard:**
   - Your service → "Environment"

2. **Update FRONTEND_URL:**
   ```
   FRONTEND_URL=https://shot-on-me-venue-portal.vercel.app
   ```

3. **Update CORS (if needed):**
   ```
   CORS_ORIGIN=https://shot-on-me-venue-portal.vercel.app,https://venue-portal.vercel.app
   ```

4. **Redeploy:**
   - Render will auto-redeploy when you save environment variables
   - Or manually trigger: "Manual Deploy" → "Deploy latest commit"

### Update Frontend (Vercel)

1. **Go to Vercel Dashboard:**
   - Your project → "Settings" → "Environment Variables"

2. **Verify API URLs:**
   ```
   NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com
   ```

3. **Redeploy if needed:**
   - Go to "Deployments"
   - Click "..." → "Redeploy"

---

## ✅ PART 4: VERIFICATION & TESTING

### Test Backend

1. **Health Check:**
   - Visit: `https://shot-on-me-backend.onrender.com/api/venues`
   - Should return JSON (data or error, not 404)

2. **API Test:**
   - Test registration: `POST https://shot-on-me-backend.onrender.com/api/auth/register`
   - Test login: `POST https://shot-on-me-backend.onrender.com/api/auth/login`

### Test Frontend

1. **Visit Frontend URL:**
   - `https://shot-on-me-venue-portal.vercel.app`
   - Should load the app

2. **Test Features:**
   - [ ] Registration works
   - [ ] Login works
   - [ ] Wallet loads
   - [ ] Can send money (if configured)
   - [ ] Feed loads
   - [ ] No console errors

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Check for errors
   - Verify API calls are going to correct backend URL

### Common Issues & Fixes

**Issue: CORS Errors**
- **Fix:** Update backend `FRONTEND_URL` and `CORS_ORIGIN` environment variables
- **Fix:** Ensure backend CORS middleware includes Vercel URL

**Issue: API 404 Errors**
- **Fix:** Verify `NEXT_PUBLIC_API_URL` is correct in Vercel
- **Fix:** Check backend is running in Render

**Issue: MongoDB Connection Errors**
- **Fix:** Verify `MONGODB_URI` in Render environment variables
- **Fix:** Check MongoDB Atlas network access allows Render IPs

**Issue: Build Fails**
- **Fix:** Check package.json for all dependencies
- **Fix:** Check build logs for specific errors
- **Fix:** Ensure Node version matches (check engines in package.json)

---

## 🌐 PART 5: CUSTOM DOMAIN SETUP (Optional)

If you have a custom domain (e.g., shotonme.com):

### Backend Domain (api.shotonme.com)

1. **In Render:**
   - Service → "Settings" → "Custom Domains"
   - Add: `api.shotonme.com`
   - Copy the CNAME value provided

2. **In Your DNS Provider:**
   - Add CNAME record:
     - Name: `api`
     - Value: `[CNAME from Render]`
     - TTL: 3600

3. **Update Environment Variables:**
   - In Vercel: `NEXT_PUBLIC_API_URL=https://api.shotonme.com/api`
   - In Render: `FRONTEND_URL=https://www.shotonme.com`

### Frontend Domain (www.shotonme.com)

1. **In Vercel:**
   - Project → "Settings" → "Domains"
   - Add: `www.shotonme.com`
   - Add: `shotonme.com`
   - Copy DNS records provided

2. **In Your DNS Provider:**
   - Add A record for root domain
   - Add CNAME for www subdomain
   - Use values from Vercel

3. **Wait for DNS Propagation:**
   - Usually 10-30 minutes
   - Check at: https://dnschecker.org

---

## 📊 PART 6: MONITORING & MAINTENANCE

### Render Monitoring

1. **Check Service Status:**
   - Render Dashboard → Your service
   - Green = Running, Red = Down

2. **View Logs:**
   - Service → "Logs"
   - Monitor for errors
   - Check startup messages

3. **Metrics:**
   - Service → "Metrics"
   - Monitor CPU, memory, requests

### Vercel Monitoring

1. **Check Deployments:**
   - Project → "Deployments"
   - Green = Success, Red = Failed

2. **View Logs:**
   - Deployment → "View Function Logs"
   - Check for runtime errors

3. **Analytics:**
   - Project → "Analytics"
   - Monitor traffic, performance

---

## 🔄 PART 7: CONTINUOUS DEPLOYMENT

### Automatic Deployments

Both Render and Vercel support automatic deployments:

- **Render:** Auto-deploys on push to `main` branch
- **Vercel:** Auto-deploys on push to `main` branch

### Manual Redeployment

**Render:**
1. Dashboard → Your service
2. "Manual Deploy" → "Deploy latest commit"

**Vercel:**
1. Dashboard → Your project
2. "Deployments" → "..." → "Redeploy"

---

## 📝 ENVIRONMENT VARIABLES REFERENCE

### Backend (Render) - Complete List

```env
# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shotonme

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Frontend
FRONTEND_URL=https://shot-on-me-venue-portal.vercel.app
CORS_ORIGIN=https://shot-on-me-venue-portal.vercel.app,https://venue-portal.vercel.app

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+18664819511

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Frontend (Vercel) - Complete List

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://shot-on-me-backend.onrender.com

# Google Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Code committed to GitHub
- [ ] All environment variables documented
- [ ] MongoDB Atlas connection string ready
- [ ] API keys ready (Stripe, Twilio, etc.)

### Backend (Render)
- [ ] Service created in Render
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] All environment variables added
- [ ] Service deployed successfully
- [ ] Backend URL obtained
- [ ] Backend responding to requests

### Frontend (Vercel)
- [ ] Project created in Vercel
- [ ] Root directory set to `shot-on-me`
- [ ] Framework: Next.js
- [ ] Environment variables added
- [ ] Project deployed successfully
- [ ] Frontend URL obtained
- [ ] Frontend loads correctly

### Post-Deployment
- [ ] Backend FRONTEND_URL updated
- [ ] Frontend API_URL updated
- [ ] Test registration
- [ ] Test login
- [ ] Test wallet features
- [ ] Test feed
- [ ] No console errors
- [ ] No CORS errors

### Custom Domain (Optional)
- [ ] Backend domain configured (api.shotonme.com)
- [ ] Frontend domain configured (www.shotonme.com)
- [ ] DNS records added
- [ ] DNS propagated
- [ ] SSL certificates active

---

## 🆘 TROUBLESHOOTING

### Backend Won't Start

**Check:**
1. Render logs for errors
2. Environment variables are set
3. MongoDB connection string is correct
4. Port is set to 5000
5. package.json has correct start script

**Common Fixes:**
- Verify `MONGODB_URI` format
- Check MongoDB Atlas network access
- Ensure all required env vars are set

### Frontend Build Fails

**Check:**
1. Vercel build logs
2. package.json dependencies
3. TypeScript errors (if any)
4. Next.js configuration

**Common Fixes:**
- Run `npm install` locally to check for errors
- Fix TypeScript errors
- Check next.config.js

### API Calls Fail

**Check:**
1. Backend URL is correct in frontend env vars
2. Backend is running in Render
3. CORS is configured correctly
4. Network tab in browser DevTools

**Common Fixes:**
- Update `NEXT_PUBLIC_API_URL` in Vercel
- Update `FRONTEND_URL` in Render
- Check CORS middleware in backend

### MongoDB Connection Issues

**Check:**
1. MongoDB Atlas connection string
2. Network access in MongoDB Atlas (allow all IPs or Render IPs)
3. Database user permissions

**Common Fixes:**
- Add `0.0.0.0/0` to MongoDB Atlas network access (for development)
- Verify username/password in connection string
- Check database name is correct

---

## 📞 QUICK REFERENCE

### Backend URL
- Render: `https://shot-on-me-backend.onrender.com`
- Custom: `https://api.shotonme.com` (if configured)

### Frontend URL
- Vercel: `https://shot-on-me-venue-portal.vercel.app`
- Custom: `https://www.shotonme.com` (if configured)

### Venue Portal URL
- Vercel: `https://venue-portal.vercel.app`
- Custom: `https://venues.shotonme.com` (if configured)

---

## 🚀 QUICK REDEPLOY COMMANDS

### If You Need to Force Redeploy

**Render:**
1. Dashboard → Service → "Manual Deploy" → "Deploy latest commit"

**Vercel:**
1. Dashboard → Project → "Deployments" → "..." → "Redeploy"

### If You Need to Update Environment Variables

**Render:**
1. Dashboard → Service → "Environment"
2. Add/Edit variables
3. Save (auto-redeploys)

**Vercel:**
1. Dashboard → Project → "Settings" → "Environment Variables"
2. Add/Edit variables
3. Redeploy manually if needed

---

## 📚 ADDITIONAL RESOURCES

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas

---

**Your application should now be live on Render (backend) and Vercel (frontend)!**

**Next Steps:**
1. Test all features
2. Monitor logs for errors
3. Set up custom domain (optional)
4. Configure monitoring and alerts

---

*Last Updated: 2024*

