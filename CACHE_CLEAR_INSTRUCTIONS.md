# 🔄 How to Clear Cache on Mobile Device

## 🚨 Problem: Not Seeing Updates
If you don't see the latest changes (back buttons, feed enhancements, dropdowns), your device is showing cached content from the PWA service worker.

---

## ✅ **Quick Fix: Clear Cache**

### **iPhone (Safari):**

**Method 1: Clear Website Data**
1. Open **Settings** → **Safari**
2. Scroll to **Advanced**
3. Tap **Website Data**
4. Search for "shotonme.com"
5. Tap **Remove All Website Data** (or just shotonme.com)
6. Go back to Safari and reload www.shotonme.com

**Method 2: If Installed as PWA**
1. Long-press the app icon on home screen
2. Tap **Remove App** (delete)
3. Open Safari
4. Go to www.shotonme.com
5. Tap Share button → **Add to Home Screen**
6. Re-add the app

**Method 3: Hard Refresh**
1. Open Safari
2. Go to www.shotonme.com
3. Tap and **hold the refresh button** (circular arrow)
4. Select **"Reload Without Content Blockers"**

---

### **Android (Chrome):**

**Method 1: Clear Site Data**
1. Open Chrome
2. Go to www.shotonme.com
3. Tap **3 dots menu** (⋮) → **Settings**
4. Tap **Site settings**
5. Find "shotonme.com" or "www.shotonme.com"
6. Tap **Clear & Reset**
7. Go back and reload the page

**Method 2: Clear Service Worker**
1. Open Chrome
2. Go to www.shotonme.com
3. Tap **3 dots menu** (⋮) → **More tools** → **Developer tools**
4. Tap **Application** tab (top)
5. Tap **Service Workers** (left sidebar)
6. Find "shotonme.com" service worker
7. Tap **Unregister**
8. Go back and reload the page

**Method 3: If Installed as PWA**
1. Go to **Settings** → **Apps**
2. Find "Shot On Me" or the PWA
3. Tap **Uninstall** or **Remove**
4. Open Chrome
5. Go to www.shotonme.com
6. Tap **3 dots menu** (⋮) → **Add to Home screen**
7. Re-add the app

**Method 4: Hard Refresh**
1. Open Chrome
2. Go to www.shotonme.com
3. Tap **3 dots menu** (⋮) → **Reload**
4. Or: Tap and **hold refresh button** → **Hard Reload**

---

## 🚀 **Alternative: Force Fresh Load**

### **Add Version Parameter:**
Visit: `www.shotonme.com?v=2` (adds cache-busting query parameter)

### **Use Private/Incognito Mode:**
- Opens without cache
- Good for testing

---

## ✅ **Verify Updates Are Live:**

After clearing cache, you should see:
- ✅ **Back buttons** on profile pages, venue pages, modals
- ✅ **Feed filters** (Following, Trending, Nearby, For You, Discover tabs)
- ✅ **Dropdown menu** (⋮) on posts for Share/Save/Delete/Report
- ✅ **Enhanced comment like buttons** (rounded, highlighted when active)
- ✅ **Hover menus** on comment Reply buttons

---

## 🔧 **If Still Not Working:**

1. **Check Vercel Deployment:**
   - Go to https://vercel.com/dashboard
   - Check if deployment is complete
   - Status should be "Ready" (green)

2. **Wait 2-5 Minutes:**
   - Vercel deployments take time
   - Check the commit timestamp in git log

3. **Try Different Device:**
   - Test on desktop browser first
   - Then try mobile

4. **Check Browser Console:**
   - Open Developer Tools
   - Look for errors
   - Check Network tab for failed requests

---

**The app now auto-updates service workers, but you may need to clear cache once for the first update.**

