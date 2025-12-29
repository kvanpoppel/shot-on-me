# 🔧 Fix: www.shotonme.com Connection Error

## ❌ The Problem

You're seeing `ERR_CONNECTION_TIMED_OUT` because:

1. **Using HTTPS instead of HTTP** - Your URL shows `https://www.shotonme.com:3001`
2. **Local development uses HTTP** - The app runs on `http://` not `https://`

## ✅ The Solution

### Step 1: Use HTTP (Not HTTPS)

**Change this:**
```
https://www.shotonme.com:3001  ❌
```

**To this:**
```
http://www.shotonme.com:3001  ✅
```

### Step 2: Make Sure Servers Are Running

**Backend (Port 5000):**
- Open PowerShell in `backend` folder
- Run: `npm run dev`
- Should show: `🚀 Server running on 0.0.0.0:5000`

**Frontend (Port 3001):**
- Open PowerShell in `shot-on-me` folder  
- Run: `npm run dev`
- Should show: `✓ Ready` and `Local: http://0.0.0.0:3001`

### Step 3: Check Hosts File

Make sure your hosts file has:
```
127.0.0.1    www.shotonme.com    shotonme.com
```

To check/edit:
1. Open Notepad as Administrator
2. Open: `C:\Windows\System32\drivers\etc\hosts`
3. Look for the entry above
4. If missing, add it and save

## 🎯 Correct URLs

**Desktop:**
- ✅ `http://www.shotonme.com:3001`
- ✅ `http://localhost:3001`

**Mobile:**
- ✅ `http://10.100.160.100:3001` (direct IP)
- ✅ `http://www.shotonme.com:3001` (if DNS override is set up)

## ⚠️ Important

- **Always use `http://`** for local development (not `https://`)
- **Always include `:3001`** port number
- **HTTPS only works** when you deploy to production with SSL certificate

## 🚀 Quick Fix

1. Make sure both servers are running
2. In browser address bar, type: `http://www.shotonme.com:3001`
3. Press Enter

That should work! 🎉

