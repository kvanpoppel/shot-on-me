# 🔧 Add DNS Record to GoDaddy - Exact Steps

**Use this exact DNS record from Vercel:**

---

## ✅ EXACT DNS RECORD FROM VERCEL

**CNAME Record:**
```
Type: CNAME
Name: www
Value: dbf92fccd7805ef4.vercel-dns-017.com.
```

**Copy this value:** `dbf92fccd7805ef4.vercel-dns-017.com.`

---

## 📋 STEP-BY-STEP: Add to GoDaddy

### Step 1: Go to GoDaddy DNS Management

1. **Log in to GoDaddy**
2. **Go to:** My Products → Domains
3. **Click on:** `shotonme.com`
4. **Click:** **"DNS"** tab (or "Manage DNS")

### Step 2: Check Existing Records

**Look for existing `www` records:**
- If there's a CNAME for `www` → **DELETE it first**
- If there's an A record for `www` → **DELETE it first**
- We need to add the NEW CNAME from Vercel

### Step 3: Add New CNAME Record

1. **Click:** **"Add"** or **"+"** button
2. **Select:** **"CNAME"** from dropdown
3. **Fill in:**
   - **Name:** `www`
   - **Value:** `dbf92fccd7805ef4.vercel-dns-017.com.`
     - ⚠️ **Important:** Include the trailing dot (`.`) at the end!
   - **TTL:** 600 (or default/1 hour)
4. **Click:** **"Save"** or **"Add Record"**

### Step 4: Verify Record Added

**You should see:**
```
Type: CNAME
Name: www
Value: dbf92fccd7805ef4.vercel-dns-017.com.
TTL: 600
```

---

## 📋 STEP 5: Add Root Domain Redirect (Optional)

**To redirect `shotonme.com` → `www.shotonme.com`:**

1. **Click:** **"Add"** or **"+"** button
2. **Select:** **"A"** from dropdown
3. **Fill in:**
   - **Name:** `@` (or leave blank for root domain)
   - **Value:** `76.76.21.21` (Vercel redirect IP)
   - **TTL:** 600
4. **Click:** **"Save"**

**This will redirect `shotonme.com` to `www.shotonme.com`**

---

## ⚠️ IMPORTANT NOTES

### 1. Domain Name Check
**I notice the screenshot shows `www.shotoneme.com` - is this a typo?**
- If your domain is `shotonme.com` (no 'e'), make sure you're adding the record for the correct domain
- If it's actually `shotoneme.com`, use that domain in GoDaddy

### 2. Trailing Dot
**The DNS value has a trailing dot:**
- ✅ Correct: `dbf92fccd7805ef4.vercel-dns-017.com.` (with dot)
- ❌ Wrong: `dbf92fccd7805ef4.vercel-dns-017.com` (without dot)

**Some DNS providers add the dot automatically, some don't. Try with the dot first.**

### 3. Delete Conflicting Records
**Before adding the new CNAME:**
- Delete any existing `www` CNAME records
- Delete any existing `www` A records
- Keep only the new Vercel CNAME

---

## 📋 STEP 6: Wait and Verify

### Timeline:
- **Initial:** 5-15 minutes (sometimes works immediately)
- **Full propagation:** 24-48 hours

### Check Status in Vercel:

1. **Go back to Vercel Dashboard**
2. **Settings → Domains**
3. **Look at `www.shotonme.com`:**
   - 🟡 **Yellow/Red** = Still waiting for DNS
   - 🟢 **Green** = DNS configured correctly ✅

4. **Click "Refresh"** button in Vercel to check status

---

## ✅ VERIFICATION CHECKLIST

**After adding DNS record:**

- [ ] CNAME record added in GoDaddy
- [ ] Name: `www`
- [ ] Value: `dbf92fccd7805ef4.vercel-dns-017.com.` (with trailing dot)
- [ ] Conflicting records deleted
- [ ] Record saved in GoDaddy
- [ ] Wait 5-15 minutes
- [ ] Check Vercel dashboard - status should change
- [ ] Test: `https://www.shotonme.com` should load

---

## 🆘 IF IT STILL SHOWS "Invalid Configuration"

### Troubleshooting:

1. **Double-check the value:**
   - Make sure it's exactly: `dbf92fccd7805ef4.vercel-dns-017.com.`
   - Check for typos
   - Try with and without trailing dot

2. **Check for conflicts:**
   - Make sure no other `www` records exist
   - Delete any old records first

3. **Wait longer:**
   - DNS can take 24-48 hours to fully propagate
   - Click "Refresh" in Vercel after waiting

4. **Verify in GoDaddy:**
   - Go back to GoDaddy DNS
   - Make sure the record is actually saved
   - Check it shows the correct value

---

## 🎯 QUICK REFERENCE

**What to add in GoDaddy:**

```
Type: CNAME
Name: www
Value: dbf92fccd7805ef4.vercel-dns-017.com.
TTL: 600
```

**After DNS propagates:**
- `https://www.shotonme.com` → Your app ✅
- Vercel dashboard will show green status ✅

---

**Add this exact record in GoDaddy, wait 5-15 minutes, then check Vercel!** 🚀

