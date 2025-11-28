# 🚀 Quick Deployment Guide - Go Semi-Live Now!

This is your step-by-step guide to deploy to production using Render (backend) and Vercel (frontends).

## ⏱️ Estimated Time: 30-45 minutes

---

## Part 1: Deploy Backend to Render (15 minutes)

### Step 1: Prepare Your Code
```bash
# Make sure everything is committed
git add .
git commit -m "Ready for production deployment"
git push
```

### Step 2: Create Render Service

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Click "New +" → "Web Service"**
3. **Connect Repository:**
   - Connect your GitHub/GitLab account if needed
   - Select: `shot-on-me-venue-portal`
   - Click "Connect"

4. **Configure Service:**
   ```
   Name: shot-on-me-backend
   Region: Oregon (US West) [or closest to you]
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

5. **Click "Advanced" → Set Node Version:**
   - Check your local version: `node -v`
   - Set to `18` or `20` (match your local)

6. **Click "Create Web Service"**

### Step 3: Add Environment Variables

**In Render Dashboard → Your Service → Environment:**

Add these variables (click "Add Environment Variable" for each):

```env
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=generate_a_strong_random_secret_here
FRONTEND_URL=https://www.shotonme.com,https://portal.shotonme.com
```

**Then add your API keys:**
```env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
```

**💡 Tip:** Generate a new JWT_SECRET for production:
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Step 4: Wait for Deployment

- Render will build and deploy (2-5 minutes)
- Watch the logs to ensure it starts successfully
- **Save your backend URL:** `https://your-service.onrender.com`

### Step 5: Test Backend

Open in browser:
```
https://your-service.onrender.com/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

✅ **Backend is live!**

---

## Part 2: Deploy to Vercel (20 minutes)

### Step 1: Sign Up / Log In

1. Go to https://vercel.com
2. Click "Sign Up" (or "Log In")
3. **Connect GitHub** (or GitLab/Bitbucket)

### Step 2: Deploy Venue Portal

1. **Click "Add New..." → "Project"**
2. **Import Repository:**
   - Select: `shot-on-me-venue-portal`
   - Click "Import"

3. **Configure:**
   ```
   Project Name: venue-portal
   Framework: Next.js (auto-detected)
   Root Directory: venue-portal ⚠️ IMPORTANT
   Build Command: npm run build (default)
   Output Directory: .next (default)
   ```

4. **Environment Variables:**
   - Click "Environment Variables"
   - Add:
     ```
     Name: NEXT_PUBLIC_API_URL
     Value: https://your-backend.onrender.com/api
     ```
   - Replace with your actual Render backend URL!

5. **Click "Deploy"**
6. **Wait 2-3 minutes**
7. **Note the URL:** `venue-portal.vercel.app`

### Step 3: Deploy Shot On Me App

1. **Click "Add New..." → "Project"** (again)
2. **Import Same Repository:**
   - Select: `shot-on-me-venue-portal`
   - Click "Import"

3. **Configure:**
   ```
   Project Name: shot-on-me
   Framework: Next.js
   Root Directory: shot-on-me ⚠️ IMPORTANT
   Build Command: npm run build
   Output Directory: .next
   ```

4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

5. **Click "Deploy"**
6. **Wait 2-3 minutes**
7. **Note the URL:** `shot-on-me.vercel.app`

✅ **Frontends are live!**

---

## Part 3: Configure Custom Domains (10 minutes)

### Step 1: Add Domains in Vercel

**For Shot On Me App:**
1. Go to Shot On Me project → Settings → Domains
2. Click "Add Domain"
3. Enter: `www.shotonme.com`
4. Click "Add"
5. **Note the CNAME value** Vercel shows

**For Venue Portal:**
1. Go to Venue Portal project → Settings → Domains
2. Click "Add Domain"
3. Enter: `portal.shotonme.com`
4. Click "Add"
5. **Note the CNAME value**

### Step 2: Update GoDaddy DNS

1. **Log into GoDaddy**
2. **Go to DNS Management** for `shotonme.com`
3. **Add/Edit Records:**

   **For www.shotonme.com:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com (or what Vercel shows)
   TTL: 600
   ```

   **For portal.shotonme.com:**
   ```
   Type: CNAME
   Name: portal
   Value: cname.vercel-dns.com (or what Vercel shows)
   TTL: 600
   ```

   **For root domain (shotonme.com):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (check Vercel docs for current IP)
   TTL: 600
   ```

4. **Save changes**

### Step 3: Wait for DNS Propagation

- Usually takes 5-60 minutes
- Can take up to 48 hours (rare)
- Check status: https://dnschecker.org

### Step 4: Update Backend CORS

1. **Go to Render Dashboard**
2. **Your Backend Service → Environment**
3. **Update FRONTEND_URL:**
   ```env
   FRONTEND_URL=https://www.shotonme.com,https://shotonme.com,https://portal.shotonme.com
   ```
4. **Save** (Render will auto-redeploy)

---

## Part 4: Test Everything ✅

### Test URLs:
- ✅ `https://www.shotonme.com` → Should load Shot On Me app
- ✅ `https://portal.shotonme.com` → Should load Venue Portal
- ✅ `https://your-backend.onrender.com/api/health` → Should return OK

### Test Functionality:
1. **Open Shot On Me app**
2. **Try to register a new user**
3. **Check browser console** (F12) for errors
4. **Check Network tab** - API calls should work

---

## 🎉 You're Semi-Live!

Your app is now accessible at:
- **Shot On Me:** https://www.shotonme.com
- **Venue Portal:** https://portal.shotonme.com
- **Backend API:** https://your-backend.onrender.com

---

## 📋 Next Steps

1. ✅ Test all features thoroughly
2. ✅ Monitor error logs in Render and Vercel
3. ✅ Set up monitoring (optional: UptimeRobot)
4. ✅ Update any hardcoded URLs
5. ✅ Prepare for full launch!

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check Render logs
- Verify environment variables are set
- Check MongoDB connection string

**Frontend build fails?**
- Check Vercel build logs
- Verify Root Directory is correct
- Check environment variables

**Domain not working?**
- Wait for DNS propagation
- Verify DNS records in GoDaddy
- Check Vercel domain status

**CORS errors?**
- Verify FRONTEND_URL includes your domains
- Check backend CORS configuration
- Ensure domains use HTTPS

---

## 📚 Detailed Guides

- `DEPLOY_TO_RENDER.md` - Detailed Render deployment
- `DEPLOY_TO_VERCEL.md` - Detailed Vercel deployment
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist

