# 🔄 Keep All Services Running at All Times

## ✅ Solution Created

I've created scripts to ensure all services stay running:

### 1. **start-all-always.ps1** - Start Everything + Monitor
This starts all services AND keeps them running:
```powershell
.\start-all-always.ps1
```

### 2. **keep-all-running.ps1** - Monitor & Auto-Restart
This monitors all services and restarts any that stop:
```powershell
.\keep-all-running.ps1
```

---

## 🚀 Quick Start (Run This Now)

```powershell
.\start-all-always.ps1
```

This will:
1. ✅ Start Backend (port 5000)
2. ✅ Start Shot On Me App (port 3001)
3. ✅ Start Venue Portal (port 3000)
4. ✅ Start Owner Portal (port 3002)
5. ✅ Start monitor to keep them running

---

## 📍 All Services URLs

Once running:
- **Backend API**: http://localhost:5000/api
- **Shot On Me App**: http://localhost:3001
- **Venue Portal**: http://localhost:3000
- **Owner Portal**: http://localhost:3002

---

## 🔄 How It Works

The monitor checks every 30 seconds:
- If a service stops → Automatically restarts it
- If a port is free → Starts the service
- Keeps running until you close the PowerShell window

---

## 💡 To Keep Running After Restart

If you want services to start automatically when Windows starts:

1. Create a scheduled task
2. Or add to Windows Startup folder
3. Or use the monitor script in a service

---

## ✅ Status Check

To verify all services are running:
```powershell
netstat -ano | findstr "LISTENING" | findstr ":5000 :3001 :3000 :3002"
```

You should see all 4 ports listed!

