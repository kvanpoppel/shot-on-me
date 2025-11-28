# Production Deployment Guide for shotonme.com

## Your Domain
- **Domain:** `www.shotonme.com`
- **Registrar:** GoDaddy

## Recommended Production Architecture

### Option 1: Modern Serverless (Recommended)
- **Frontend Apps (Venue Portal & Shot On Me):** Vercel
- **Backend API:** Railway or Render
- **Database:** MongoDB Atlas (already set up ✅)
- **Domain:** Point GoDaddy DNS to Vercel

### Option 2: Traditional Hosting
- **All Services:** DigitalOcean, AWS, or Azure
- **Domain:** Point GoDaddy DNS to your server

---

## Step-by-Step: Vercel + Railway Setup

### 1. Deploy Backend API to Railway

1. **Sign up at [Railway.app](https://railway.app)** (or use Render.com)
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select your repository** and choose the `backend` folder
4. **Add Environment Variables:**
   ```env
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_production_jwt_secret
   FRONTEND_URL=https://www.shotonme.com,https://portal.shotonme.com
   HOST=0.0.0.0
   
   # Your existing API keys
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```
5. **Railway will provide a URL** like: `https://your-backend.railway.app`
6. **Note this URL** - you'll use it in the frontend configs

### 2. Deploy Venue Portal to Vercel

1. **Sign up at [Vercel.com](https://vercel.com)**
2. **Import your GitHub repository**
3. **Configure Project:**
   - **Root Directory:** `venue-portal`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```
5. **Deploy** - Vercel will give you a URL like `venue-portal.vercel.app`

### 3. Deploy Shot On Me App to Vercel

1. **Create another Vercel project** from the same repo
2. **Configure Project:**
   - **Root Directory:** `shot-on-me`
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
3. **Add Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```
4. **Deploy** - Vercel will give you a URL like `shot-on-me.vercel.app`

### 4. Configure GoDaddy DNS for Your Domain

You have two options for domain setup:

#### Option A: Single Domain (www.shotonme.com → Shot On Me App)
- Main app at `www.shotonme.com`
- Venue portal at `portal.shotonme.com` (subdomain)

#### Option B: Separate Domains
- Shot On Me: `www.shotonme.com`
- Venue Portal: `portal.shotonme.com` or separate domain

**DNS Configuration in GoDaddy:**

1. **Log into GoDaddy** → Go to DNS Management
2. **Add/Edit DNS Records:**

   For `www.shotonme.com` (Shot On Me App):
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```

   For `portal.shotonme.com` (Venue Portal):
   ```
   Type: CNAME
   Name: portal
   Value: cname.vercel-dns.com
   TTL: 600
   ```

   For root domain `shotonme.com`:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel's IP - check Vercel docs for current IP)
   TTL: 600
   ```

3. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Add `www.shotonme.com` and `shotonme.com`
   - Add `portal.shotonme.com` for venue portal
   - Vercel will provide DNS instructions

### 5. Update Backend CORS for Production

Update `backend/server.js` CORS configuration to include your production domains:

```javascript
const allowedOrigins = [
  'https://www.shotonme.com',
  'https://shotonme.com',
  'https://portal.shotonme.com',
  process.env.FRONTEND_URL,
  process.env.VENUE_PORTAL_URL,
  process.env.SHOT_ON_ME_URL
].filter(Boolean);
```

### 6. Enable HTTPS/SSL

- **Vercel:** Automatically provides SSL certificates (free)
- **Railway:** Automatically provides SSL certificates (free)
- **GoDaddy:** If hosting directly, you'll need an SSL certificate

---

## Environment Variables Summary

### Production Backend (Railway)
```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://... (your Atlas connection)
JWT_SECRET=strong_random_secret_here
FRONTEND_URL=https://www.shotonme.com,https://portal.shotonme.com
# ... all your API keys
```

### Production Venue Portal (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

### Production Shot On Me (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## Post-Deployment Checklist

- [ ] Backend API is accessible and responding
- [ ] Frontend apps are deployed and accessible
- [ ] DNS records are configured in GoDaddy
- [ ] SSL certificates are active (HTTPS working)
- [ ] CORS is configured correctly
- [ ] Environment variables are set in production
- [ ] MongoDB Atlas allows connections from Railway IPs
- [ ] Test user registration/login
- [ ] Test API endpoints
- [ ] Update Stripe webhook URLs to production
- [ ] Test SMS notifications (Twilio)
- [ ] Test file uploads (Cloudinary)

---

## Cost Estimates

### Free Tier (Good for Starting)
- **Vercel:** Free (hobby plan)
- **Railway:** $5/month (or free trial)
- **MongoDB Atlas:** Free tier available
- **GoDaddy:** Already paid ✅
- **Total:** ~$5-10/month

### Production Scale
- **Vercel Pro:** $20/month
- **Railway Pro:** $20/month
- **MongoDB Atlas:** $9-25/month (depending on usage)
- **Total:** ~$50-75/month

---

## Alternative: Deploy Everything to One Server

If you prefer traditional hosting:

1. **Get a VPS** (DigitalOcean, Linode, AWS EC2)
2. **Install Node.js, PM2, Nginx**
3. **Deploy all three apps** to the same server
4. **Use Nginx as reverse proxy** for routing
5. **Point GoDaddy DNS** to your server IP

**Nginx Configuration Example:**
```nginx
# Shot On Me App
server {
    listen 80;
    server_name www.shotonme.com shotonme.com;
    location / {
        proxy_pass http://localhost:3001;
    }
}

# Venue Portal
server {
    listen 80;
    server_name portal.shotonme.com;
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Backend API
server {
    listen 80;
    server_name api.shotonme.com;
    location / {
        proxy_pass http://localhost:5000;
    }
}
```

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **GoDaddy DNS Help:** https://www.godaddy.com/help
- **MongoDB Atlas:** https://docs.atlas.mongodb.com

---

## Security Reminders

⚠️ **Before going live:**
1. Use strong, unique JWT secrets
2. Enable MongoDB Atlas IP whitelist
3. Use production Stripe keys (not test keys)
4. Set up proper error logging (Sentry, LogRocket)
5. Enable rate limiting on API
6. Set up monitoring (UptimeRobot, Pingdom)
7. Regular backups of MongoDB

