# 📱 How to Reset/Clear Cache on Mobile Device

## 🚨 Problem: Not Seeing Updates
If you don't see the latest changes (back buttons, feed enhancements), your device is likely showing cached content.

---

## ✅ **Solution: Clear Cache & Service Worker**

### **For iPhone (Safari):**

1. **Clear Website Data:**
   - Open **Settings** → **Safari**
   - Scroll down to **Advanced**
   - Tap **Website Data**
   - Search for "shotonme.com" or "www.shotonme.com"
   - Tap **Remove All Website Data** (or just remove shotonme.com)
   - Confirm

2. **If Installed as PWA:**
   - Long-press the app icon
   - Tap **Remove App** (or delete)
   - Re-add to home screen from Safari

3. **Hard Refresh:**
   - Open Safari
   - Go to www.shotonme.com
   - Tap and hold the refresh button
   - Select **"Reload Without Content Blockers"**

---

### **For Android (Chrome):**

1. **Clear Site Data:**
   - Open Chrome
   - Go to www.shotonme.com
   - Tap the **3 dots menu** (⋮) → **Settings**
   - Tap **Site settings**
   - Find "shotonme.com" or "www.shotonme.com"
   - Tap **Clear & Reset**

2. **Clear Service Worker:**
   - Open Chrome
   - Go to www.shotonme.com
   - Tap **3 dots menu** (⋮) → **More tools** → **Developer tools**
   - Tap **Application** tab
   - Tap **Service Workers** (left sidebar)
   - Find "shotonme.com" service worker
   - Tap **Unregister**
   - Refresh the page

3. **If Installed as PWA:**
   - Go to **Settings** → **Apps**
   - Find "Shot On Me" or the PWA
   - Tap **Uninstall** or **Remove**
   - Re-add to home screen from Chrome

4. **Hard Refresh:**
   - Open Chrome
   - Go to www.shotonme.com
   - Tap **3 dots menu** (⋮) → **Reload**
   - Or: Tap and hold refresh button → **Hard Reload**

---

### **Quick Method (All Devices):**

1. **Add Version Parameter:**
   - Visit: `www.shotonme.com?v=2` (adds cache-busting)
   - This forces a fresh load

2. **Private/Incognito Mode:**
   - Open in private/incognito mode
   - This bypasses cache

3. **Uninstall & Reinstall PWA:**
   - Remove from home screen
   - Clear browser cache
   - Re-add to home screen

---

## 🔧 **Developer: Force Cache Update**

I'll add a version number to the app that auto-updates, forcing cache refresh.

---

## ✅ **Verify Updates Are Live:**

After clearing cache, you should see:
- ✅ Back buttons on profile pages, venue pages, modals
- ✅ Feed filters (Following, Trending, Nearby, For You, Discover)
- ✅ Dropdown menu (⋮) on posts for Share/Save/Delete/Report
- ✅ Enhanced comment like buttons (rounded, highlighted when active)
- ✅ Hover menus on comment Reply buttons

---

**If still not working:** The Vercel deployment might still be building. Check Vercel dashboard for deployment status.

