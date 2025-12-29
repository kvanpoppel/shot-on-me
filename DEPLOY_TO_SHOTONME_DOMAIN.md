# 🚀 Deploy Shot On Me to www.shotonme.com

Complete step-by-step guide to deploy your application to your GoDaddy domain.

## 📋 Prerequisites

- [ ] GitHub account](https://github.com) (free)
- [ ] [Vercel account](https://vercel.com) (free)
- [ ] [Render account](https://render.com) (free)
- [ ] GoDaddy account with `shotonme.com` domain
- [ ] MongoDB Atlas account (or your MongoDB connection string)

---

## 🎯 Deployment Strategy

**Frontend (shot-on-me):** Deploy to **Vercel** → Connect to `www.shotonme.com`  
**Backend (API):** Deploy to **Render** → Connect to `api.shotonme.com`

**Why this setup?**
- ✅ Free tier available for both
- ✅ Automatic HTTPS/SSL certificates
- ✅ Easy domain connection
- ✅ Auto-deploy from GitHub
- ✅ Professional hosting

---

## Step 1: Prepare Your Code for Deployment

### 1.1 Push Code to GitHub

If you haven't already, create a GitHub repository and push your code:

```powershell
# Initialize git if not already done
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/shot-on-me-venue-portal.git
git branch -M main
git push -u origin main
```

### 1.2 Create Production Environment Files

Create these files but **DO NOT commit them to GitHub** (they're in .gitignore):

**`shot-on-me/.env.production`** (for local reference only):
```env
NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
```

**`backend/.env.production`** (for local reference only):
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=https://www.shotonme.com

# Add all your other environment variables here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Connect your GitHub account

### 2.2 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your repository: `shot-on-me-venue-portal`
3. Configure the service:
   - **Name:** `shot-on-me-backend`
   - **Environment:** `Node`
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node server.js`)

### 2.3 Add Environment Variables

In Render dashboard → Your service → Environment:
```
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=https://www.shotonme.com
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### 2.4 Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://shot-on-me-backend.onrender.com`

### 2.5 Add Custom Domain (api.shotonme.com)

1. In Render → Your service → Settings → Custom Domains
2. Click **"Add Custom Domain"**
3. Enter: `api.shotonme.com`
4. Render will show you DNS records to add (save these for Step 4)

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

### 3.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Import: `shot-on-me-venue-portal`
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `shot-on-me`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### 3.3 Add Environment Variables

In Vercel → Your project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
```

**Important:** Add these for **Production**, **Preview**, and **Development** environments.

### 3.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait for build (3-5 minutes)
3. Note your Vercel URL: `https://shot-on-me-venue-portal.vercel.app`

### 3.5 Add Custom Domain

1. In Vercel → Your project → Settings → Domains
2. Click **"Add Domain"**
3. Enter: `www.shotonme.com`
4. Also add: `shotonme.com` (without www)
5. Vercel will show DNS records (save for Step 4)

---

## Step 4: Configure DNS in GoDaddy

### 4.1 Access GoDaddy DNS Management

1. Log into [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains**
3. Click on `shotonme.com`
4. Click **"DNS"** or **"Manage DNS"**

### 4.2 Add DNS Records

Add these records (remove or update any conflicting ones):

#### For Frontend (www.shotonme.com):

**Option A: CNAME (Recommended)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600 (or Auto)
```

**Option B: A Record (if CNAME doesn't work)**
```
Type: A
Name: www
Value: 76.76.21.21
TTL: 600
```
*(Check Vercel dashboard for current IP if this doesn't work)*

#### For Root Domain (shotonme.com):

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600
```
*(Vercel will provide the exact IP in their dashboard)*

#### For Backend API (api.shotonme.com):

Use the CNAME value that Render provided:
```
Type: CNAME
Name: api
Value: [Render's CNAME value - something like: shot-on-me-backend.onrender.com]
TTL: 600
```

### 4.3 Wait for DNS Propagation

- **Wait 5-30 minutes** for DNS changes to propagate
- Check status: [https://dnschecker.org](https://dnschecker.org)
- Enter `www.shotonme.com` and check if it resolves

---

## Step 5: Update Backend CORS

Update `backend/server.js` to ensure your domain is allowed:

```javascript
const corsOptions = {
  origin: [
    'https://www.shotonme.com',
    'https://shotonme.com',
    'https://api.shotonme.com',
    // Keep Vercel URL as fallback during testing
    'https://shot-on-me-venue-portal.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**Commit and push this change** - it will auto-deploy.

---

## Step 6: Update Frontend API URLs

### 6.1 Update Socket URL

Check `shot-on-me/app/contexts/SocketContext.tsx` and ensure it uses:
```typescript
NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
```

### 6.2 Verify API URL

Check `shot-on-me/app/utils/api.ts` uses:
```typescript
NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
```

---

## Step 7: Test Your Deployment

### 7.1 Test Frontend

1. Wait 10-30 minutes after DNS changes
2. Visit: `https://www.shotonme.com`
3. Should see your app loading

### 7.2 Test Backend API

1. Visit: `https://api.shotonme.com/api/health` (if you have a health endpoint)
2. Or test: `https://api.shotonme.com/api/auth/test`

### 7.3 Test Full Flow

1. Register a new user at `https://www.shotonme.com`
2. Login
3. Test wallet features
4. Check browser console for any errors

---

## Step 8: Final Configuration

### 8.1 Update Stripe Webhooks

If using Stripe, update webhook URLs:
- Old: `http://localhost:5000/api/payments/webhook`
- New: `https://api.shotonme.com/api/payments/webhook`

### 8.2 Update Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Edit your API key
4. Add to **HTTP referrers:**
   - `https://www.shotonme.com/*`
   - `https://shotonme.com/*`

### 8.3 Update MongoDB Atlas

1. Go to MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allows Render's IPs)
   - Or add specific Render IPs if you prefer

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in both platforms
- [ ] DNS records added in GoDaddy
- [ ] DNS propagated (checked with dnschecker.org)
- [ ] Frontend accessible at www.shotonme.com
- [ ] Backend accessible at api.shotonme.com
- [ ] CORS updated in backend
- [ ] Stripe webhooks updated
- [ ] Google Maps API key updated
- [ ] MongoDB Atlas network access configured
- [ ] Tested user registration
- [ ] Tested login
- [ ] Tested wallet features
- [ ] Tested on mobile device

---

## 🆘 Troubleshooting

### "Domain not connecting"
- Wait 30-60 minutes for DNS propagation
- Check DNS records are correct in GoDaddy
- Verify domain added in Vercel/Render
- Use [dnschecker.org](https://dnschecker.org) to check DNS

### "CORS errors"
- Verify backend CORS includes your domain
- Check `FRONTEND_URL` in backend environment variables
- Ensure API URL is correct in frontend

### "API not responding"
- Check Render service is running (not sleeping)
- Verify environment variables are set
- Check Render logs for errors

### "Mixed content errors"
- Ensure all URLs use `https://`
- Check environment variables use HTTPS
- Update any hardcoded `http://` URLs

### "Build fails on Vercel"
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Ensure Node.js version is compatible

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs
- **GoDaddy DNS Help:** https://www.godaddy.com/help/manage-dns-680
- **DNS Checker:** https://dnschecker.org

---

## 🎉 Success!

Once deployed, your app will be live at:
- **Frontend:** https://www.shotonme.com
- **Backend API:** https://api.shotonme.com/api

Users can now access your app from anywhere! 🚀

