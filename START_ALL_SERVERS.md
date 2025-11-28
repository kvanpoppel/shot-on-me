# 🚀 Start All Servers - Correct Ports

## Port Configuration
- **Backend**: Port 5000
- **Venue Portal**: Port 3000
- **Shot On Me App**: Port 3001

## Step 1: Stop All Running Servers

**Run this in PowerShell to stop everything:**
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Or stop individually:**
```powershell
# Stop process on port 5000 (Backend)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue

# Stop process on port 3000 (Venue Portal)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue

# Stop process on port 3001 (Shot On Me)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
```

## Step 2: Start Servers in Order

### Terminal 1: Backend (Port 5000)
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
npm start
```
**Wait for:** `🚀 Server running on http://localhost:5000`

### Terminal 2: Venue Portal (Port 3000)
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\venue-portal
npm run dev
```
**Wait for:** `✓ Ready in X.Xs` and `Local: http://localhost:3000`

### Terminal 3: Shot On Me App (Port 3001)
```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
npm start
```
**Wait for:** `✓ Ready in X.Xs` and `Local: http://localhost:3001`

## Step 3: Access the Applications

### On Your Computer:
- **Backend API**: http://localhost:5000/api/health
- **Venue Portal**: http://localhost:3000
- **Shot On Me App**: http://localhost:3001

### On Your Phone (Same Wi-Fi):
- **Venue Portal**: http://192.168.4.24:3000
- **Shot On Me App**: http://192.168.4.24:3001

## Quick Restart Script

Save this as `restart-all.ps1` in the project root:

```powershell
# Stop all Node processes
Write-Host "Stopping all servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "`n✅ All servers stopped. Start them in separate terminals:`n" -ForegroundColor Green

Write-Host "Terminal 1 - Backend:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npm start`n" -ForegroundColor White

Write-Host "Terminal 2 - Venue Portal:" -ForegroundColor Cyan
Write-Host "  cd venue-portal" -ForegroundColor White
Write-Host "  npm run dev`n" -ForegroundColor White

Write-Host "Terminal 3 - Shot On Me:" -ForegroundColor Cyan
Write-Host "  cd shot-on-me" -ForegroundColor White
Write-Host "  npm start`n" -ForegroundColor White
```

Run it with: `.\restart-all.ps1`

