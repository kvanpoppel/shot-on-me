# 🔧 Render FRONTEND_URL Setting

**What to set in Render:**

---

## ✅ PRIMARY SETTING (Your Goal)

**FRONTEND_URL should be:**

```
https://www.shotonme.com
```

**This is your primary domain that you want users to access.**

---

## ⚠️ WHEN TO SET IT

### Option 1: Set Now (Recommended)

**Set it to `https://www.shotonme.com` even if DNS isn't fully propagated yet:**
- ✅ This is your target URL
- ✅ Once DNS propagates, it will work
- ✅ Render will use it for CORS and redirects
- ✅ No need to change it later

### Option 2: Set After DNS Works

**If you want to be cautious:**
1. Wait until `https://www.shotonme.com` loads in browser
2. Then update Render `FRONTEND_URL` to: `https://www.shotonme.com`

---

## 📋 HOW TO UPDATE IN RENDER

### Step-by-Step:

1. **Render Dashboard** → Your service `shot-on-me`
2. **Click:** **"Environment"** tab (left sidebar, under MANAGE)
3. **Find:** `FRONTEND_URL` variable
4. **Click:** **Edit** (or delete and recreate)
5. **Set value to:** `https://www.shotonme.com`
6. **Click:** **Save**
7. **Service will auto-redeploy** (5-10 minutes)

---

## 🎯 CURRENT vs TARGET

### Current (if still set):
```
https://shot-on-me.vercel.app
```
- ✅ Works now
- ⚠️ Not your primary domain

### Target (what you want):
```
https://www.shotonme.com
```
- ✅ Your primary domain
- ✅ Will work once DNS propagates
- ✅ This is what users will access

---

## ✅ RECOMMENDED ACTION

**Set it now to:**
```
https://www.shotonme.com
```

**Why:**
- It's your target URL
- Render will use it for CORS
- No need to change later
- Works once DNS propagates

---

## 🔍 VERIFY IT'S SET CORRECTLY

**After updating, check:**

1. **Render** → Environment tab
2. **Find:** `FRONTEND_URL`
3. **Value should be:** `https://www.shotonme.com`
4. **Service status:** Should show redeploying/updated

---

## 📋 SUMMARY

**FRONTEND_URL in Render:**
```
https://www.shotonme.com
```

**This tells Render:**
- Where your frontend is hosted
- What URL to allow for CORS
- What URL to use for redirects

**Set it to your primary domain!** 🚀

