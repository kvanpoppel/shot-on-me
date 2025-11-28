# 🚀 Semi-Live Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment

- [ ] Code is committed and pushed to Git repository
- [ ] All environment variables documented
- [ ] MongoDB Atlas connection string ready
- [ ] All API keys ready (Twilio, Cloudinary, Stripe, Google Maps)
- [ ] Tested locally and everything works

## Step 1: Deploy Backend to Render

- [ ] Created Render account / Logged in
- [ ] Created new Web Service on Render
- [ ] Configured service settings (Root Directory: `backend`)
- [ ] Added all environment variables to Render
- [ ] Deployed backend service
- [ ] Backend URL obtained: `https://________________.onrender.com`
- [ ] Tested health endpoint: `/api/health` ✅
- [ ] Backend is responding correctly

## Step 2: Deploy Venue Portal to Vercel

- [ ] Created Vercel account / Logged in
- [ ] Created new project for Venue Portal
- [ ] Configured Root Directory: `venue-portal`
- [ ] Added environment variable: `NEXT_PUBLIC_API_URL`
- [ ] Deployed Venue Portal
- [ ] Venue Portal URL: `https://________________.vercel.app`
- [ ] Tested Venue Portal loads correctly

## Step 3: Deploy Shot On Me App to Vercel

- [ ] Created new project for Shot On Me
- [ ] Configured Root Directory: `shot-on-me`
- [ ] Added environment variables:
  - [ ] `NEXT_PUBLIC_API_URL`
  - [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Deployed Shot On Me app
- [ ] Shot On Me URL: `https://________________.vercel.app`
- [ ] Tested Shot On Me app loads correctly

## Step 4: Configure Custom Domains

- [ ] Added `www.shotonme.com` to Shot On Me project in Vercel
- [ ] Added `shotonme.com` to Shot On Me project in Vercel
- [ ] Added `portal.shotonme.com` to Venue Portal project in Vercel
- [ ] Updated GoDaddy DNS records:
  - [ ] CNAME for `www.shotonme.com`
  - [ ] A record for `shotonme.com` (or CNAME if supported)
  - [ ] CNAME for `portal.shotonme.com`
- [ ] Waited for DNS propagation (5-60 minutes)
- [ ] Verified domains are working:
  - [ ] `https://www.shotonme.com` ✅
  - [ ] `https://shotonme.com` ✅
  - [ ] `https://portal.shotonme.com` ✅

## Step 5: Update Backend Configuration

- [ ] Updated Render backend `FRONTEND_URL` environment variable
- [ ] Redeployed backend (if needed)
- [ ] Verified CORS is working (no CORS errors in browser console)

## Step 6: Testing

### Backend Tests
- [ ] Health endpoint works: `/api/health`
- [ ] Registration endpoint works: `/api/auth/register`
- [ ] Login endpoint works: `/api/auth/login`

### Frontend Tests
- [ ] Shot On Me app loads without errors
- [ ] Can register a new user
- [ ] Can login
- [ ] API calls are working (check Network tab)
- [ ] Venue Portal loads without errors
- [ ] Can login to Venue Portal
- [ ] Venue Portal can connect to backend

### Integration Tests
- [ ] User registration works end-to-end
- [ ] User login works end-to-end
- [ ] Feed loads (if applicable)
- [ ] Map loads (if applicable)
- [ ] Wallet functionality works (if applicable)

## Step 7: Security & Production Readiness

- [ ] Using production MongoDB Atlas (not local)
- [ ] Using production Stripe keys (not test keys)
- [ ] Strong JWT_SECRET set (different from dev)
- [ ] All API keys are production keys
- [ ] HTTPS is working (SSL certificates active)
- [ ] No console errors in production
- [ ] Environment variables are secure (not exposed)

## Step 8: Monitoring & Maintenance

- [ ] Set up error monitoring (optional: Sentry, LogRocket)
- [ ] Set up uptime monitoring (optional: UptimeRobot)
- [ ] Documented all URLs and credentials (securely)
- [ ] Created backup strategy for MongoDB
- [ ] Tested deployment process (can redeploy if needed)

## Post-Deployment

- [ ] All services are running
- [ ] All domains are working
- [ ] No critical errors in logs
- [ ] Performance is acceptable
- [ ] Ready for users! 🎉

---

## Quick Reference

**Backend URL:** `https://________________.onrender.com`  
**Venue Portal:** `https://portal.shotonme.com`  
**Shot On Me:** `https://www.shotonme.com`

**Important Files:**
- `DEPLOY_TO_RENDER.md` - Backend deployment guide
- `DEPLOY_TO_VERCEL.md` - Frontend deployment guide
- `PRODUCTION_DEPLOYMENT.md` - Full production guide

