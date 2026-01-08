# 🔄 How to Restart Your Backend Server

## **Method 1: If Backend is Running in a Terminal/PowerShell Window**

### **Step 1: Stop the Server**
1. Find the PowerShell/terminal window where the backend is running
2. Press `Ctrl + C` to stop the server
3. Wait for it to fully stop

### **Step 2: Restart the Server**
In the same terminal window, run:
```powershell
cd backend
npm start
```

Or if you're already in the backend directory:
```powershell
npm start
```

---

## **Method 2: Kill Process and Restart (If You Can't Find the Window)**

### **Step 1: Find and Kill the Process**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

### **Step 2: Start Fresh**
Open a new PowerShell window and run:
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm start
```

---

## **Method 3: Quick Restart Script**

Create a file `restart-backend.ps1` in your project root:

```powershell
# Stop any process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "Stopped backend process"
}

# Wait a moment
Start-Sleep -Seconds 2

# Start backend
Set-Location backend
npm start
```

Then run:
```powershell
.\restart-backend.ps1
```

---

## **What to Look For After Restart**

After restarting, you should see:
```
✅ Server running on port 5000
✅ MongoDB connected
✅ Twilio initialized successfully (if credentials are set)
```

---

## **Troubleshooting**

### **Port Already in Use:**
```powershell
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### **Can't Find the Terminal:**
- Check all open PowerShell/CMD windows
- Look for one showing "Server running on port 5000"
- Or just kill the process and start fresh (Method 2)

### **Environment Variables Not Loading:**
- Make sure you're in the `backend` directory
- Check that `.env` file exists in `backend/` folder
- Restart after adding Twilio credentials

---

## **Quick Commands Reference**

```powershell
# Navigate to backend
cd backend

# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Stop server
Ctrl + C
```

