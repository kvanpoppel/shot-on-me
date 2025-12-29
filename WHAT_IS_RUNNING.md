# 🔍 What's Currently Running

## ✅ Running Services

Based on system check:

### Node.js Processes
- **3 Node.js processes** are running (started around 5:14 PM)
- These are likely your development servers

### Production (Deployed - Always Running)
- ✅ **Frontend**: `https://www.shotonme.com` (Vercel)
- ✅ **Backend**: `https://shot-on-me.onrender.com` (Render)

---

## 🔍 Check What's Running Locally

### Option 1: Check Ports
Run this to see what ports are in use:
```powershell
netstat -ano | findstr "LISTENING" | findstr ":5000 :3001 :3000 :3002"
```

### Option 2: Check Node Processes
```powershell
Get-Process node
```

### Option 3: Test URLs
Try opening these in your browser:
- `http://localhost:5000/api/health` - Backend API
- `http://localhost:3001` - Shot On Me App
- `http://localhost:3000` - Venue Portal
- `http://localhost:3002` - Owner Portal

---

## 📍 Expected Services

### If Running Locally:
1. **Backend** → `http://localhost:5000`
2. **Shot On Me App** → `http://localhost:3001`
3. **Venue Portal** → `http://localhost:3000` (optional)
4. **Owner Portal** → `http://localhost:3002` (optional)

### Production (Always Available):
1. **Frontend** → `https://www.shotonme.com`
2. **Backend API** → `https://shot-on-me.onrender.com` (or `https://api.shotonme.com` if configured)

---

## 🎯 Quick Answer

**Right now, you have:**
- ✅ **3 Node.js processes running** (likely your local dev servers)
- ✅ **Production frontend** at `www.shotonme.com` (Vercel)
- ✅ **Production backend** at `shot-on-me.onrender.com` (Render)

**To use the app:**
- **Production**: Go to `https://www.shotonme.com` on your phone
- **Local Dev**: Go to `http://localhost:3001` on your computer

---

## 🚀 Start Everything Locally

If you want to start all local services:
```powershell
.\start-all.ps1
```

This will start:
- Backend (port 5000)
- Shot On Me App (port 3001)
- Venue Portal (port 3000)
- Owner Portal (port 3002)

