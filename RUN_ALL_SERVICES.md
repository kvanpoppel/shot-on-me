# 🚀 Complete Guide: Running All Services

## Prerequisites
- Node.js 18+ installed
- Backend dependencies installed ✅ (already done)
- Backend .env file created ✅ (already done)

---

## Step-by-Step Instructions

### **STEP 1: Start the Backend API** (Port 5000)

**Open a PowerShell/Terminal window:**

```powershell
# Navigate to backend directory
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend

# Start the backend server
npm run dev
```

**Expected Output:**
```
🔄 Connecting to MongoDB...
✅ Connected to MongoDB
📊 Database: shotonme
🌐 Host: cluster0-shard-00-00.uoylpxu.mongodb.net
🚀 Server running on http://localhost:5000
```

**✅ Backend is running when you see:**
- "Server running on http://localhost:5000"
- "MongoDB connected"

**Keep this window open!**

---

### **STEP 2: Start Venue Portal** (Port 3000)

**Open a NEW PowerShell/Terminal window:**

```powershell
# Navigate to venue-portal directory
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\venue-portal

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

**✅ Venue Portal is running when you see:**
- "ready started server on 0.0.0.0:3000"

**Keep this window open!**

---

### **STEP 3: Start Shot On Me App** (Port 3001)

**Open a NEW PowerShell/Terminal window:**

```powershell
# Navigate to shot-on-me directory
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me

# Install dependencies (if not already installed)
npm install

# Start the development server
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.0.4
- Local:        http://localhost:3001
- ready started server on 0.0.0.0:3001
```

**✅ Shot On Me App is running when you see:**
- "ready started server on 0.0.0.0:3001"

**Keep this window open!**

---

## 🎯 Quick Access URLs

Once all services are running, access them at:

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:5000 | API server (health check: http://localhost:5000/health) |
| **Venue Portal** | http://localhost:3000 | Web portal for venue owners |
| **Shot On Me App** | http://localhost:3001 | Mobile app for users |

---

## 🚀 Quick Start (All at Once)

If you want to start everything in separate windows automatically:

```powershell
# From the project root directory
.\start-all.ps1
```

This will open 3 separate PowerShell windows, one for each service.

---

## ✅ Verification Checklist

After starting all services, verify they're running:

1. **Backend Health Check:**
   - Open browser: http://localhost:5000/health
   - Should show: `{"status":"ok","mongodb":"connected"}`

2. **Venue Portal:**
   - Open browser: http://localhost:3000
   - Should show the login page

3. **Shot On Me App:**
   - Open browser: http://localhost:3001
   - Should show the login/landing page

---

## 🛑 Stopping Services

To stop a service:
- Go to its terminal window
- Press `Ctrl + C`
- Confirm with `Y` if prompted

To stop all Node processes:
```powershell
Get-Process node | Stop-Process -Force
```

---

## 📝 Notes

- **Backend must be running first** before starting frontend apps
- Each service runs in its own terminal window
- Changes to code will auto-reload (hot reload enabled)
- Backend uses MongoDB Atlas (cloud database) - no local MongoDB needed
- All services use environment variables from `.env` or `.env.local` files

---

## 🔧 Troubleshooting

**Port already in use?**
```powershell
# Find what's using the port
netstat -ano | findstr :5000
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Dependencies not installed?**
```powershell
# Backend
cd backend
npm install

# Venue Portal
cd venue-portal
npm install

# Shot On Me
cd shot-on-me
npm install
```

**Backend not connecting to MongoDB?**
- Check `backend/.env` file exists
- Verify `MONGODB_URI` is correct
- Make sure your IP is whitelisted in MongoDB Atlas

---

## 📱 Mobile Access (Optional)

To access from your phone on the same network:

1. Find your computer's IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. Access from phone:
   - Shot On Me: `http://192.168.1.100:3001`
   - Venue Portal: `http://192.168.1.100:3000`

Make sure your firewall allows connections on these ports.

