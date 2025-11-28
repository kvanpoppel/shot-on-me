# 🌐 Deploy Shot On Me to www.shotonme.com

This guide will help you deploy your app to your GoDaddy domain so users can access it at `www.shotonme.com` instead of an IP address.

## 🎯 Best Options

### Option 1: Vercel (Frontend) + Render (Backend) - **RECOMMENDED** ⭐
**Best for:** Easy setup, free tier, automatic HTTPS, professional hosting

### Option 2: Deploy Everything to Render
**Best for:** Everything in one place, simpler management

### Option 3: Your Own Server/VPS
**Best for:** Full control, custom setup

---

## 🚀 Option 1: Vercel + Render (Recommended)

### Step 1: Deploy Backend to Render

1. **Sign up at Render:** https://render.com (free tier available)

2. **Create a new Web Service:**
   - Connect your GitHub repository
   - Select the `backend` folder
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: `Node`

3. **Add Environment Variables in Render:**
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```

4. **Deploy!** Render will give you a URL like: `https://shot-on-me-backend.onrender.com`

### Step 2: Deploy Frontend to Vercel

1. **Sign up at Vercel:** https://vercel.com (free tier available)

2. **Import your project:**
   - Connect your GitHub repository
   - Select the `shot-on-me` folder
   - Framework Preset: `Next.js`

3. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://shot-on-me-backend.onrender.com/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Deploy!** Vercel will give you a URL like: `https://shot-on-me.vercel.app`

### Step 3: Connect Your GoDaddy Domain

#### For Vercel (Frontend):

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Add `www.shotonme.com` and `shotonme.com`
   - Vercel will show you DNS records to add

2. **In GoDaddy DNS Settings:**
   - Log into GoDaddy
   - Go to DNS Management for `shotonme.com`
   - Add these records:
     ```
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     
     Type: A
     Name: @
     Value: 76.76.21.21 (Vercel's IP - check Vercel dashboard for current IP)
     ```

3. **Wait for DNS propagation** (5-30 minutes)

#### For Render (Backend):

1. **In Render Dashboard:**
   - Go to your service → Settings → Custom Domains
   - Add `api.shotonme.com`
   - Render will show you DNS records

2. **In GoDaddy DNS:**
   - Add CNAME record:
     ```
     Type: CNAME
     Name: api
     Value: (Render's CNAME value)
     ```

3. **Update Frontend Environment Variable:**
   - In Vercel, update `NEXT_PUBLIC_API_URL` to: `https://api.shotonme.com/api`

### Step 4: Update Backend CORS

Update `backend/server.js` to allow your domain:

```javascript
const corsOptions = {
  origin: [
    'https://www.shotonme.com',
    'https://shotonme.com',
    'https://shot-on-me.vercel.app', // Keep Vercel URL as fallback
  ],
  credentials: true
}
```

---

## 🚀 Option 2: Deploy Everything to Render

### Step 1: Deploy Backend (same as Option 1)

### Step 2: Deploy Frontend to Render

1. **Create a new Static Site in Render:**
   - Connect GitHub repo
   - Build Command: `cd shot-on-me && npm install && npm run build`
   - Publish Directory: `shot-on-me/.next`

2. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   ```

3. **Add Custom Domain:**
   - In Render, add `www.shotonme.com`
   - Follow DNS instructions

### Step 3: Configure DNS in GoDaddy

Add the DNS records that Render provides.

---

## 🚀 Option 3: Your Own Server/VPS

If you have a VPS or server:

### Step 1: Set Up Nginx Reverse Proxy

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx Config** (`/etc/nginx/sites-available/shotonme.com`):
   ```nginx
   server {
       listen 80;
       server_name www.shotonme.com shotonme.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   server {
       listen 80;
       server_name api.shotonme.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/shotonme.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 2: Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d www.shotonme.com -d shotonme.com -d api.shotonme.com
```

### Step 3: Configure DNS in GoDaddy

Point your domain to your server's IP:
```
Type: A
Name: @
Value: YOUR_SERVER_IP

Type: A
Name: www
Value: YOUR_SERVER_IP

Type: A
Name: api
Value: YOUR_SERVER_IP
```

---

## 📝 Quick Setup Checklist

- [ ] Deploy backend to Render/VPS
- [ ] Deploy frontend to Vercel/Render/VPS
- [ ] Get backend URL (e.g., `https://api.shotonme.com`)
- [ ] Update frontend environment variable with backend URL
- [ ] Add domain in hosting provider
- [ ] Configure DNS in GoDaddy
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Test `https://www.shotonme.com`
- [ ] Update CORS settings in backend
- [ ] Test on mobile device

---

## 🔒 Important: HTTPS Required

**PWAs require HTTPS!** Make sure:
- ✅ Vercel/Render automatically provide HTTPS
- ✅ If using your own server, set up Let's Encrypt SSL
- ✅ Update all API URLs to use `https://`

---

## 🎯 Recommended: Start with Vercel + Render

**Why?**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy domain connection
- ✅ Professional hosting
- ✅ Auto-deploy from GitHub
- ✅ No server management needed

**Cost:**
- Vercel: Free for personal projects
- Render: Free tier (spins down after inactivity, but free!)

---

## 🆘 Troubleshooting

### "Domain not connecting"
- Wait 30 minutes for DNS propagation
- Check DNS records are correct in GoDaddy
- Verify domain is added in hosting provider

### "Mixed content errors"
- Make sure all URLs use `https://`
- Check environment variables are set correctly

### "CORS errors"
- Update backend CORS to include your domain
- Make sure backend URL is correct in frontend

---

## 📞 Need Help?

1. **Vercel Docs:** https://vercel.com/docs
2. **Render Docs:** https://render.com/docs
3. **GoDaddy DNS Help:** https://www.godaddy.com/help

---

**Once deployed, users can access your app at `www.shotonme.com`! 🎉**

