# How to Clear Browser Cache

## Chrome/Edge (Chromium-based)

### Method 1: Hard Refresh (Quick)
- **Windows/Linux:** Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** Press `Cmd + Shift + R`

### Method 2: Clear Cache via DevTools
1. Open DevTools: Press `F12` or `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)
2. Right-click the refresh button (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

### Method 3: Clear All Site Data
1. Press `F12` to open DevTools
2. Go to **Application** tab (or **Storage** in older versions)
3. Click **"Clear site data"** button
4. Check all boxes
5. Click **"Clear site data"**

### Method 4: Clear via Settings (Full Clear)
1. Press `Ctrl + Shift + Delete` (Windows) / `Cmd + Shift + Delete` (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear data"**

## Firefox

### Method 1: Hard Refresh
- **Windows/Linux:** Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** Press `Cmd + Shift + R`

### Method 2: Clear Cache via DevTools
1. Open DevTools: Press `F12` or `Ctrl + Shift + I`
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Refresh the page

### Method 3: Clear via Settings
1. Press `Ctrl + Shift + Delete` (Windows) / `Cmd + Shift + Delete` (Mac)
2. Select **"Cache"**
3. Time range: **"Everything"**
4. Click **"Clear Now"**

## Safari

### Method 1: Hard Refresh
- Press `Cmd + Option + R`

### Method 2: Clear Cache
1. Go to **Safari** menu → **Preferences** → **Advanced**
2. Check **"Show Develop menu in menu bar"**
3. Go to **Develop** menu → **Empty Caches**

## Recommended Steps for Development

1. **Open DevTools** (`F12`)
2. **Go to Network tab**
3. **Check "Disable cache"** (while DevTools is open)
4. **Keep DevTools open** while testing
5. **Hard refresh** the page (`Ctrl + Shift + R`)

This ensures you always get fresh files during development!



