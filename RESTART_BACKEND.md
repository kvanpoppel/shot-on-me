# How to Restart the Backend Server

## Quick Restart (Easiest Method)

### Option 1: Use the PowerShell Script
```powershell
# From the project root directory
.\start-all.ps1
```

This will restart all 4 servers (backend, venue-portal, shot-on-me, owner-portal) in separate windows.

### Option 2: Restart Just the Backend

1. **Find the Backend Terminal Window**
   - Look for a PowerShell/Command Prompt window that says "Backend Server" or shows backend logs
   - It should be running `npm run dev` or `nodemon server.js`

2. **Stop the Backend**
   - In that window, press `Ctrl + C` to stop the server
   - Wait for it to stop (you'll see "Terminated" or similar)

3. **Start the Backend Again**
   - In the same window, type:
   ```powershell
   cd backend
   npm run dev
   ```
   - Or if you're already in the backend directory:
   ```powershell
   npm run dev
   ```

4. **Look for Success Messages**
   - You should see:
     ```
     ✅ Connected to MongoDB
     🚀 Server running on port 5000
     ```

## If You Can't Find the Backend Window

### Method 1: Kill and Restart
```powershell
# Kill the backend process
taskkill /PID 13344 /F

# Then restart it
cd backend
npm run dev
```

### Method 2: Restart All Services
```powershell
# From project root
.\start-all.ps1
```

## Check if Backend is Running

```powershell
# Check if port 5000 is in use
netstat -ano | findstr ":5000"

# Test if backend responds
curl http://localhost:5000/api/health
```

## Common Issues

### "Port 5000 already in use"
- The backend is already running
- Find the window and restart it, or kill the process:
  ```powershell
  taskkill /PID <PID_NUMBER> /F
  ```

### "Cannot find module"
- You need to install dependencies:
  ```powershell
  cd backend
  npm install
  ```

### "MongoDB connection failed"
- Check your `backend/.env` file has the correct `MONGODB_URI`
- Make sure MongoDB Atlas is accessible (check IP whitelist)

## Quick Reference

**Backend Location:** `backend/` folder  
**Start Command:** `npm run dev` (from backend folder)  
**Port:** 5000  
**Health Check:** http://localhost:5000/api/health

