# 🔗 Complete Guide: Link Vercel + GoDaddy

## Step-by-Step Instructions

---

## PART 1: Fix Vercel Deployment (Fix 404 Error)

### Step 1: Update Project Settings in Vercel

1. **Go to Vercel Dashboard:** https://vercel.com
2. **Click on your project** (shot-on-me)
3. **Click "Settings"** (gear icon in top right)
4. **Click "General"** in left sidebar
5. **Scroll down to find "Root Directory"**
   - If you see it: Change from `./` to `shot-on-me`
   - If you DON'T see it: Continue to Step 2

### Step 2: Check Build Settings

1. **Still in Settings, click "Build & Development Settings"**
2. **Verify these settings:**
   - **Framework Preset:** Should be `Next.js`
   - **Build Command:** Should be `npm run build` (or `cd shot-on-me && npm run build`)
   - **Output Directory:** Should be `.next` (or `shot-on-me/.next`)
   - **Install Command:** Should be `npm install` (or `cd shot-on-me && npm install`)

### Step 3: Add Environment Variables

1. **In Settings, click "Environment Variables"**
2. **Add these two variables:**

   **Variable 1:**
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-backend-url.onrender.com/api`
     - Replace with your actual Render backend URL
     - If you haven't deployed backend yet, use: `https://shot-on-me-backend.onrender.com/api`
   - **Environment:** Select all (Production, Preview, Development)

   **Variable 2:**
   - **Key:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value:** `AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8`
   - **Environment:** Select all

3. **Click "Save"** for each variable

### Step 4: Redeploy

1. **Go to "Deployments" tab**
2. **Click the three dots (⋯) on the latest deployment**
3. **Click "Redeploy"**
4. **Wait for deployment to complete**
5. **Check if 404 is fixed** - Click "Visit" button

---

## PART 2: Add Domain in Vercel

### Step 1: Add Your Domain

1. **In Vercel, go to Settings → Domains**
2. **Click "Add Domain"** button
3. **Enter:** `www.shotonme.com`
4. **Click "Add"**
5. **Vercel will show you DNS instructions** - **WRITE THESE DOWN!**

### Step 2: Get DNS Records from Vercel

Vercel will show you something like:

**For www subdomain:**
- **Type:** CNAME
- **Name:** www
- **Value:** `cname.vercel-dns.com` (or similar)

**For root domain (@):**
- **Type:** A
- **Name:** @
- **Value:** `76.76.21.21` (IP address - check Vercel for current IP)

**OR** Vercel might just give you:
- **Type:** A
- **Name:** @
- **Value:** `76.76.21.21`

**IMPORTANT:** Write down exactly what Vercel shows you!

---

## PART 3: Configure GoDaddy DNS

### Step 1: Edit Existing A Record

1. **Go to GoDaddy DNS Management:** https://dcc.godaddy.com/control/dnsmanagement
2. **Find the A record** that says "WebsiteBuilder Site"
3. **Click the Edit icon** (pencil) on that record
4. **Update it:**
   - **Type:** Keep as `A`
   - **Name:** Keep as `@`
   - **Data/Value:** **Replace "WebsiteBuilder Site"** with the IP address from Vercel (e.g., `76.76.21.21`)
   - **TTL:** Keep as `1 Hour`
5. **Click "Save"**

### Step 2: Add CNAME for www

1. **Click "Add New Record"** button in GoDaddy
2. **Fill in the form:**
   - **Type:** Select `CNAME`
   - **Name:** Enter `www`
   - **Data/Value:** Enter the CNAME value from Vercel (e.g., `cname.vercel-dns.com`)
   - **TTL:** Select `1 Hour`
3. **Click "Save"**

### Step 3: Verify Your Records

After adding, your DNS records should look like:

```
Type    Name    Data                          TTL
A       @       76.76.21.21                   1 Hour
CNAME   www     cname.vercel-dns.com          1 Hour
NS      @       ns75.domaincontrol.com.       1 Hour
NS      @       ns76.domaincontrol.com.       1 Hour
```

**Note:** Don't change the NS records - those are correct!

---

## PART 4: Wait and Verify

### Step 1: Wait for DNS Propagation

- **Wait 5-30 minutes** for DNS to propagate
- Can take up to 24 hours (but usually much faster)

### Step 2: Check Status in Vercel

1. **Go back to Vercel → Settings → Domains**
2. **Look at `www.shotonme.com`**
3. **Status should show:**
   - ✅ "Valid Configuration" (green checkmark)
   - Or "Pending" (wait a bit longer)

### Step 3: Test Your Domain

1. **Wait 10-15 minutes after adding DNS records**
2. **Visit:** `https://www.shotonme.com`
3. **Your app should load!** 🎉

---

## 🆘 Troubleshooting

### "Invalid Configuration" in Vercel?

**Check:**
- DNS records match exactly what Vercel shows
- You saved changes in GoDaddy
- Wait longer for DNS propagation (up to 30 min)

**Fix:**
- Double-check the IP address and CNAME values
- Make sure they match exactly what Vercel shows
- Delete and re-add the records if needed

### Domain Not Loading?

**Check:**
- DNS has propagated: https://dnschecker.org
  - Enter `www.shotonme.com` and check if it resolves
- Vercel shows "Valid Configuration"
- You're using `https://` not `http://`

**Fix:**
- Clear browser cache
- Try incognito/private mode
- Wait longer for DNS

### Still Getting 404?

**Check:**
- Root Directory is set correctly in Vercel
- Build completed successfully (check Logs tab)
- Environment variables are set

**Fix:**
- Redeploy after fixing settings
- Check build logs for errors

### "Add Domain" Button Still Greyed Out?

**Check:**
- Deployment is successful (green checkmark)
- No build errors
- You're on the correct project

**Fix:**
- Fix any build errors first
- Try from main project page, not deployment page
- Make sure you're logged in to correct account

---

## ✅ Final Checklist

- [ ] Fixed Root Directory in Vercel (or build settings)
- [ ] Added environment variables in Vercel
- [ ] Redeployed and 404 is fixed
- [ ] Added `www.shotonme.com` domain in Vercel
- [ ] Got DNS records from Vercel
- [ ] Updated A record in GoDaddy (root domain)
- [ ] Added CNAME record in GoDaddy (www)
- [ ] Saved all changes in GoDaddy
- [ ] Waited 10-30 minutes for DNS propagation
- [ ] Verified in Vercel (shows "Valid Configuration")
- [ ] Tested `https://www.shotonme.com` - it works!

---

## 📝 Quick Reference

**Vercel Domain Settings:**
- Settings → Domains → Add Domain

**GoDaddy DNS:**
- DNS Management → Add New Record / Edit Record

**DNS Check:**
- https://dnschecker.org

**Vercel Status:**
- Settings → Domains → Check status

---

**Once DNS propagates, your app will be live at www.shotonme.com! 🚀**

