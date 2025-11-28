# ⚡ Quick Deploy to www.shotonme.com (5 Minutes)

## Step 1: Deploy Backend to Render (2 min)

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Name:** `shot-on-me-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Add environment variables (copy from your `backend/.env`)
6. Click "Create Web Service"
7. **Copy the URL** (e.g., `https://shot-on-me-backend.onrender.com`)

## Step 2: Deploy Frontend to Vercel (2 min)

1. Go to https://vercel.com and sign up
2. Click "Add New..." → "Project"
3. Import your GitHub repo
4. Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `shot-on-me`
5. Add Environment Variable:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://shot-on-me-backend.onrender.com/api` (use your Render URL)
6. Click "Deploy"
7. **Copy the Vercel URL** (e.g., `https://shot-on-me.vercel.app`)

## Step 3: Connect Domain (1 min)

### In Vercel:
1. Go to your project → Settings → Domains
2. Add: `www.shotonme.com`
3. Vercel shows DNS instructions

### In GoDaddy:
1. Log into GoDaddy
2. Go to DNS Management
3. Add CNAME record:
   - **Type:** CNAME
   - **Name:** `www`
   - **Value:** `cname.vercel-dns.com` (or what Vercel shows)
4. Add A record:
   - **Type:** A
   - **Name:** `@`
   - **Value:** `76.76.21.21` (check Vercel for current IP)

## Step 4: Wait & Test

- Wait 5-30 minutes for DNS
- Visit `https://www.shotonme.com`
- Done! 🎉

---

## Update Backend CORS

After deployment, update `backend/server.js`:

```javascript
const corsOptions = {
  origin: [
    'https://www.shotonme.com',
    'https://shotonme.com',
    'https://shot-on-me.vercel.app'
  ],
  credentials: true
}
```

Then redeploy backend on Render.

---

**That's it! Your app is live at www.shotonme.com! 🚀**

