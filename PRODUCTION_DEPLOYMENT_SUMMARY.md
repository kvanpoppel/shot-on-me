# 🚀 Production Deployment Summary - www.shotonme.com

## ✅ What's Been Updated

### Code Changes Made:
1. ✅ **API URLs Updated** - `shot-on-me/app/utils/api.ts`
   - Production now uses: `https://api.shotonme.com/api`
   - WebSocket uses: `wss://api.shotonme.com`

2. ✅ **CORS Updated** - `backend/server.js`
   - Added `https://api.shotonme.com` to allowed origins
   - Already includes `https://www.shotonme.com` and `https://shotonme.com`

3. ✅ **Deployment Guides Created**
   - `DEPLOY_TO_SHOTONME_DOMAIN.md` - Complete detailed guide
   - `DEPLOYMENT_QUICK_START.md` - Quick 15-minute guide

---

## 📋 Deployment Checklist

### Before You Start:
- [ ] All code committed to GitHub
- [ ] MongoDB Atlas connection string ready
- [ ] All API keys ready (Stripe, Twilio, Cloudinary, Google Maps)
- [ ] JWT secret ready

### Step 1: Deploy Backend (Render)
- [ ] Create Render account
- [ ] Create Web Service
- [ ] Set Root Directory: `backend`
- [ ] Add all environment variables
- [ ] Deploy and get URL
- [ ] Add custom domain: `api.shotonme.com`
- [ ] Copy CNAME value for DNS

### Step 2: Deploy Frontend (Vercel)
- [ ] Create Vercel account
- [ ] Import GitHub repository
- [ ] Set Root Directory: `shot-on-me`
- [ ] Add environment variables:
  - `NEXT_PUBLIC_API_URL=https://api.shotonme.com/api`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`
  - `NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com`
- [ ] Deploy and get URL
- [ ] Add custom domains: `www.shotonme.com` and `shotonme.com`

### Step 3: Configure DNS (GoDaddy)
- [ ] Add CNAME for `www` → Vercel
- [ ] Add A record for `@` → Vercel IP
- [ ] Add CNAME for `api` → Render
- [ ] Wait 10-30 minutes for propagation

### Step 4: Test
- [ ] Visit `https://www.shotonme.com`
- [ ] Test registration
- [ ] Test login
- [ ] Test wallet features
- [ ] Check browser console for errors

---

## 🔧 Environment Variables Reference

### Backend (Render):
```
PORT=5000
NODE_ENV=production
MONGODB_URI=[MongoDB Atlas connection string]
JWT_SECRET=[Your JWT secret]
FRONTEND_URL=https://www.shotonme.com
TWILIO_ACCOUNT_SID=[Your Twilio SID]
TWILIO_AUTH_TOKEN=[Your Twilio token]
TWILIO_PHONE_NUMBER=[Your Twilio number]
CLOUDINARY_CLOUD_NAME=[Your Cloudinary name]
CLOUDINARY_API_KEY=[Your Cloudinary key]
CLOUDINARY_API_SECRET=[Your Cloudinary secret]
STRIPE_SECRET_KEY=[Your Stripe secret key]
STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]
```

### Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[Your Google Maps key]
NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
```

---

## 🌐 Final URLs

After deployment:
- **Frontend:** https://www.shotonme.com
- **Backend API:** https://api.shotonme.com/api
- **WebSocket:** wss://api.shotonme.com

---

## 📚 Documentation

- **Full Guide:** See `DEPLOY_TO_SHOTONME_DOMAIN.md`
- **Quick Start:** See `DEPLOYMENT_QUICK_START.md`

---

## 🎉 Ready to Deploy!

Follow the guides above to get your app live at www.shotonme.com!

