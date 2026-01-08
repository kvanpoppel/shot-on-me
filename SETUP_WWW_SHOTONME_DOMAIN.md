# 🌐 Setup www.shotonme.com as Primary Domain

**Complete guide to make www.shotonme.com your only access point**

---

## 📋 STEP 1: Get DNS Records from Vercel

### In Vercel Dashboard:

1. **Go to:** Vercel Dashboard → Your project → **Settings** → **Domains**
2. **Click "Edit"** on `www.shotonme.com`
3. **Vercel will show you DNS records:**
   - CNAME record for `www`
   - A records for root domain (if needed)

**Copy these records - you'll need them for GoDaddy!**

---

## 📋 STEP 2: Configure DNS at GoDaddy

### Go to GoDaddy DNS Management:

1. **Log in to GoDaddy**
2. **Go to:** My Products → Domains → `shotonme.com` → **DNS**
3. **Find existing DNS records** (you may need to delete/modify some)

### Add/Update Records:

#### For `www.shotonme.com` (CNAME):

**Add CNAME record:**
- **Type:** CNAME
- **Name:** `www`
- **Value:** `cname.vercel-dns.com` (or what Vercel shows)
- **TTL:** 600 (or default)

**OR if Vercel shows a different value, use that!**

#### For Root Domain `shotonme.com` (A Records):

**Vercel will show you IP addresses. Add A records:**

**Option A: Use Vercel's IP addresses (recommended)**
- **Type:** A
- **Name:** `@` (or blank/root)
- **Value:** [First IP from Vercel]
- **TTL:** 600

- **Type:** A
- **Name:** `@` (or blank/root)
- **Value:** [Second IP from Vercel]
- **TTL:** 600

(Add all IPs Vercel provides - usually 2-4)

**Option B: Redirect root to www (simpler)**
- **Type:** A
- **Name:** `@`
- **Value:** `76.76.21.21` (Vercel's redirect IP)
- **TTL:** 600

---

## 📋 STEP 3: Remove/Update Conflicting Records

### Check for Existing Records:

**Look for these and DELETE or UPDATE them:**

1. **Any A records pointing to Render:**
   - If you see A records with Render IPs → DELETE them
   - Or update to point to Vercel

2. **Any CNAME records conflicting:**
   - If `www` has a CNAME pointing elsewhere → DELETE it
   - Add the Vercel CNAME instead

3. **Any other conflicting records:**
   - Check for duplicates
   - Keep only the Vercel records

---

## 📋 STEP 4: Configure Redirect in Vercel

### Set up Root Domain Redirect:

1. **Vercel Dashboard** → Your project → **Settings** → **Domains**
2. **For `shotonme.com` (root domain):**
   - Click **"Edit"**
   - Enable **"Redirect to www"** or similar option
   - This will redirect `shotonme.com` → `www.shotonme.com`

**OR add redirect in Vercel:**

1. **Settings** → **Redirects**
2. **Add redirect:**
   - **Source:** `shotonme.com`
   - **Destination:** `https://www.shotonme.com`
   - **Permanent:** Yes (301)

---

## 📋 STEP 5: Update Render FRONTEND_URL

### After DNS is configured:

1. **Render Dashboard** → Your service → **Environment** tab
2. **Find `FRONTEND_URL`**
3. **Update to:** `https://www.shotonme.com`
4. **Save** (service will auto-redeploy)

---

## 📋 STEP 6: Wait for DNS Propagation

### Timeline:

- **Initial:** 5-15 minutes (sometimes works immediately)
- **Full propagation:** 24-48 hours
- **Check status:** Vercel dashboard will show when DNS is valid

### How to Check:

1. **Vercel Dashboard** → **Domains**
2. **Look at `www.shotonme.com`:**
   - 🟡 **Yellow badge** = DNS not configured yet (wait)
   - 🟢 **Green badge** = DNS configured correctly ✅

---

## 📋 STEP 7: Verify Everything Works

### Test These URLs:

1. **Primary domain (should work):**
   ```
   https://www.shotonme.com
   ```
   - Should load your app ✅

2. **Root domain (should redirect):**
   ```
   https://shotonme.com
   ```
   - Should redirect to `www.shotonme.com` ✅

3. **Backend API (should still work):**
   ```
   https://shot-on-me.onrender.com/api
   ```
   - Should return API info ✅

---

## 🎯 QUICK REFERENCE: DNS Records

### What to Add in GoDaddy:

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600
```

**A Records (for root domain redirect):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600
```

**OR use Vercel's specific IPs (check Vercel dashboard for exact values)**

---

## ⚠️ COMMON ISSUES

### Issue 1: DNS Still Shows "Not Configured"

**Solution:**
- Wait 24-48 hours for full propagation
- Double-check DNS records in GoDaddy
- Make sure you deleted conflicting records

### Issue 2: Domain Shows Render Error

**Solution:**
- Delete any A records pointing to Render
- Make sure CNAME for `www` points to Vercel
- Clear browser cache and try again

### Issue 3: Root Domain Doesn't Redirect

**Solution:**
- Add redirect in Vercel (Settings → Redirects)
- Or add A record pointing to Vercel's redirect IP: `76.76.21.21`

---

## ✅ FINAL CHECKLIST

**DNS Configuration:**
- [ ] CNAME record for `www` added in GoDaddy
- [ ] A records for root domain added (or redirect configured)
- [ ] Conflicting records removed
- [ ] DNS records saved in GoDaddy

**Vercel Configuration:**
- [ ] `www.shotonme.com` added in Vercel
- [ ] `shotonme.com` added in Vercel (for redirect)
- [ ] Redirect configured (root → www)
- [ ] DNS status shows green (after propagation)

**Render Configuration:**
- [ ] `FRONTEND_URL` updated to `https://www.shotonme.com`
- [ ] Service redeployed

**Testing:**
- [ ] `https://www.shotonme.com` loads app
- [ ] `https://shotonme.com` redirects to www
- [ ] No 404 errors

---

## 🎉 SUMMARY

**To make `www.shotonme.com` your only access point:**

1. ✅ Get DNS records from Vercel
2. ✅ Add CNAME for `www` in GoDaddy
3. ✅ Add A records for root domain (or redirect)
4. ✅ Configure redirect in Vercel (root → www)
5. ✅ Update Render `FRONTEND_URL`
6. ✅ Wait for DNS propagation (24-48 hours)
7. ✅ Test both URLs

**After DNS propagates, `www.shotonme.com` will be your primary domain!** 🚀

---

**Note:** Until DNS propagates, continue using `https://shot-on-me.vercel.app` for testing.

