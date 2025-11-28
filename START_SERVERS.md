# 🚀 Quick Start Guide - All Servers

## Start Everything for Mobile Access

### Terminal 1: Backend Server
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm start
```
**Wait for:** `🚀 Server running on http://localhost:5000`

### Terminal 2: Shot On Me App
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm start
```
**Wait for:** `✓ Ready in X.Xs`

### Terminal 3: Venue Portal (Optional)
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\venue-portal
npm run dev
```

## 📱 Access on Your Phone

**Your IP:** `192.168.4.24`

1. **Shot On Me App:** `http://192.168.4.24:3001`
2. **Venue Portal:** `http://192.168.4.24:3000`

## ✅ What's Fixed

- ✅ App automatically detects IP address when accessed from phone
- ✅ Backend connection works from mobile devices
- ✅ No configuration needed - just start both servers!

## ⚠️ Important

**BOTH servers must be running:**
- Backend (port 5000) - Required for login and data
- Frontend (port 3001) - The app itself

If you see "backend not running" error, start the backend server!

