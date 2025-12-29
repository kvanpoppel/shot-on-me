# ⚡ Quick Deployment Guide - www.shotonme.com

## 🎯 What You Need

1. **GitHub Repository** - Your code pushed to GitHub
2. **Vercel Account** - Free at [vercel.com](https://vercel.com)
3. **Render Account** - Free at [render.com](https://render.com)
4. **GoDaddy Account** - Your domain: shotonme.com

---

## 📝 Step-by-Step (15 minutes)

### Step 1: Push Code to GitHub (2 min)

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Deploy Backend to Render (5 min)

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `shot-on-me-venue-portal`
4. Configure:
   - **Name:** `shot-on-me-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Add Environment Variables** (click "Advanced"):
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=[your MongoDB Atlas connection string]
   JWT_SECRET=[your JWT secret]
   FRONTEND_URL=https://www.shotonme.com
   [Add all other env vars from backend/.env]
   ```
6. Click **"Create Web Service"**
7. Wait for deployment (5-10 min)
8. **Copy your backend URL:** `https://shot-on-me-backend.onrender.com`

### Step 3: Deploy Frontend to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import: `shot-on-me-venue-portal`
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `shot-on-me`
   - **Build Command:** `npm run build` (default)
5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
   NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
   ```
   *(Note: Use api.shotonme.com - we'll set that up next)*
6. Click **"Deploy"**
7. Wait for build (3-5 min)
8. **Copy your Vercel URL:** `https://shot-on-me-venue-portal.vercel.app`

### Step 4: Add Custom Domains (3 min)

#### In Render (Backend):
1. Render Dashboard → Your service → Settings → Custom Domains
2. Add: `api.shotonme.com`
3. **Copy the CNAME value** (e.g., `shot-on-me-backend.onrender.com`)

#### In Vercel (Frontend):
1. Vercel Dashboard → Your project → Settings → Domains
2. Add: `www.shotonme.com`
3. Add: `shotonme.com`
4. **Copy the DNS records** Vercel shows you

### Step 5: Configure DNS in GoDaddy (5 min)

1. Log into [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains** → `shotonme.com` → **DNS**
3. Add/Update these records:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600

Type: A
Name: @
Value: 76.76.21.21
TTL: 600
(Check Vercel dashboard for exact IP if this doesn't work)

Type: CNAME
Name: api
Value: [The CNAME value from Render - e.g., shot-on-me-backend.onrender.com]
TTL: 600
```

4. **Save** and wait 10-30 minutes for DNS propagation

### Step 6: Update Environment Variables

#### In Vercel:
Once DNS is working, update:
```
NEXT_PUBLIC_API_URL=https://api.shotonme.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.shotonme.com
```

#### In Render:
Update if needed:
```
FRONTEND_URL=https://www.shotonme.com
```

### Step 7: Test (2 min)

1. Wait 10-30 minutes after DNS changes
2. Visit: `https://www.shotonme.com`
3. Test registration/login
4. Check browser console for errors

---

## ✅ Success Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] DNS records added in GoDaddy
- [ ] www.shotonme.com loads
- [ ] api.shotonme.com responds
- [ ] Can register new user
- [ ] Can login
- [ ] Wallet features work

---

## 🆘 Quick Troubleshooting

**Domain not loading?**
- Wait 30 minutes for DNS
- Check DNS at [dnschecker.org](https://dnschecker.org)

**CORS errors?**
- Verify backend CORS includes www.shotonme.com
- Check environment variables

**API not working?**
- Check Render service is running
- Verify environment variables set

---

## 📞 Need Help?

See full guide: `DEPLOY_TO_SHOTONME_DOMAIN.md`

