# ✅ VERCEL SETUP - Before Deploying

**Yes, you need to set up environment variables in Vercel BEFORE deploying!**

---

## 📋 STEP 1: Go to Vercel Dashboard

1. Go to: https://vercel.com
2. Sign in to your account
3. If you haven't imported your project yet:
   - Click **"Add New..."** → **"Project"**
   - Import: `kvanpoppel/shot-on-me-venue-portal` (or your repo)
   - **Root Directory:** `shot-on-me`
   - **Framework:** Next.js (auto-detected)

---

## 📋 STEP 2: Add Environment Variables

**Before deploying, add these environment variables:**

### Go to: Project Settings → Environment Variables

1. Click on your project (or create new)
2. Go to **"Settings"** tab
3. Click **"Environment Variables"** in left sidebar

---

## 🔴 REQUIRED Environment Variables

Add these 4 variables:

### Variable 1: NEXT_PUBLIC_API_URL
- **Key:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://shot-on-me.onrender.com/api`
- **Environments:** Production, Preview, Development (check all)
- Click **"Save"**

### Variable 2: NEXT_PUBLIC_SOCKET_URL
- **Key:** `NEXT_PUBLIC_SOCKET_URL`
- **Value:** `https://shot-on-me.onrender.com`
- **Environments:** Production, Preview, Development (check all)
- Click **"Save"**

### Variable 3: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- **Key:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Value:** `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`
- **Environments:** Production, Preview, Development (check all)
- Click **"Save"**

### Variable 4: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Key:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Value:** `pk_test_51SF1jnAFRpWPINtQ4SzB5vIXQoCsUw0vhD6qZFYi5Ljb5XC1ywZbBEoTovt0I8GAzNpyWsjWlwUcW5jgp0dZLWBu00i`
- **Environments:** Production, Preview, Development (check all)
- Click **"Save"**

---

## ✅ STEP 3: Verify Project Settings

### Check Root Directory:
1. Go to **"Settings"** → **"General"**
2. **Root Directory:** Should be `shot-on-me`
3. If not, update it

### Check Build Settings:
1. **Framework Preset:** Next.js
2. **Build Command:** `npm run build` (auto-detected)
3. **Output Directory:** `.next` (auto-detected)
4. **Install Command:** `npm install` (auto-detected)

---

## 🚀 STEP 4: Deploy

**After adding environment variables:**

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** (if project exists)
   - OR
   - Click **"Deploy"** (if new project)
3. Wait for build to complete (3-5 minutes)

---

## ✅ STEP 5: Update Render Backend

**After Vercel deploys, get your frontend URL:**

1. Vercel Dashboard → Your project
2. Copy the deployment URL (e.g., `https://shot-on-me-venue-portal.vercel.app`)

3. **Go back to Render:**
   - Environment tab
   - Update `FRONTEND_URL` to your Vercel URL
   - Service will auto-redeploy

---

## 📋 QUICK CHECKLIST

**Before deploying to Vercel:**
- [ ] Added `NEXT_PUBLIC_API_URL`
- [ ] Added `NEXT_PUBLIC_SOCKET_URL`
- [ ] Added `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Root Directory set to `shot-on-me`
- [ ] All variables checked for Production, Preview, Development

**After Vercel deploys:**
- [ ] Copy Vercel deployment URL
- [ ] Update `FRONTEND_URL` in Render
- [ ] Test frontend connects to backend

---

## 🎯 YOUR VALUES SUMMARY

**Backend URL (Render):**
```
https://shot-on-me.onrender.com
```

**Frontend API URL:**
```
https://shot-on-me.onrender.com/api
```

**Socket URL:**
```
https://shot-on-me.onrender.com
```

**Google Maps Key:**
```
AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
```

**Stripe Publishable Key:**
```
pk_test_51SF1jnAFRpWPINtQ4SzB5vIXQoCsUw0vhD6qZFYi5Ljb5XC1ywZbBEoTovt0I8GAzNpyWsjWlwUcW5jgp0dZLWBu00i
```

---

## ⚠️ IMPORTANT NOTES

1. **Environment Variables Must Be Set BEFORE First Deploy**
   - If you deploy without them, the build will fail or app won't work
   - You'll need to redeploy after adding variables

2. **Check All Environments**
   - When adding variables, check:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

3. **Root Directory**
   - Must be `shot-on-me` (not root of repo)
   - This tells Vercel where your Next.js app is

---

**Set up these variables in Vercel, then deploy! 🚀**

