# Deploy Frontends to Vercel - Step by Step

## Prerequisites
✅ Backend deployed to Render (you have the backend URL)
✅ Vercel account (sign up at https://vercel.com if needed)
✅ Your code is in a Git repository

## Step 1: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" (or "Log In" if you have an account)
3. **Connect your Git provider** (GitHub, GitLab, or Bitbucket)
4. Authorize Vercel to access your repositories

## Step 2: Deploy Venue Portal

### 2.1 Create New Project

1. **Click "Add New..." → "Project"**
2. **Import your repository:**
   - Select: `shot-on-me-venue-portal`
   - Click "Import"

### 2.2 Configure Project

1. **Project Settings:**
   - **Project Name:** `venue-portal` (or `shotonme-venue-portal`)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `venue-portal` ⚠️ **IMPORTANT**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

2. **Environment Variables:**
   Click "Environment Variables" and add:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   ```
   Replace `your-backend-url.onrender.com` with your actual Render backend URL!

3. **Click "Deploy"**

### 2.3 Wait for Deployment

- Vercel will build and deploy (usually 2-3 minutes)
- You'll get a URL like: `venue-portal.vercel.app`

## Step 3: Deploy Shot On Me App

### 3.1 Create Another Project

1. **Click "Add New..." → "Project"** (again)
2. **Import the same repository:**
   - Select: `shot-on-me-venue-portal`
   - Click "Import"

### 3.2 Configure Project

1. **Project Settings:**
   - **Project Name:** `shot-on-me` (or `shotonme-app`)
   - **Framework Preset:** Next.js
   - **Root Directory:** `shot-on-me` ⚠️ **IMPORTANT**
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

2. **Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```
   Replace with your actual values!

3. **Click "Deploy"**

### 3.3 Wait for Deployment

- You'll get a URL like: `shot-on-me.vercel.app`

## Step 4: Configure Custom Domains

### 4.1 Configure www.shotonme.com (Shot On Me App)

1. **In Vercel Dashboard:**
   - Go to your Shot On Me project
   - Click "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `www.shotonme.com`
   - Click "Add"

2. **Vercel will show DNS instructions:**
   - Note the CNAME value (usually `cname.vercel-dns.com`)

3. **In GoDaddy:**
   - Log into GoDaddy
   - Go to DNS Management for `shotonme.com`
   - Add/Edit CNAME record:
     ```
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com (or what Vercel shows)
     TTL: 600
     ```

4. **Wait for DNS propagation** (5-60 minutes)

### 4.2 Configure portal.shotonme.com (Venue Portal)

1. **In Vercel Dashboard:**
   - Go to your Venue Portal project
   - Click "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `portal.shotonme.com`
   - Click "Add"

2. **In GoDaddy:**
   - Add CNAME record:
     ```
     Type: CNAME
     Name: portal
     Value: cname.vercel-dns.com (or what Vercel shows)
     TTL: 600
     ```

### 4.3 Configure Root Domain (shotonme.com)

1. **In Vercel Dashboard:**
   - Go to your Shot On Me project
   - Add domain: `shotonme.com` (without www)

2. **In GoDaddy:**
   - Add A record (Vercel will provide the IP):
     ```
     Type: A
     Name: @
     Value: 76.76.21.21 (check Vercel docs for current IP)
     TTL: 600
     ```
   - OR use CNAME if GoDaddy supports it for root domain

## Step 5: Update Backend CORS

Once domains are configured, update your Render backend environment variables:

1. **Go to Render Dashboard:**
   - Your backend service → "Environment"
   - Update `FRONTEND_URL`:
     ```env
     FRONTEND_URL=https://www.shotonme.com,https://shotonme.com,https://portal.shotonme.com
     ```
   - Save and redeploy

## Step 6: Test Everything

### Test URLs:
- ✅ `https://www.shotonme.com` → Shot On Me App
- ✅ `https://portal.shotonme.com` → Venue Portal
- ✅ `https://your-backend.onrender.com/api/health` → Backend API

### Test Functionality:
1. **Register a new user** on Shot On Me app
2. **Login** to Venue Portal
3. **Check API calls** are working (open browser DevTools → Network tab)

## Troubleshooting

**Build fails?**
- Check Vercel build logs
- Ensure `package.json` has correct scripts
- Verify environment variables are set

**Domain not working?**
- Wait for DNS propagation (can take up to 48 hours, usually 5-60 minutes)
- Check DNS records in GoDaddy match Vercel's instructions
- Use https://dnschecker.org to verify DNS propagation

**API calls failing?**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS allows your domains
- Check browser console for specific errors

**SSL Certificate issues?**
- Vercel automatically provides SSL (HTTPS)
- Wait a few minutes after adding domain for SSL to provision

## Next Steps

Once everything is deployed:
1. ✅ Test all functionality
2. ✅ Monitor error logs
3. ✅ Set up monitoring (optional)
4. ✅ Configure backups
5. ✅ Update any hardcoded URLs in your code

